const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const AdmZip = require("adm-zip");
const THEME_ROOT = __dirname;
const STYLE_CSS = path.join(THEME_ROOT, "style.css");
const MODULES_JSON = path.join(THEME_ROOT, "modules.json");
const EXCLUDE_DIRS = [
  "node_modules",
  ".git",
  ".vscode",
  "vendor",
  "_core",
  "assets/js/core",
  "assets/js/dist",
  "assets/css/base",
  "assets/css/components",
  "assets/css/layout",
  "assets/css/utilities",
];
const EXCLUDE_FILES = [
  "build-js.js",
  "build-theme.js",
  "build.php",
  "sync-core.js",
  "package.json",
  "package-lock.json",
  "composer.json",
  "composer.lock",
  "postcss.config.js",
  "tailwind.config.js",
  "modules.json",
  "assets/css/input.css",
  "assets/js/main.js",
  "assets/js/core.js",
  ".gitignore",
  ".gitmodules",
  ".prettierrc",
  ".prettierignore",
];
function getActiveModules() {
  try {
    const cfg = JSON.parse(fs.readFileSync(MODULES_JSON, "utf8"));
    return Array.isArray(cfg.modules) ? cfg.modules : [];
  } catch (e) {
    return [];
  }
}
function bumpVersion() {
  let css = fs.readFileSync(STYLE_CSS, "utf8");
  const match = css.match(/Version:\s*(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) {
    console.error("[build-theme] Version not found in style.css");
    process.exit(1);
  }
  const v = `${match[1]}.${match[2]}.${match[3] ? parseInt(match[3]) + 1 : 1}`;
  fs.writeFileSync(
    STYLE_CSS,
    css.replace(/Version:\s*[\d.]+/, `Version: ${v}`),
    "utf8",
  );
  return v;
}
function walk(dir, base, zip, activeModules) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.some((d) => rel === d || rel.startsWith(d + "/"))) continue;
      if (rel === "languages" && !activeModules.includes("Language")) continue;
      if (rel.startsWith("modules/") && !rel.substring("modules/".length).includes("/")) {
        if (!activeModules.includes(entry.name)) continue;
      }
      walk(full, base, zip, activeModules);
    } else {
      if (EXCLUDE_FILES.includes(rel)) continue;
      if (rel.endsWith(".zip")) continue;
      if (rel.startsWith("modules/") && entry.name === "main.js") continue;
      zip.addLocalFile(full, path.dirname(rel));
    }
  }
}
function build() {
  console.log("[build-theme] 0/4 syncing core...");
  execSync("node sync-core.js", { cwd: THEME_ROOT, stdio: "inherit" });
  const activeModules = getActiveModules();
  console.log(`[build-theme] active modules: ${activeModules.join(", ") || "(none)"}`);
  console.log("[build-theme] 1/4 building JS...");
  execSync("node build-js.js", { cwd: THEME_ROOT, stdio: "inherit" });
  console.log("[build-theme] 2/4 building CSS...");
  execSync(
    "npx tailwindcss -i ./assets/css/input.css -o ./assets/css/tailwind.css --minify",
    { cwd: THEME_ROOT, stdio: "inherit" },
  );
  const version = bumpVersion();
  const zipName = `GS2DT-${version}.zip`;
  const zipPath = path.join(THEME_ROOT, zipName);
  console.log(`[build-theme] 3/4 creating ${zipName}...`);
  const zip = new AdmZip();
  walk(THEME_ROOT, THEME_ROOT, zip, activeModules);
  zip.writeZip(zipPath);
  const stats = fs.statSync(zipPath);
  console.log(`[build-theme] done: ${zipName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}
build();