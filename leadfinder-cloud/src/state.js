import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_STATE = {
  nextIndex: 0,
  nextBatchNumber: 1,
  pendingNotifyCount: 0,
  pendingLeads: [],
  sentKeys: [],
  totalSent: 0,
  totalSupabaseUploaded: 0,
  updatedAt: "",
};

function makeClient(cfg) {
  if (!cfg.supabaseUrl || !cfg.supabaseKey) return null;
  return createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: false },
  });
}

function normalizeState(raw) {
  const parsed = raw && typeof raw === "object" ? raw : {};
  const sentKeys = Array.isArray(parsed.sentKeys) ? parsed.sentKeys.slice(-200000) : [];
  // Prefer explicit counter. Ignore legacy Discord-CSV buffers (avoid spam notices).
  const pendingNotifyCount =
    parsed.pendingNotifyCount != null
      ? Math.max(0, Number(parsed.pendingNotifyCount) || 0)
      : 0;
  const totalSent = Number(parsed.totalSent) || 0;
  // Seed from Discord notify totals if this is the first run after the upload switch.
  const totalSupabaseUploaded =
    parsed.totalSupabaseUploaded != null
      ? Math.max(0, Number(parsed.totalSupabaseUploaded) || 0)
      : totalSent + pendingNotifyCount;

  return {
    ...DEFAULT_STATE,
    ...parsed,
    // No longer buffer full lead objects for Discord CSV delivery.
    pendingLeads: [],
    pendingNotifyCount,
    sentKeys,
    nextIndex: Number(parsed.nextIndex) || 0,
    nextBatchNumber: Math.max(1, Number(parsed.nextBatchNumber) || 1),
    totalSent,
    totalSupabaseUploaded,
  };
}

async function readLocalState(stateFile) {
  try {
    const raw = await fs.readFile(stateFile, "utf8");
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    if (error.code === "ENOENT") return { ...DEFAULT_STATE };
    throw error;
  }
}

async function writeLocalState(stateFile, state) {
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  const normalized = normalizeState(state);
  const next = {
    ...normalized,
    pendingLeads: [],
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(stateFile, JSON.stringify(next, null, 2), "utf8");
  return next;
}

async function readRemoteState(cfg) {
  const supabase = makeClient(cfg);
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(cfg.stateBucket)
    .download(cfg.stateObject);

  if (error) {
    if (!/bucket not found|not found/i.test(error.message || "")) {
      console.warn(`Cloud state download skipped: ${error.message}`);
    }
    return null;
  }

  const text = await data.text();
  return normalizeState(JSON.parse(text));
}

async function writeRemoteState(cfg, state) {
  const supabase = makeClient(cfg);
  if (!supabase) return false;

  const body = JSON.stringify(
    {
      ...normalizeState(state),
      pendingLeads: [],
      updatedAt: new Date().toISOString(),
    },
    null,
    2,
  );

  const blob = new Blob([body], { type: "application/json" });
  const { error } = await supabase.storage
    .from(cfg.stateBucket)
    .upload(cfg.stateObject, blob, {
      upsert: true,
      contentType: "application/json",
    });

  if (error) {
    if (!/bucket not found|not found/i.test(error.message || "")) {
      console.warn(`Cloud state upload failed: ${error.message}`);
    }
    return false;
  }
  return true;
}

export async function loadState(cfg) {
  const remote = await readRemoteState(cfg);
  if (remote) {
    console.log(
      `Loaded cloud state (nextIndex=${remote.nextIndex}, pendingNotify=${remote.pendingNotifyCount}, batch=#${remote.nextBatchNumber})`,
    );
    await writeLocalState(cfg.stateFile, remote);
    return remote;
  }

  const local = await readLocalState(cfg.stateFile);
  console.log(
    `Loaded local state (nextIndex=${local.nextIndex}, pendingNotify=${local.pendingNotifyCount}, batch=#${local.nextBatchNumber})`,
  );
  return local;
}

export async function saveState(cfg, state) {
  const next = await writeLocalState(cfg.stateFile, state);
  await writeRemoteState(cfg, next);
  return next;
}

export function leadKey(lead) {
  const maps = String(lead?.maps_url || lead?.["hfpxzc href"] || "")
    .trim()
    .toLowerCase();
  if (maps) return maps;
  const name = String(lead?.business_name || lead?.qBF1Pd || "")
    .trim()
    .toLowerCase();
  const phone = String(lead?.phone || lead?.UsdlK || "").replace(/\D/g, "");
  const address = String(lead?.address || lead?.["W4Efsd 2"] || "")
    .trim()
    .toLowerCase();
  return `${name}::${phone}::${address}`;
}

export function filterNewLeads(leads, state) {
  const seen = new Set(state.sentKeys || []);

  const fresh = [];
  for (const lead of leads) {
    const key = leadKey(lead);
    if (!key || key === "::") continue;
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push({
      ...lead,
      collected_at: lead.collected_at || new Date().toISOString(),
      scrape_source: lead.scrape_source || "leadfinder-cloud",
    });
  }
  return fresh;
}

export function rememberSentKeys(state, leads) {
  const keys = new Set(state.sentKeys || []);
  for (const lead of leads) {
    const key = leadKey(lead);
    if (key) keys.add(key);
  }
  return Array.from(keys).slice(-200000);
}
