const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = __dirname;
const CORE_DIR = path.join(ROOT, "_core");

let timer = null;
let running = false;
let pendingCss = false;
let pendingJs = false;

function run(cmd) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: "inherit" });
  } catch (e) {
    console.log("[watch-core] command failed (ignored): " + cmd);
  }
}

function flush() {
  if (running) {
    timer = setTimeout(flush, 300);
    return;
  }
  running = true;
  const now = new Date().toLocaleTimeString();
  console.log("\n[watch-core] " + now + " change detected -> syncing...");
  run("node sync-core.js");
  if (pendingCss) {
    console.log("[watch-core] CSS changed -> building tailwind.css ...");
    run("npx tailwindcss -i ./assets/css/input.css -o ./assets/css/tailwind.css");
  }
  if (pendingJs) {
    console.log("[watch-core] JS changed -> building main.min.js ...");
    run("node build-js.js");
  }
  pendingCss = false;
  pendingJs = false;
  running = false;
}

function schedule(filename) {
  const f = String(filename || "").replace(/\\/g, "/");
  if (f.includes("/.git/") || f.startsWith(".git/") || f.includes("/node_modules/")) return;
  if (f.endsWith(".css") || f.includes("/assets/css/")) pendingCss = true;
  if (f.endsWith(".js") && (f.includes("/modules/") || f.includes("/assets/js/"))) pendingJs = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, 300);
}

if (!fs.existsSync(CORE_DIR)) {
  console.error("[watch-core] _core/ not found. Run: git submodule update --init");
  process.exit(1);
}

try {
  fs.watch(CORE_DIR, { recursive: true }, function (eventType, filename) {
    schedule(filename);
  });
} catch (e) {
  console.error("[watch-core] fs.watch failed: " + e.message);
  process.exit(1);
}

console.log("[watch-core] watching _core/  (press Ctrl+C to stop)");
console.log("[watch-core] every SAVE inside _core auto-syncs to the project root.");
console.log("[watch-core] CSS/JS changes also rebuild automatically.");
console.log("[watch-core] NOTE: this does NOT commit or push. Commit when you are happy.");