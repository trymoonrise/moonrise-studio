/**
 * Ephemeral GitHub PAT helpers for Builder Upload import.
 * Tokens are never persisted — only used for the request lifetime.
 */

const GH_API = "https://api.github.com";
const GH_UA = "Moonrise-Studio-Import";
const MAX_REPOS_PAGES = 4;
const MAX_TREE_BLOBS = 250;
const MAX_PARALLEL_FETCH = 8;
const MAX_INLINE_TEXT = 700 * 1024;
const MAX_INLINE_IMAGE = 64 * 1024;
const MAX_INLINE_FONT = 40 * 1024;
const MAX_HTML = Math.floor(5.5 * 1024 * 1024);
const MAX_FETCH_BYTES = Math.floor(12 * 1024 * 1024);
const MAX_IMAGES = 24;
const MAX_HTML_PAGES = 40;
const MAX_SITE_FILES_BYTES = Math.floor(18 * 1024 * 1024);

function normalizeAssetPath(p) {
  return String(p || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
}

function guessMime(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".ico")) return "image/x-icon";
  if (lower.endsWith(".woff2")) return "font/woff2";
  if (lower.endsWith(".woff")) return "font/woff";
  if (lower.endsWith(".ttf")) return "font/ttf";
  if (lower.endsWith(".otf")) return "font/otf";
  if (lower.endsWith(".css")) return "text/css";
  if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "text/javascript";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
  return "application/octet-stream";
}

function isSiteFile(path) {
  return /\.(html?|css|js|mjs|json|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|otf|txt|md)$/i.test(path);
}

function isTextish(path) {
  return /\.(html?|css|js|mjs|json|svg|txt|md)$/i.test(path);
}

async function githubFetch(token, path, { raw = false } = {}) {
  const headers = {
    Accept: raw ? "application/vnd.github.raw" : "application/vnd.github+json",
    Authorization: "Bearer " + String(token || "").trim(),
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": GH_UA,
  };
  const res = await fetch(GH_API + path, { headers });
  const text = await res.text();
  if (!res.ok) {
    let message = "GitHub request failed (" + res.status + ")";
    try {
      const err = JSON.parse(text);
      if (err?.message) message = err.message;
    } catch (_) {
      /* keep */
    }
    if (res.status === 401) message = "Invalid or expired GitHub token.";
    if (res.status === 403) message = "GitHub access denied. Check token scopes (repo) and rate limits.";
    if (res.status === 404) message = "Repository or path not found.";
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  if (raw) return text;
  try {
    return text ? JSON.parse(text) : null;
  } catch (_) {
    return text;
  }
}

function normalizeToken(token) {
  const t = String(token || "").trim();
  if (!t || t.length < 20) {
    const err = new Error("Paste a valid GitHub personal access token.");
    err.status = 400;
    throw err;
  }
  if (t.length > 255) {
    const err = new Error("GitHub token looks invalid.");
    err.status = 400;
    throw err;
  }
  return t;
}

function parseOwnerRepo(fullName) {
  const parts = String(fullName || "")
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .split("/")
    .filter(Boolean);
  if (parts.length < 2) {
    const err = new Error("Select a repository (owner/name).");
    err.status = 400;
    throw err;
  }
  const owner = parts[0];
  const repo = parts[1];
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) {
    const err = new Error("Invalid repository name.");
    err.status = 400;
    throw err;
  }
  return { owner, repo, fullName: owner + "/" + repo };
}

async function listUserRepos(token) {
  const tok = normalizeToken(token);
  const repos = [];
  for (let page = 1; page <= MAX_REPOS_PAGES; page++) {
    const batch = await githubFetch(
      tok,
      "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member&page=" +
        page
    );
    if (!Array.isArray(batch) || !batch.length) break;
    for (const r of batch) {
      if (!r?.full_name) continue;
      repos.push({
        fullName: r.full_name,
        name: r.name,
        private: !!r.private,
        description: r.description || "",
        defaultBranch: r.default_branch || "main",
        updatedAt: r.updated_at || null,
        htmlUrl: r.html_url || "",
      });
    }
    if (batch.length < 100) break;
  }
  repos.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return repos;
}

async function fetchBlob(token, owner, repo, sha, asText) {
  const url = GH_API + "/repos/" + owner + "/" + repo + "/git/blobs/" + encodeURIComponent(sha);
  const headers = {
    // Raw works for small and >1MB blobs; JSON content is often empty/encoding "none".
    Accept: "application/vnd.github.raw",
    Authorization: "Bearer " + token,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": GH_UA,
  };
  const res = await fetch(url, { headers });
  if (!res.ok) {
    let message = "Could not download file from GitHub (" + res.status + ")";
    try {
      const err = JSON.parse(await res.text());
      if (err?.message) message = err.message;
    } catch (_) {
      /* keep */
    }
    if (res.status === 401) message = "Invalid or expired GitHub token.";
    if (res.status === 403) message = "GitHub access denied while downloading files. Check token scopes and rate limits.";
    const error = new Error(message);
    error.status = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw error;
  }

  if (asText) {
    const text = await res.text();
    const size = Buffer.byteLength(text, "utf8");
    if (size > MAX_FETCH_BYTES) {
      const err = new Error("A file in the repo is too large to import.");
      err.status = 400;
      throw err;
    }
    return { kind: "text", text, size };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_FETCH_BYTES) {
    const err = new Error("A file in the repo is too large to import.");
    err.status = 400;
    throw err;
  }
  return { kind: "bin", buffer: buf, size: buf.length };
}

function assembleFromMap(filesByPath, preferredEntry, opts = {}) {
  const softFail = !!opts.softFail;
  const keys = [...filesByPath.keys()];
  const htmlKeys = keys.filter((k) => /\.html?$/i.test(k));
  if (!htmlKeys.length) {
    const err = new Error("That repository has no .html files to import.");
    err.status = 400;
    throw err;
  }
  const entry =
    (preferredEntry && filesByPath.get(preferredEntry)?.text && preferredEntry) ||
    pickEntryHtml(htmlKeys);
  const entryDir = normalizeAssetPath(entry.replace(/[^/]+$/, ""));
  let html = filesByPath.get(entry)?.text || "";
  if (!html.trim()) {
    const err = new Error("Entry HTML file is empty.");
    err.status = 400;
    throw err;
  }

  const resolvePath = (ref) => {
    const raw = String(ref || "").trim();
    if (!raw || /^(https?:|data:|blob:|mailto:|tel:|#|\/\/)/i.test(raw)) return null;
    const clean = normalizeAssetPath(raw.split("?")[0].split("#")[0]);
    if (!clean) return null;
    const candidates = [
      normalizeAssetPath(entryDir + clean),
      clean,
      normalizeAssetPath(clean.replace(/^\.\.\//, "")),
    ];
    for (const key of candidates) {
      if (filesByPath.has(key)) return key;
    }
    const base = clean.split("/").pop();
    if (!base) return null;
    return keys.find((k) => k.split("/").pop() === base) || null;
  };

  const linkRe = /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi;
  for (const tag of [...html.matchAll(linkRe)].map((m) => m[0])) {
    const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
    const key = resolvePath(href);
    const file = key ? filesByPath.get(key) : null;
    if (!file?.text || file.size > MAX_INLINE_TEXT) continue;
    html = html.replace(tag, "<style>\n" + file.text + "\n</style>");
  }

  const scriptRe = /<script\b[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  for (const item of [...html.matchAll(scriptRe)].map((m) => ({ full: m[0], src: m[1] }))) {
    const key = resolvePath(item.src);
    const file = key ? filesByPath.get(key) : null;
    if (!file?.text || file.size > MAX_INLINE_TEXT) continue;
    html = html.replace(item.full, "<script>\n" + file.text + "\n</script>");
  }

  const attrRe = /\b(src|href)=["']([^"']+)["']/gi;
  for (const item of [...html.matchAll(attrRe)].map((m) => ({ full: m[0], attr: m[1], val: m[2] }))) {
    const pathOnly = item.val.split("?")[0];
    const isFont = /\.(woff2?|ttf|otf)$/i.test(pathOnly);
    const isImage = /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(pathOnly);
    if (!isFont && !isImage) continue;
    const key = resolvePath(item.val);
    const file = key ? filesByPath.get(key) : null;
    const cap = isFont ? MAX_INLINE_FONT : MAX_INLINE_IMAGE;
    if (!file || file.size > cap) continue;
    let dataUrl = "";
    if (file.text != null && /\.svg$/i.test(key)) {
      dataUrl = "data:image/svg+xml;base64," + Buffer.from(file.text, "utf8").toString("base64");
    } else if (file.buffer) {
      dataUrl = "data:" + guessMime(key) + ";base64," + file.buffer.toString("base64");
    } else continue;
    html = html.replace(item.full, item.attr + '="' + dataUrl + '"');
  }

  if (html.length > MAX_HTML) {
    const dataAttrRe = /\b(src|href)=["'](data:[^"']+)["']/gi;
    const embedded = [...html.matchAll(dataAttrRe)]
      .map((m) => ({ full: m[0], attr: m[1], data: m[2], len: m[2].length }))
      .filter((m) => m.data.startsWith("data:image/") || m.data.startsWith("data:font/") || m.data.includes("font/"))
      .sort((a, b) => b.len - a.len);
    for (const item of embedded) {
      if (html.length <= MAX_HTML) break;
      html = html.replace(item.full, item.attr + '=""');
    }
  }

  if (html.length > MAX_HTML && softFail) {
    html = html.replace(/\b(src|href)=["']data:[^"']+["']/gi, (full, attr) => attr + '=""');
  }

  if (html.length > MAX_HTML) {
    const err = new Error(
      softFail
        ? "Secondary page too large to include."
        : "Assembled site is still too large (max about 5.5 MB). Use a leaner site or fewer/smaller images."
    );
    err.status = 400;
    throw err;
  }

  return { html, entryName: entry };
}

async function mapPool(items, limit, worker) {
  const list = Array.from(items || []);
  const out = new Array(list.length);
  let next = 0;
  async function run() {
    while (next < list.length) {
      const i = next++;
      out[i] = await worker(list[i], i);
    }
  }
  const runners = Array.from({ length: Math.min(limit, Math.max(1, list.length)) }, () => run());
  await Promise.all(runners);
  return out;
}

function collectLocalRefs(html, entryDir) {
  const refs = new Set();
  const add = (raw) => {
    const val = String(raw || "").trim();
    if (!val || /^(https?:|data:|blob:|mailto:|tel:|#|\/\/)/i.test(val)) return;
    const clean = normalizeAssetPath(val.split("?")[0].split("#")[0]);
    if (!clean) return;
    refs.add(normalizeAssetPath(entryDir + clean));
    refs.add(clean);
  };
  for (const m of html.matchAll(/<(?:link|script|img|source|video|audio|use)\b[^>]*>/gi)) {
    const tag = m[0];
    const href = (tag.match(/\b(?:href|src|data-src)=["']([^"']+)["']/i) || [])[1];
    if (href) add(href);
    const srcset = (tag.match(/\bsrcset=["']([^"']+)["']/i) || [])[1];
    if (srcset) {
      srcset.split(",").forEach((part) => add(part.trim().split(/\s+/)[0]));
    }
  }
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
    add(m[1]);
  }
  return [...refs];
}

function resolveTreePath(blobByPath, entryDir, ref) {
  const raw = String(ref || "").trim();
  if (!raw || /^(https?:|data:|blob:|mailto:|tel:|#|\/\/)/i.test(raw)) return null;
  const clean = normalizeAssetPath(raw.split("?")[0].split("#")[0]);
  if (!clean) return null;
  const candidates = [
    normalizeAssetPath(entryDir + clean),
    clean,
    normalizeAssetPath(clean.replace(/^\.\.\//, "")),
  ];
  for (const key of candidates) {
    if (blobByPath.has(key)) return key;
  }
  const base = clean.split("/").pop();
  if (!base) return null;
  for (const key of blobByPath.keys()) {
    if (key.split("/").pop() === base) return key;
  }
  return null;
}

function normalizePathPrefix(raw) {
  let p = String(raw || "").trim();
  if (!p) return "";
  // Accept pasted GitHub tree URLs: https://github.com/owner/repo/tree/main/docs/site
  p = p
    .replace(/^https?:\/\/github\.com\/[^/]+\/[^/]+\/tree\/[^/]+\//i, "")
    .replace(/^https?:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[^/]+\//i, "")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  return normalizeAssetPath(p);
}

/**
 * Sites often use GitHub Pages project URLs like /repo-name/page.html.
 * After we flatten into site-folder-relative files, strip those bases from href/src.
 */
function rewriteSiteBasePaths(html, prefixes) {
  let out = String(html || "");
  const list = [
    ...new Set(
      (prefixes || [])
        .map((p) => normalizeAssetPath(p))
        .filter((p) => p && p !== "." && !p.includes(".."))
    ),
  ].sort((a, b) => b.length - a.length);
  for (const prefix of list) {
    const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // href="/prefix" or href="/prefix/" → index.html (must run before the path strip)
    out = out.replace(
      new RegExp(`(\\b(?:href|src|action)=["'])\\/?${esc}\\/?(?=["'#?])`, "gi"),
      "$1index.html"
    );
    // href="/prefix/page.html" → href="page.html"
    out = out.replace(
      new RegExp(`(\\b(?:href|src|action)=["'])\\/?${esc}\\/(?!\\/)`, "gi"),
      "$1"
    );
  }
  return out;
}

function pickEntryHtml(htmlKeys) {
  const keys = Array.from(htmlKeys || []).filter(Boolean);
  if (!keys.length) return "";
  const indexes = keys.filter((k) => /(^|\/)index\.html?$/i.test(k));
  const pool = indexes.length ? indexes : keys;
  pool.sort((a, b) => {
    const depth = (p) => p.split("/").filter(Boolean).length;
    return depth(a) - depth(b) || a.length - b.length || a.localeCompare(b);
  });
  return pool[0];
}

async function listSiteFolders(token, { fullName } = {}) {
  const tok = normalizeToken(token);
  const { owner, repo } = parseOwnerRepo(fullName);
  const meta = await githubFetch(tok, "/repos/" + owner + "/" + repo);
  const branch = meta?.default_branch || "main";
  const tree = await githubFetch(
    tok,
    "/repos/" + owner + "/" + repo + "/git/trees/" + encodeURIComponent(branch) + "?recursive=1"
  );
  if (!tree || tree.truncated === true) {
    const err = new Error(
      "Repository tree is too large. Set Site folder to the directory that contains index.html."
    );
    err.status = 400;
    throw err;
  }

  const htmlPaths = (tree.tree || [])
    .filter((n) => n?.type === "blob" && n?.path && /\.html?$/i.test(n.path))
    .map((n) => normalizeAssetPath(n.path));
  if (!htmlPaths.length) {
    return { branch, folders: [], suggested: "" };
  }

  const folderMap = new Map();
  for (const path of htmlPaths) {
    const parts = path.split("/").filter(Boolean);
    const file = parts[parts.length - 1] || "";
    const dir = parts.slice(0, -1).join("/");
    const key = dir || "";
    const cur = folderMap.get(key) || { path: key, htmlCount: 0, hasIndex: false };
    cur.htmlCount += 1;
    if (/^index\.html?$/i.test(file)) cur.hasIndex = true;
    folderMap.set(key, cur);
  }

  const folders = [...folderMap.values()]
    .map((f) => ({
      path: f.path,
      label: f.path ? f.path + "/" : "(repository root)",
      htmlCount: f.htmlCount,
      hasIndex: f.hasIndex,
    }))
    .sort((a, b) => {
      if (a.hasIndex !== b.hasIndex) return a.hasIndex ? -1 : 1;
      const depth = (p) => (p ? p.split("/").length : 0);
      return depth(a.path) - depth(b.path) || b.htmlCount - a.htmlCount || a.path.localeCompare(b.path);
    });

  const suggested =
    folders.find((f) => f.hasIndex && !f.path)?.path ??
    folders.find((f) => f.hasIndex)?.path ??
    folders[0]?.path ??
    "";

  return { branch, folders, suggested };
}

async function importRepoSite(token, { fullName, pathPrefix = "" } = {}) {
  const tok = normalizeToken(token);
  const { owner, repo, fullName: name } = parseOwnerRepo(fullName);
  let prefix = normalizePathPrefix(pathPrefix);

  const meta = await githubFetch(tok, "/repos/" + owner + "/" + repo);
  const branch = meta?.default_branch || "main";
  const tree = await githubFetch(
    tok,
    "/repos/" + owner + "/" + repo + "/git/trees/" + encodeURIComponent(branch) + "?recursive=1"
  );
  if (!tree || tree.truncated === true) {
    const err = new Error(
      "Repository tree is too large or truncated. Put the site in a smaller folder and set the Site folder path."
    );
    err.status = 400;
    throw err;
  }

  let blobs = (tree.tree || []).filter((n) => n?.type === "blob" && n?.path && isSiteFile(n.path));

  // If no folder chosen, auto-pick the best directory that contains index.html.
  if (!prefix) {
    const htmlPaths = blobs.map((n) => normalizeAssetPath(n.path)).filter((p) => /\.html?$/i.test(p));
    const hasRootIndex = htmlPaths.some((p) => /^index\.html?$/i.test(p));
    if (!hasRootIndex) {
      const best = pickEntryHtml(htmlPaths);
      if (best && best.includes("/")) {
        prefix = normalizeAssetPath(best.replace(/[^/]+$/, "").replace(/\/$/, ""));
      }
    }
  }

  if (prefix) {
    const withSlash = prefix.endsWith("/") ? prefix : prefix + "/";
    blobs = blobs.filter((n) => n.path === prefix || n.path.startsWith(withSlash));
  }
  if (!blobs.length) {
    const err = new Error(
      prefix
        ? "No website files found under \"" + prefix + "\". Pick the folder that contains index.html."
        : "No website files found in that repository."
    );
    err.status = 400;
    throw err;
  }

  const blobByPath = new Map();
  for (const node of blobs) {
    let rel = normalizeAssetPath(node.path);
    if (prefix) {
      const withSlash = prefix.endsWith("/") ? prefix : prefix + "/";
      if (rel.startsWith(withSlash)) rel = normalizeAssetPath(rel.slice(withSlash.length));
      else if (rel === prefix) continue;
    }
    if (!rel) continue;
    blobByPath.set(rel, node);
  }

  const htmlKeys = [...blobByPath.keys()].filter((k) => /\.html?$/i.test(k));
  if (!htmlKeys.length) {
    const err = new Error(
      prefix
        ? "No .html files found in \"" + prefix + "\"."
        : "That repository has no .html files to import."
    );
    err.status = 400;
    throw err;
  }
  const entry = pickEntryHtml(htmlKeys);
  const entryNode = blobByPath.get(entry);
  if (!entryNode?.sha) {
    const err = new Error("Could not locate the site entry HTML in that repository.");
    err.status = 400;
    throw err;
  }

  const entryFile = await fetchBlob(tok, owner, repo, entryNode.sha, true);
  if (!String(entryFile.text || "").trim()) {
    const err = new Error("Entry HTML file is empty.");
    err.status = 400;
    throw err;
  }

  const filesByPath = new Map();
  filesByPath.set(entry, { text: entryFile.text, size: entryFile.size });
  const entryDir = normalizeAssetPath(entry.replace(/[^/]+$/, ""));

  const needed = new Set();
  for (const ref of collectLocalRefs(entryFile.text, entryDir)) {
    const key = resolveTreePath(blobByPath, entryDir, ref);
    if (key && key !== entry) needed.add(key);
  }

  // Always try common companion assets near the entry page.
  for (const key of blobByPath.keys()) {
    if (key === entry) continue;
    if (!/\.(css|js|mjs)$/i.test(key)) continue;
    const sameDir = normalizeAssetPath(key.replace(/[^/]+$/, "")) === entryDir;
    if (sameDir) needed.add(key);
  }

  // Cap optional assets so large repos finish quickly. Prefer CSS/JS over images.
  let imageCount = 0;
  const fetchList = [];
  for (const key of needed) {
    const node = blobByPath.get(key);
    if (!node?.sha) continue;
    const knownSize = Number(node.size) || 0;
    const asText = isTextish(key);
    if (knownSize > MAX_FETCH_BYTES) continue;
    if (!asText) {
      const isFont = /\.(woff2?|ttf|otf)$/i.test(key);
      const cap = isFont ? MAX_INLINE_FONT : MAX_INLINE_IMAGE;
      if (knownSize > cap) continue;
      if (!isFont) {
        imageCount += 1;
        if (imageCount > MAX_IMAGES) continue;
      }
    }
    fetchList.push({ key, node, asText, knownSize });
  }
  fetchList.sort((a, b) => {
    const rank = (item) => {
      if (/\.css$/i.test(item.key)) return 0;
      if (/\.(js|mjs)$/i.test(item.key)) return 1;
      if (/\.svg$/i.test(item.key)) return 2;
      if (/\.(woff2?|ttf|otf)$/i.test(item.key)) return 3;
      return 4;
    };
    return rank(a) - rank(b);
  });
  if (fetchList.length > MAX_TREE_BLOBS) fetchList.length = MAX_TREE_BLOBS;

  let total = entryFile.size;
  const reserveBytes = (n) => {
    const size = Number(n) || 0;
    if (size <= 0) return true;
    if (total + size > MAX_FETCH_BYTES) return false;
    total += size;
    return true;
  };

  await mapPool(fetchList, MAX_PARALLEL_FETCH, async (item) => {
    const estimate = item.knownSize > 0 ? item.knownSize : item.asText ? MAX_INLINE_TEXT : MAX_INLINE_IMAGE;
    if (!reserveBytes(estimate)) return;
    try {
      const file = await fetchBlob(tok, owner, repo, item.node.sha, item.asText);
      // Adjust reservation to actual size.
      total += Math.max(0, file.size - estimate);
      if (total > MAX_FETCH_BYTES && file.size > estimate) {
        // Over budget after real size — drop this optional asset.
        total -= file.size;
        return;
      }
      if (file.kind === "text") {
        filesByPath.set(item.key, { text: file.text, size: file.size });
        if (/\.css$/i.test(item.key)) {
          for (const ref of collectLocalRefs(file.text, normalizeAssetPath(item.key.replace(/[^/]+$/, "")))) {
            const nestedKey = resolveTreePath(blobByPath, entryDir, ref);
            if (!nestedKey || filesByPath.has(nestedKey) || !blobByPath.has(nestedKey)) continue;
            const nested = blobByPath.get(nestedKey);
            const nestedText = isTextish(nestedKey);
            const nestedSize = Number(nested.size) || 0;
            if (!nestedText) {
              const isFont = /\.(woff2?|ttf|otf)$/i.test(nestedKey);
              const cap = isFont ? MAX_INLINE_FONT : MAX_INLINE_IMAGE;
              if (nestedSize > cap) continue;
            }
            const nestedEstimate = nestedSize > 0 ? nestedSize : nestedText ? MAX_INLINE_TEXT : MAX_INLINE_IMAGE;
            if (!reserveBytes(nestedEstimate)) continue;
            try {
              const nestedFile = await fetchBlob(tok, owner, repo, nested.sha, nestedText);
              total += Math.max(0, nestedFile.size - nestedEstimate);
              if (total > MAX_FETCH_BYTES && nestedFile.size > nestedEstimate) {
                total -= nestedFile.size;
                continue;
              }
              if (nestedFile.kind === "text") {
                filesByPath.set(nestedKey, { text: nestedFile.text, size: nestedFile.size });
              } else {
                filesByPath.set(nestedKey, { buffer: nestedFile.buffer, size: nestedFile.size });
              }
            } catch (_) {
              total -= nestedEstimate;
            }
          }
        }
      } else {
        filesByPath.set(item.key, { buffer: file.buffer, size: file.size });
      }
    } catch (_) {
      total -= estimate;
    }
  });

  // Pull sibling HTML pages so nav links (about.html, etc.) can be published.
  const otherHtml = htmlKeys.filter((k) => k !== entry).slice(0, MAX_HTML_PAGES - 1);
  await mapPool(otherHtml, MAX_PARALLEL_FETCH, async (key) => {
    if (filesByPath.get(key)?.text) return;
    const node = blobByPath.get(key);
    if (!node?.sha) return;
    const knownSize = Number(node.size) || 0;
    if (knownSize > MAX_FETCH_BYTES) return;
    const estimate = knownSize > 0 ? knownSize : MAX_INLINE_TEXT;
    if (!reserveBytes(estimate)) return;
    try {
      const file = await fetchBlob(tok, owner, repo, node.sha, true);
      total += Math.max(0, file.size - estimate);
      if (total > MAX_FETCH_BYTES && file.size > estimate) {
        total -= file.size;
        return;
      }
      if (file.kind === "text" && String(file.text || "").trim()) {
        filesByPath.set(key, { text: file.text, size: file.size });
      }
    } catch (_) {
      total -= estimate;
    }
  });

  // Fetch CSS/JS referenced only by sibling pages (shared assets already present).
  const extraNeeded = new Set();
  for (const pageKey of otherHtml) {
    const text = filesByPath.get(pageKey)?.text;
    if (!text) continue;
    const pageDir = normalizeAssetPath(pageKey.replace(/[^/]+$/, ""));
    for (const ref of collectLocalRefs(text, pageDir)) {
      const key = resolveTreePath(blobByPath, pageDir, ref);
      if (!key || filesByPath.has(key) || !blobByPath.has(key)) continue;
      if (!/\.(css|js|mjs)$/i.test(key)) continue;
      extraNeeded.add(key);
    }
  }
  await mapPool([...extraNeeded].slice(0, 40), MAX_PARALLEL_FETCH, async (key) => {
    if (filesByPath.has(key)) return;
    const node = blobByPath.get(key);
    if (!node?.sha) return;
    const knownSize = Number(node.size) || 0;
    if (knownSize > MAX_INLINE_TEXT) return;
    const estimate = knownSize > 0 ? knownSize : MAX_INLINE_TEXT;
    if (!reserveBytes(estimate)) return;
    try {
      const file = await fetchBlob(tok, owner, repo, node.sha, true);
      total += Math.max(0, file.size - estimate);
      if (file.kind === "text") filesByPath.set(key, { text: file.text, size: file.size });
    } catch (_) {
      total -= estimate;
    }
  });

  const assembled = assembleFromMap(filesByPath, entry);
  const repoShort = String(name || "").split("/").pop() || "";
  const linkPrefixes = [prefix, repoShort].filter(Boolean);
  const rewritePage = (pageHtml) => rewriteSiteBasePaths(pageHtml, linkPrefixes);

  const siteFiles = {};
  let siteBytes = 0;
  const addSiteFile = (path, pageHtml) => {
    const safe = normalizeAssetPath(path);
    if (!safe || !/\.html?$/i.test(safe) || !pageHtml) return;
    const rewritten = rewritePage(pageHtml);
    const bytes = Buffer.byteLength(rewritten, "utf8");
    if (siteBytes + bytes > MAX_SITE_FILES_BYTES) return false;
    siteFiles[safe] = rewritten;
    siteBytes += bytes;
    return true;
  };
  addSiteFile(entry, assembled.html);
  if (!/^index\.html?$/i.test(entry)) {
    addSiteFile("index.html", assembled.html);
  }
  for (const pageKey of otherHtml) {
    if (!filesByPath.get(pageKey)?.text) continue;
    try {
      const page = assembleFromMap(filesByPath, pageKey, { softFail: true });
      if (!addSiteFile(pageKey, page.html)) break;
    } catch (_) {
      /* skip oversized/broken secondary pages */
    }
  }

  const entryHtml = siteFiles[entry] || siteFiles["index.html"] || rewritePage(assembled.html);

  return {
    html: entryHtml,
    entryName: entry,
    siteFiles,
    repo: name,
    branch,
    pathPrefix: prefix || "",
  };
}

module.exports = {
  listUserRepos,
  listSiteFolders,
  importRepoSite,
  normalizeToken,
  parseOwnerRepo,
  normalizePathPrefix,
  rewriteSiteBasePaths,
};
