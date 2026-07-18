import fs from "node:fs/promises";

function cleanLine(line) {
  return String(line || "")
    .trim()
    .replace(/^-+\s*/, "")
    .trim();
}

export function parseSeedText(text) {
  const prefixes = [];
  const suffixes = [];
  let section = "";

  String(text || "")
    .split(/\r?\n/)
    .forEach((rawLine) => {
      const line = cleanLine(rawLine);
      if (!line) return;

      if (/^prefix group:?$/i.test(line)) {
        section = "prefix";
        return;
      }
      if (/^suffix group:?$/i.test(line)) {
        section = "suffix";
        return;
      }

      if (section === "prefix") prefixes.push(line);
      if (section === "suffix") suffixes.push(line);
    });

  return { prefixes, suffixes };
}

export async function loadSeeds(seedFile) {
  const text = await fs.readFile(seedFile, "utf8");
  const seeds = parseSeedText(text);
  if (!seeds.prefixes.length) {
    throw new Error(`No prefix categories found in ${seedFile}`);
  }
  if (!seeds.suffixes.length) {
    throw new Error(`No suffix locations found in ${seedFile}`);
  }
  return seeds;
}

export function totalQueries(seeds) {
  return seeds.prefixes.length * seeds.suffixes.length;
}

export function queryAt(seeds, index) {
  const total = totalQueries(seeds);
  if (!total) return null;
  const safe = ((Number(index) || 0) % total + total) % total;
  const suffixIndex = Math.floor(safe / seeds.prefixes.length);
  const prefixIndex = safe % seeds.prefixes.length;
  const prefix = seeds.prefixes[prefixIndex];
  const suffix = seeds.suffixes[suffixIndex];
  return {
    index: safe,
    prefixIndex,
    suffixIndex,
    prefix,
    suffix,
    text: `${prefix} ${suffix}`,
  };
}
