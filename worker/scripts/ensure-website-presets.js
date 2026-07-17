const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..", "..");
const src = path.join(root, "Website Presets");
const dest = path.join(root, "website-presets");

function existsManifest(dir) {
  return fs.existsSync(path.join(dir, "presets", "manifest.json"));
}

function main() {
  if (!existsManifest(src)) {
    console.warn("Website Presets source missing:", src);
    process.exitCode = 1;
    return;
  }
  if (existsManifest(dest)) {
    console.log("website-presets already ready:", dest);
    return;
  }

  if (process.platform === "win32") {
    try {
      execFileSync("cmd", ["/c", "mklink", "/J", dest, src], { stdio: "inherit" });
      if (existsManifest(dest)) return;
    } catch (e) {
      console.warn("mklink /J failed:", e.message);
    }
  } else {
    try {
      fs.symlinkSync(src, dest, "dir");
      if (existsManifest(dest)) {
        console.log("Created symlink website-presets -> Website Presets");
        return;
      }
    } catch (e) {
      console.warn("symlink failed:", e.message);
    }
  }

  fs.mkdirSync(dest, { recursive: true });
  execFileSync(
    process.platform === "win32" ? "robocopy" : "cp",
    process.platform === "win32"
      ? [src, dest, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np"]
      : ["-a", src + "/.", dest + "/"],
    { stdio: "inherit" }
  );
  console.log("Mirrored Website Presets -> website-presets");
}

main();
