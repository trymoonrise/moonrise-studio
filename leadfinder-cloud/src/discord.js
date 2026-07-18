import process from "node:process";

export const DISCORD_BATCH_SIZE = 1000;

/**
 * Text-only Discord ping — no CSV attachments.
 * Fired once per 1,000 successful Supabase uploads.
 */
export async function sendDiscordUploadNotice({
  webhookUrl,
  batchNumber,
  count = DISCORD_BATCH_SIZE,
}) {
  if (!webhookUrl) {
    throw new Error("DISCORD_WEBHOOK_URL is required");
  }

  // Exact notice the user wants for every full 1,000-upload batch.
  const content = `${Number(count).toLocaleString("en-US")} new leads have been uploaded into your database`;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      allowed_mentions: { parse: [] },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Discord webhook failed (${response.status}): ${text.slice(0, 400)}`);
  }

  return { ok: true, batchNumber, count };
}

/**
 * Send one Discord notice per full 1,000 uploaded leads.
 * Leftover count stays in pendingNotifyCount.
 */
export async function flushUploadNoticesToDiscord({
  webhookUrl,
  pendingNotifyCount,
  nextBatchNumber,
  batchSize = DISCORD_BATCH_SIZE,
}) {
  let remaining = Math.max(0, Number(pendingNotifyCount) || 0);
  let batchNumber = nextBatchNumber;
  const sent = [];

  while (remaining >= batchSize) {
    const result = await sendDiscordUploadNotice({
      webhookUrl,
      batchNumber,
      count: batchSize,
    });
    sent.push(result);
    remaining -= batchSize;
    console.log(
      `Discord: notified batch #${batchNumber} — ${batchSize} new leads uploaded to database`,
    );
    batchNumber += 1;
    await new Promise((r) => setTimeout(r, 200));
  }

  if (remaining > 0) {
    console.log(
      `Discord: ${remaining} uploaded leads waiting until next full ${batchSize} for notice`,
    );
  }

  return {
    pendingNotifyCount: remaining,
    nextBatchNumber: batchNumber,
    sent,
  };
}

if (process.argv.includes("--test")) {
  const { config } = await import("./config.js");
  const cfg = config();
  if (!cfg.discordWebhookUrl) {
    console.error("Set DISCORD_WEBHOOK_URL in .env first");
    process.exit(1);
  }
  await sendDiscordUploadNotice({
    webhookUrl: cfg.discordWebhookUrl,
    batchNumber: 0,
    count: 1000,
  });
  console.log("Discord upload-notice smoke test sent.");
}
