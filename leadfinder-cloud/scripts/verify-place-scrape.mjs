/**
 * Smoke-test place contact extraction against a known Maps listing.
 * Usage: node scripts/verify-place-scrape.mjs [mapsUrl]
 */
import { chromium } from "playwright";
import { config } from "../src/config.js";
import { scrapeMapsPlace } from "../src/scrapePlace.js";
import { scrapeMapsSearch } from "../src/scrapeMapsList.js";

const DEFAULT_URL =
  "https://www.google.com/maps/place/HAULNJUNK/@33.4474965,-117.5897061,17z/data=!3m1!4b1!4m6!3m5!1s0x80dcdc8a52ce5d11:0x74eb8c75be40dfee!8m2!3d33.4474965!4d-117.5897061!16s%2Fg%2F11f04pc1nm";

async function main() {
  const cfg = config();
  const args = process.argv.slice(2);
const mode = args.includes("search") ? "search" : "place";
const mapsUrl = args.find((a) => a.startsWith("http")) || DEFAULT_URL;

  const browser = await chromium.launch({
    headless: cfg.headless,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
  });

  try {
    if (mode === "search") {
      const result = await scrapeMapsSearch(page, "HAULNJUNK San Clemente", cfg);
      const row = (result.rows || []).find((r) =>
        /haulnjunk/i.test(String(r.business_name || "")),
      ) || result.rows?.[0];
      console.log(
        JSON.stringify(
          {
            mode: "search",
            rowCount: result.rowCount,
            placePage: result.placePage,
            enriched: result.enriched,
            name: row?.business_name,
            phone: row?.phone,
            website: row?.website_url,
            address: row?.address,
          },
          null,
          2,
        ),
      );
      if (!row?.phone || !row?.website_url) process.exitCode = 2;
      return;
    }

    const result = await scrapeMapsPlace(page, mapsUrl, cfg, "HAULNJUNK");
    console.log(
      JSON.stringify(
        {
          mode: "place",
          name: result?.name || result?.row?.business_name,
          phone: result?.phone || result?.row?.phone,
          website: result?.websiteUrl || result?.row?.website_url,
          address: result?.row?.address,
          hadWebsite: result?.hadWebsite,
          hadPhone: result?.hadPhone,
          finalUrl: result?.finalUrl,
        },
        null,
        2,
      ),
    );
    if (!result?.row?.phone || !result?.row?.website_url) process.exitCode = 2;
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
