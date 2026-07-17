/**
 * One-off: republish a project so ensureMobileFriendlyHtml strips scroll traps.
 * Usage: node scripts/republish-project.js <project-id>
 */
const path = require("path");
const fs = require("fs");

// Load worker/.env without printing secrets
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

process.env.VERCEL = "1"; // prevent listen when requiring server

const { createClient } = require("@supabase/supabase-js");

// Pull deploy helper by evaluating a thin wrapper — server doesn't export it,
// so we re-implement the publish path via an internal require patch.
const Module = require("module");
const originalExport = Module.prototype.require;

async function main() {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error("Usage: node scripts/republish-project.js <project-id>");
    process.exit(1);
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: project, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
  if (error || !project) {
    console.error("Project load failed:", error?.message || "not found");
    process.exit(1);
  }

  console.log("Loaded", project.business_name, project.vercel_url);
  console.log("html has overflow:hidden?", /overflow\s*:\s*hidden/i.test(project.html || ""));
  console.log("html has universal div rule?", /\bdiv\s*\{\s*overflow\s*:\s*hidden/i.test(project.html || ""));

  // Require server after env is set; grab ensureMobileFriendlyHtml by running
  // prepare through a minimal local copy + vercel deploy using duplicated logic
  // from server.js (deployProjectToVercel is not exported).
  const serverPath = path.join(__dirname, "..", "server.js");
  const src = fs.readFileSync(serverPath, "utf8");

  // Extract and eval ensureMobileFriendlyHtml by requiring via a temporary export.
  // Safer: call the live /publish isn't available without user auth.
  // Instead inline the strip + use Vercel API the same way as server.

  function ensureMobileFriendlyHtml(html) {
    let out = String(html || "");
    if (!out.trim()) return out;
    if (!/<meta[^>]+name=["']viewport["']/i.test(out)) {
      out = out.replace(
        /<head([^>]*)>/i,
        '<head$1>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
      );
    } else {
      out = out.replace(
        /<meta[^>]+name=["']viewport["'][^>]*>/i,
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
      );
    }
    out = out.replace(/\bdiv\s*\{([^{}]*)\}/gi, (full, body) => {
      if (!/overflow\s*:\s*hidden/i.test(body)) return full;
      if (/^\s*overflow\s*:\s*hidden\s*;?\s*$/i.test(body)) {
        return "/* moonrise: stripped-universal-div-overflow */";
      }
      const next = body
        .replace(/overflow\s*:\s*hidden\s*!important\s*;?/gi, "")
        .replace(/overflow\s*:\s*hidden\s*;?/gi, "");
      return "div{" + next + "}";
    });
    out = out.replace(
      /\b(html|body)\s*\{([^}]*?)overflow\s*:\s*hidden(\s*!important)?([^}]*)\}/gi,
      (full, sel, before, _imp, after) => sel + "{" + before + "overflow: visible" + after + "}"
    );
    const css = `
/* Moonrise mobile-fit — one scroll root (html), body must not trap scroll */
html{max-width:100%!important;overflow-x:hidden!important;overflow-y:scroll!important;height:auto!important;max-height:none!important;-webkit-overflow-scrolling:touch}
body{max-width:100%!important;overflow-x:hidden!important;overflow-y:visible!important;height:auto!important;max-height:none!important;min-height:100%;position:relative!important}
img,video,canvas,svg{max-width:100%;height:auto}
iframe{max-width:100%}
.nav,.dock,nav[class],header .dock,header nav{max-width:100%}
body > div, main, .page, .wrapper, .site, .layout, .site-wrap, .app, #app, #root, #__next{overflow-x:hidden!important;overflow-y:visible!important;max-height:none!important;height:auto!important}
@media (max-width:767px){
  .nav{padding:.65rem!important;left:0;right:0}
  .dock,header .dock,nav.dock{max-width:calc(100vw - 1.25rem);width:max-content;margin-left:auto;margin-right:auto;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;flex-wrap:nowrap}
  .dock::-webkit-scrollbar,header .dock::-webkit-scrollbar{display:none}
  .dock a,header .dock a{white-space:nowrap;flex:0 0 auto}
  .hero,.hero-content,section,.container{max-width:100vw;box-sizing:border-box}
  .hero,.hero-stage{min-height:min(100svh,100vh);max-height:none;overflow-x:hidden;overflow-y:visible}
  .about-badge{right:.75rem!important;bottom:.75rem!important}
  .cred-strip,.hero-btns,.cta-btns{gap:.75rem}
}
`.trim();
    const styleTag = `<style data-ms-mobile-fit="1">${css}</style>`;
    if (/<style[^>]*data-ms-mobile-fit=["']1["'][^>]*>[\s\S]*?<\/style>/i.test(out)) {
      out = out.replace(/<style[^>]*data-ms-mobile-fit=["']1["'][^>]*>[\s\S]*?<\/style>/i, styleTag);
    } else if (/<\/head>/i.test(out)) {
      out = out.replace(/<\/head>/i, `${styleTag}\n</head>`);
    } else if (/<body[^>]*>/i.test(out)) {
      out = out.replace(/<body([^>]*)>/i, `<body$1>\n${styleTag}`);
    } else {
      out = styleTag + out;
    }
    return out;
  }

  function injectWatermarkEmbed(html, proj) {
    const workerBase = process.env.WORKER_PUBLIC_URL || "https://moonrise-studio.vercel.app";
    const urgency = String(proj?.urgency_ends_at || "").trim();
    const urgencyAttr = urgency ? ` data-urgency-ends-at="${String(urgency).replace(/"/g, "")}"` : "";
    const tag =
      `\n<script src="${workerBase}/embed.js" ` +
      `data-project-id="${proj.id}" ` +
      `data-worker="${workerBase}"${urgencyAttr}></` +
      `script>\n`;
    if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${tag}</body>`);
    return html + tag;
  }

  let html = ensureMobileFriendlyHtml(project.html || "");
  if (project.watermark_enabled) html = injectWatermarkEmbed(html, project);

  console.log("after fix universal div rule?", /\bdiv\s*\{\s*overflow\s*:\s*hidden/i.test(html));
  console.log("after fix has mobile-fit?", /data-ms-mobile-fit/.test(html));

  // Also persist stripped HTML back to DB so future publishes stay clean
  const cleanedDbHtml = ensureMobileFriendlyHtml(project.html || "");
  // Strip the mobile-fit style from DB storage? Server stores clean html and injects on publish.
  // Looking at flow: project.html is clean (no watermark); ensureMobileFriendlyHtml runs on publish.
  // So we should update DB html to remove the bad rule without necessarily adding mobile-fit permanently.
  // Updating with ensureMobileFriendlyHtml is fine — republish refreshes the block anyway.
  const { error: updErr } = await supabase
    .from("projects")
    .update({ html: cleanedDbHtml, updated_at: new Date().toISOString() })
    .eq("id", project.id);
  if (updErr) {
    console.warn("DB html update warning:", updErr.message);
  } else {
    console.log("Updated project.html in DB");
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.error("Missing VERCEL_TOKEN");
    process.exit(1);
  }

  const teamId = process.env.VERCEL_TEAM_ID || "";
  const teamQ = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const slug =
    (project.business_context && project.business_context.vercelSlug) ||
    String(project.vercel_url || "")
      .replace(/^https?:\/\//, "")
      .replace(/\.vercel\.app.*$/, "")
      .trim();

  if (!slug) {
    console.error("Could not resolve vercel slug");
    process.exit(1);
  }

  console.log("Deploying to", slug);

  const deployRes = await fetch(`https://api.vercel.com/v13/deployments${teamQ}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: slug,
      project: slug,
      target: "production",
      files: [
        {
          file: "index.html",
          data: Buffer.from(html).toString("base64"),
          encoding: "base64",
        },
      ],
      projectSettings: { framework: null },
    }),
  });
  const deployData = await deployRes.json().catch(() => ({}));
  if (!deployRes.ok) {
    console.error("Deploy failed:", deployRes.status, deployData);
    process.exit(1);
  }

  const url = `https://${slug}.vercel.app`;
  await supabase
    .from("projects")
    .update({
      status: "published",
      vercel_url: url,
      vercel_deployment_id: deployData.id || deployData.uid || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", project.id);

  console.log("Deployed:", url, "id:", deployData.id || deployData.uid);
  console.log("Wait a few seconds then hard-refresh the live site.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
