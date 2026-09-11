/**
 * Write doc/last-commit.json from the current git HEAD (used at deploy / CI).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..", "..");
const outFile = path.join(root, "doc", "last-commit.json");

function git(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function main() {
  let sha = "";
  let committedAt = "";
  let message = "";
  try {
    sha = git(["rev-parse", "HEAD"]);
    committedAt = git(["show", "-s", "--format=%cI", "HEAD"]);
    message = git(["show", "-s", "--format=%s", "HEAD"]);
  } catch (_) {
    console.warn("sync-last-commit: git unavailable; leaving existing file");
    return;
  }
  if (!sha || !committedAt) return;
  const payload = {
    repo: "trymoonrise/moonrise-studio",
    sha,
    committedAt,
    message,
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log("Wrote", path.relative(root, outFile), committedAt);
}

main();
