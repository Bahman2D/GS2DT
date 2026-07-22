const fs = require("fs");
const path = require("path");
const CORE_DIR = path.join(__dirname, "_core");
const THEME_ROOT = __dirname;
const SKIP = [
  "modules.json",
  "build-theme.js",
  "style.css",
  "sync-core.js",
  "node_modules",
  ".git",
  "_core",
  ".prettierrc",
  ".prettierignore",
  ".gitmodules",
];
const SKIP_DIRS = ["assets/img"];
const SKIP_PAGES = ["page-alloy-selector.php", "page-kharide-foolad.php"];
function sync() {
  if (!fs.existsSync(CORE_DIR)) {
    console.error("[sync-core] _core/ not found. Run: git submodule update --init");
    process.exit(1);
  }
  let count = 0;
  function copyDir(src, dest, isRoot) {
    if (!isRoot && SKIP.includes(path.basename(src))) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, entry.name);
      const d = path.join(dest, entry.name);
      if (SKIP.includes(entry.name)) continue;
      if (SKIP_PAGES.includes(entry.name)) continue;
      if (entry.name.endsWith(".zip")) continue;
      if (entry.name === "main.min.js" || entry.name === "tailwind.css") continue;
      if (entry.isDirectory()) {
        const childRel = path.relative(CORE_DIR, s).replace(/\\/g, "/");
        if (SKIP_DIRS.includes(childRel)) continue;
        copyDir(s, d, false);
      } else {
        fs.copyFileSync(s, d);
        count++;
      }
    }
  }
  copyDir(CORE_DIR, THEME_ROOT, true);
  console.log(`[sync-core] ${count} files synced from _core/`);
}
sync();