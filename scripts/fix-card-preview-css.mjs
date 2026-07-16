import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "template-previews");

const CSS = `    html.is-card-preview .toggles { display: none !important; }
    html.is-card-preview .nav { position: relative; }
    /* Keep the full real page in card thumbs — no crop / fake pan */
    html.is-card-preview,
    html.is-card-preview body {
      overflow: visible;
      height: auto;
      min-height: 100%;
      animation: none !important;
      transform: none !important;
    }
    html.is-card-preview .hero {
      min-height: 88vh;
    }
`;

const patterns = [
  /html\.is-card-preview[\s\S]*?@keyframes ms-preview-float \{[\s\S]*?\}\s*/m,
  /html\.is-card-preview[\s\S]*?html\.is-card-preview \.hero \{[\s\S]*?\}\s*/m,
  /html\.is-card-preview,\s*html\.is-card-preview body \{ overflow: hidden; \}/,
];

for (const dir of fs.readdirSync(ROOT)) {
  const file = path.join(ROOT, dir, "index.html");
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, "utf8");
  let next = html;
  for (const re of patterns) {
    if (re.test(next)) {
      next = next.replace(re, CSS);
      break;
    }
  }
  // Also strip leftover keyframes if still present
  next = next.replace(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?@keyframes ms-preview-float \{[\s\S]*?\}\s*\}/m, "");
  next = next.replace(/@keyframes ms-preview-pan \{[\s\S]*?\}\s*/g, "");
  next = next.replace(/@keyframes ms-preview-rise \{[\s\S]*?\}\s*/g, "");
  next = next.replace(/@keyframes ms-preview-float \{[\s\S]*?\}\s*/g, "");
  if (next !== html) {
    fs.writeFileSync(file, next, "utf8");
    console.log("updated", dir);
  } else {
    console.log("unchanged", dir);
  }
}
