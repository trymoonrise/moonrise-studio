/**
 * Load Website Presets from GitHub (main branch) for AI generation.
 * Default: trymoonrise/moonrise-studio → Website Presets/presets
 */
const DEFAULT_REPO = "trymoonrise/moonrise-studio";
const DEFAULT_REF = "main";
const DEFAULT_PRESETS_PATH = "Website Presets/presets";
const DEFAULT_TTL_MS = 10 * 60 * 1000;

let manifestCache = {
  items: [],
  fetchedAt: 0,
  ref: "",
  repo: "",
  basePath: "",
};

/** @type {Map<string, { html: string, fetchedAt: number }>} */
const fileCache = new Map();

function presetConfig() {
  const source = String(process.env.WEBSITE_PRESETS_SOURCE || "github").trim().toLowerCase();
  return {
    source,
    repo: String(process.env.WEBSITE_PRESETS_GITHUB_REPO || DEFAULT_REPO).trim(),
    ref: String(process.env.WEBSITE_PRESETS_GITHUB_REF || DEFAULT_REF).trim(),
    basePath: String(process.env.WEBSITE_PRESETS_GITHUB_PATH || DEFAULT_PRESETS_PATH).trim(),
    token: String(process.env.GITHUB_TOKEN || "").trim(),
    ttlMs: Math.max(60_000, Number(process.env.WEBSITE_PRESETS_GITHUB_TTL_MS || DEFAULT_TTL_MS)),
  };
}

function shouldUseGithub() {
  const { source } = presetConfig();
  return source === "github" || source === "auto";
}

function githubTreeUrl() {
  const { repo, ref, basePath } = presetConfig();
  const encodedPath = basePath.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/${repo}/tree/${ref}/${encodedPath}`;
}

function rawGithubUrl(relativePath) {
  const { repo, ref } = presetConfig();
  const encoded = String(relativePath || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://raw.githubusercontent.com/${repo}/${ref}/${encoded}`;
}

async function fetchGithubText(relativePath) {
  const { token } = presetConfig();
  const url = rawGithubUrl(relativePath);
  const headers = {
    "User-Agent": "moonrise-studio-worker",
    Accept: "application/vnd.github.raw",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`GitHub preset fetch ${res.status} for ${relativePath}`);
  }
  return res.text();
}

function cacheFresh(fetchedAt, ttlMs) {
  return fetchedAt > 0 && Date.now() - fetchedAt < ttlMs;
}

function getManifestSync() {
  return manifestCache.items.slice();
}

function getPresetSourceMeta() {
  const cfg = presetConfig();
  return {
    source: shouldUseGithub() ? "github" : cfg.source,
    repo: cfg.repo,
    ref: cfg.ref,
    basePath: cfg.basePath,
    treeUrl: githubTreeUrl(),
    manifestCount: manifestCache.items.length,
    manifestFetchedAt: manifestCache.fetchedAt || null,
    fileCacheSize: fileCache.size,
  };
}

async function ensureManifest({ force = false } = {}) {
  const cfg = presetConfig();
  if (
    !force &&
    manifestCache.items.length &&
    manifestCache.repo === cfg.repo &&
    manifestCache.ref === cfg.ref &&
    manifestCache.basePath === cfg.basePath &&
    cacheFresh(manifestCache.fetchedAt, cfg.ttlMs)
  ) {
    return manifestCache.items;
  }

  if (!shouldUseGithub()) {
    return manifestCache.items;
  }

  const text = await fetchGithubText(`${cfg.basePath}/manifest.json`);
  const parsed = JSON.parse(text);
  const items = Array.isArray(parsed) ? parsed : [];
  manifestCache = {
    items,
    fetchedAt: Date.now(),
    ref: cfg.ref,
    repo: cfg.repo,
    basePath: cfg.basePath,
  };
  return items;
}

async function loadPresetHtml(filename) {
  const safeName = String(filename || "").trim();
  if (!safeName || safeName.includes("..") || safeName.includes("/") || safeName.includes("\\")) {
    throw new Error("Invalid preset filename");
  }

  const cfg = presetConfig();
  const cached = fileCache.get(safeName);
  if (cached && cacheFresh(cached.fetchedAt, cfg.ttlMs)) {
    return cached.html;
  }

  const html = await fetchGithubText(`${cfg.basePath}/${safeName}`);
  fileCache.set(safeName, { html, fetchedAt: Date.now() });
  return html;
}

module.exports = {
  presetConfig,
  shouldUseGithub,
  githubTreeUrl,
  rawGithubUrl,
  ensureManifest,
  loadPresetHtml,
  getManifestSync,
  getPresetSourceMeta,
};
