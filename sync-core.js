const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const CORE_DIR = path.join(__dirname, "_core");
const THEME_ROOT = __dirname;
const IS_UPDATE = process.argv.includes("--update");

const SKIP = [
  "modules.json",
  ".gitignore",
  "build-theme.js",
  "style.css",
  "watch-core.js",
  "node_modules",
  ".git",
  "_core",
  ".prettierrc",
  ".prettierignore",
  ".gitmodules",
];
const SKIP_DIRS = ["assets/img"];
const SKIP_PAGES = ["page-alloy-selector.php", "page-kharide-foolad.php"];

function run(cmd) {
  console.log("\n$ " + cmd);
  try {
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch (e) {
    return false;
  }
}

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

if (IS_UPDATE) {
  console.log("[sync-core] 1/4 pull latest core from GitHub...");
  run("git submodule update --remote _core");
  console.log("[sync-core] 2/4 put _core on master (avoid detached HEAD)...");
  run("git -C _core checkout -B master");
}

sync();

if (IS_UPDATE) {
  console.log("[sync-core] 3/4 commit new core pointer...");
  run("git add _core sync-core.js");
  if (!run('git commit -m "update core"')) {
    console.log("[sync-core] (nothing to commit)");
  }
  console.log("[sync-core] 4/4 push to GitHub...");
  run("git push");
  console.log("\n[sync-core] update DONE");
}