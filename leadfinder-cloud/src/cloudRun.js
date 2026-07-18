import process from "node:process";
import { chromium } from "playwright";
import { config } from "./config.js";
import { appendLeadsToMasterCsv } from "./csv.js";
import { flushUploadNoticesToDiscord } from "./discord.js";
import { loadSeeds, queryAt, totalQueries } from "./parseSeeds.js";
import { scrapeMapsSearch } from "./scrapeMapsList.js";
import {
  filterNewLeads,
  loadState,
  rememberSentKeys,
  saveState,
} from "./state.js";
import { uploadLeadsToSupabase } from "./supabaseUpload.js";

function parseArgs(argv) {
  const args = {
    dryRun: false,
    forever: false,
    limit: null,
    startIndex: null,
    workers: null,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    if (arg === "--forever") args.forever = true;
    if (arg.startsWith("--limit=")) args.limit = Number(arg.split("=")[1]);
    if (arg.startsWith("--start-index=")) args.startIndex = Number(arg.split("=")[1]);
    if (arg.startsWith("--workers=")) args.workers = Number(arg.split("=")[1]);
  }
  return args;
}

function emitChat(payload) {
  console.log(`LFCHAT:${JSON.stringify(payload)}`);
}

async function launchBrowserPool(cfg, workerCount) {
  const launchOptions = {
    headless: cfg.headless,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      "--disable-renderer-backgrounding",
    ],
  };
  if (cfg.chromeChannel) launchOptions.channel = cfg.chromeChannel;

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1400, height: 900 },
    locale: "en-US",
  });

  const pages = [];
  for (let i = 0; i < workerCount; i += 1) {
    pages.push(await context.newPage());
  }

  return { browser, context, pages };
}

async function flushDiscordNotices(state, cfg, dryRun) {
  if (dryRun || !cfg.discordWebhookUrl) return state;
  if ((Number(state.pendingNotifyCount) || 0) < 1000) return state;

  const flush = await flushUploadNoticesToDiscord({
    webhookUrl: cfg.discordWebhookUrl,
    pendingNotifyCount: state.pendingNotifyCount,
    nextBatchNumber: state.nextBatchNumber,
  });

  const notified =
    (Number(state.pendingNotifyCount) || 0) - (Number(flush.pendingNotifyCount) || 0);

  return {
    ...state,
    pendingNotifyCount: flush.pendingNotifyCount,
    pendingLeads: [],
    nextBatchNumber: flush.nextBatchNumber,
    totalSent: (Number(state.totalSent) || 0) + notified,
  };
}

async function scrapeOneQuery(page, query, cfg) {
  emitChat({
    event: "status",
    text: `Search [${query.index}]: ${query.text}`,
  });

  try {
    const result = await scrapeMapsSearch(page, query.text, cfg);
    const rows = result.rows || [];
    const enrichNote =
      result.placePage
        ? "place page"
        : result.enriched
          ? `enriched ${result.enriched}/${result.enrichAttempted || result.enriched}`
          : "";
    console.log(
      `found ${result.rowCount} leads · ${query.text}${enrichNote ? ` · ${enrichNote}` : ""}`,
    );
    for (const row of rows) {
      emitChat({
        event: "lead",
        name: String(row.business_name || row.qBF1Pd || "").trim() || "(unnamed)",
        mapsUrl: String(row.maps_url || row["hfpxzc href"] || "").trim(),
        phone: String(row.phone || row.UsdlK || "").trim(),
      });
    }
    return { query, rows, error: null };
  } catch (error) {
    emitChat({
      event: "status",
      text: `Failed: ${query.text} — ${error.message}`,
    });
    console.error(`scrape failed for "${query.text}":`, error.message);
    return { query, rows: [], error };
  }
}

async function ingestBatchResults(results, state, cfg, dryRun, totals) {
  let nextState = state;

  for (const { query, rows } of results) {
    const newLeads = filterNewLeads(rows, nextState);
    totals.scraped += rows.length;
    totals.fresh += newLeads.length;

    if (newLeads.length) {
      await appendLeadsToMasterCsv(cfg.masterCsvFile, newLeads);

      try {
        const upload = await uploadLeadsToSupabase(newLeads, cfg);
        if (upload.skipped) {
          emitChat({
            event: "status",
            text: `Supabase skipped (${upload.reason})`,
          });
        } else {
          const uploaded = Number(upload.imported) || 0;
          nextState.sentKeys = rememberSentKeys(nextState, newLeads);
          nextState.pendingNotifyCount =
            (Number(nextState.pendingNotifyCount) || 0) + uploaded;
          nextState.totalSupabaseUploaded =
            (Number(nextState.totalSupabaseUploaded) || 0) + uploaded;
          emitChat({
            event: "status",
            text: `Supabase · imported ${uploaded} · skipped ${upload.skippedRows} · total uploads ${nextState.totalSupabaseUploaded} · notify buffer ${nextState.pendingNotifyCount}/1000`,
          });
          console.log(
            `Supabase upload: imported=${uploaded} skipped=${upload.skippedRows} total=${nextState.totalSupabaseUploaded}`,
          );
          // Ping Discord as soon as another full 1,000 has landed in Supabase.
          nextState = await flushDiscordNotices(nextState, cfg, dryRun);
        }
      } catch (error) {
        emitChat({
          event: "status",
          text: `Supabase upload failed: ${error.message}`,
        });
        console.error("Supabase upload failed:", error.message);
      }
    }

    nextState.nextIndex = query.index + 1;
  }

  nextState = await flushDiscordNotices(nextState, cfg, dryRun);
  await saveState(cfg, nextState);
  return nextState;
}

async function main() {
  const cfg = config();
  const args = parseArgs(process.argv.slice(2));
  const forever = args.forever || process.env.FOREVER === "1";
  const workerCount = Math.max(
    1,
    Math.min(
      8,
      Number.isFinite(args.workers) && args.workers > 0
        ? Math.floor(args.workers)
        : cfg.scrapeWorkers,
    ),
  );

  if (!cfg.discordWebhookUrl && !args.dryRun) {
    throw new Error("DISCORD_WEBHOOK_URL is required (or pass --dry-run)");
  }

  const seeds = await loadSeeds(cfg.seedFile);
  const total = totalQueries(seeds);
  let state = await loadState(cfg);

  if (args.startIndex != null && Number.isFinite(args.startIndex)) {
    state.nextIndex = Math.max(0, args.startIndex);
  }

  const queryLimit = forever
    ? Number.POSITIVE_INFINITY
    : args.limit != null && Number.isFinite(args.limit)
      ? Math.max(0, args.limit)
      : cfg.queriesPerRun;

  emitChat({
    event: "status",
    text: forever
      ? `Parallel mode · ${workerCount} browsers · warm forever · ${total.toLocaleString()} searches · index ${state.nextIndex}`
      : `Starting · ${workerCount} parallel · ${queryLimit} searches · index ${state.nextIndex}`,
  });
  console.log(`LeadFinder parallel workers=${workerCount}`);

  let browserBundle = null;
  let searchesDone = 0;
  const totals = { scraped: 0, fresh: 0 };

  try {
    if (!args.dryRun) {
      browserBundle = await launchBrowserPool(cfg, workerCount);
    }

    while (searchesDone < queryLimit) {
      const remaining =
        Number.isFinite(queryLimit) ? queryLimit - searchesDone : workerCount;
      const batchSize = Math.max(1, Math.min(workerCount, remaining));
      const batch = [];

      for (let i = 0; i < batchSize; i += 1) {
        const query = queryAt(seeds, state.nextIndex + i);
        if (!query) break;
        batch.push(query);
      }

      if (!batch.length) break;

      emitChat({
        event: "status",
        text: `Parallel batch · ${batch.length} searches · ${batch.map((q) => q.text).join(" · ")}`,
      });

      if (args.dryRun) {
        state.nextIndex = batch[batch.length - 1].index + 1;
        searchesDone += batch.length;
        await saveState(cfg, state);
        continue;
      }

      const results = await Promise.all(
        batch.map((query, i) =>
          scrapeOneQuery(browserBundle.pages[i % browserBundle.pages.length], query, cfg),
        ),
      );

      state = await ingestBatchResults(
        results,
        state,
        cfg,
        args.dryRun,
        totals,
      );
      searchesDone += batch.length;
    }
  } finally {
    if (browserBundle?.browser) {
      await browserBundle.browser.close().catch(() => {});
    }
  }

  emitChat({
    event: "status",
    text: `Done · ${totals.scraped} scraped · ${totals.fresh} new · notify buffer ${state.pendingNotifyCount || 0}/1000`,
  });
  console.log("LeadFinder Cloud run finished.");
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exitCode = 1;
});
