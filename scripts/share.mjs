// Serve the production build from this PC and publish it on the internet through
// Tailscale Funnel, at a fixed address like https://stapl.<tailnet>.ts.net.
//
//   npm run share
//
// Needs Tailscale installed and signed in (free personal account). The first run
// prints a link to switch Funnel on for your account; run the command again after.

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 3000);
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

const log = (msg = "") => console.log(msg);
const fail = (msg) => {
  console.error(`\n${msg}\n`);
  process.exit(1);
};

/* ---------- find tailscale ---------- */
function findTailscale() {
  const candidates = ["tailscale", "C:\\Program Files\\Tailscale\\tailscale.exe", "/Applications/Tailscale.app/Contents/MacOS/Tailscale"];
  for (const c of candidates) {
    const r = spawnSync(c, ["version"], { stdio: "ignore" });
    if (r.status === 0) return c;
  }
  return null;
}

const tailscale = findTailscale();
if (!tailscale) {
  fail(
    [
      "Tailscale isn't installed yet. It's free:",
      "",
      "  winget install tailscale.tailscale",
      "",
      "Then open Tailscale from the Start menu, sign in, and run `npm run share` again.",
    ].join("\n"),
  );
}

/* ---------- signed in? ---------- */
const status = spawnSync(tailscale, ["status", "--json"], { encoding: "utf8" });
let info = null;
try {
  info = JSON.parse(status.stdout || "{}");
} catch {
  info = null;
}
if (!info || info.BackendState !== "Running") {
  fail("Tailscale is installed but not signed in. Open Tailscale from the Start menu, sign in, then run `npm run share` again.");
}
const dnsName = (info.Self && info.Self.DNSName ? info.Self.DNSName : "").replace(/\.$/, "");
const publicUrl = dnsName ? `https://${dnsName}/` : null;

/* ---------- port free? ---------- */
const portBusy = await new Promise((resolve) => {
  const s = net.connect({ host: "127.0.0.1", port: PORT });
  s.once("connect", () => {
    s.destroy();
    resolve(true);
  });
  s.once("error", () => resolve(false));
});
if (portBusy) fail(`Port ${PORT} is already in use. Is \`npm run dev\` still running? Stop it first, or set PORT to another number.`);

/* ---------- build if needed ---------- */
if (!existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
  log("No production build yet. Building once (this takes a minute)...\n");
  const b = spawnSync(process.execPath, [NEXT_BIN, "build"], { cwd: ROOT, stdio: "inherit" });
  if (b.status !== 0) fail("The build failed. Fix the errors above and run `npm run share` again.");
}

/* ---------- start the server ---------- */
log(`Starting the portal on http://127.0.0.1:${PORT} ...`);
const server = spawn(process.execPath, [NEXT_BIN, "start", "-H", "127.0.0.1", "-p", String(PORT)], { cwd: ROOT, stdio: ["ignore", "pipe", "inherit"] });
server.stdout.on("data", (d) => process.stdout.write(d));

const ready = await new Promise((resolve) => {
  const started = Date.now();
  const tick = () => {
    if (server.exitCode != null) return resolve(false);
    if (Date.now() - started > 60000) return resolve(false);
    const s = net.connect({ host: "127.0.0.1", port: PORT });
    s.once("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.once("error", () => setTimeout(tick, 300));
  };
  tick();
});
if (!ready) {
  server.kill();
  fail("The server didn't start. See the messages above.");
}

/* ---------- open the funnel ---------- */
log("");
log("Opening the tunnel...");
if (publicUrl) {
  log(`Your address: ${publicUrl}`);
  log("Share that link. It stays the same every time.");
}
log("Keep this window open and don't let the PC sleep. Press Ctrl+C to stop sharing.\n");

const funnel = spawn(tailscale, ["funnel", String(PORT)], { stdio: ["ignore", "pipe", "pipe"] });
funnel.stdout.on("data", (d) => process.stdout.write(d));
funnel.stderr.on("data", (d) => process.stderr.write(d));

function shutdown(code = 0) {
  try {
    funnel.kill();
  } catch {}
  try {
    server.kill();
  } catch {}
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
server.on("exit", (code) => {
  log("\nThe server stopped.");
  shutdown(code ?? 0);
});
funnel.on("exit", (code) => {
  if (code !== 0) {
    log(
      [
        "",
        "Tailscale couldn't open the tunnel. Usually one of these:",
        "  • Funnel isn't switched on for your account yet: open the link printed above, approve it, then run `npm run share` again.",
        "  • HTTPS certificates aren't enabled: in the Tailscale admin console go to DNS and turn on HTTPS Certificates.",
      ].join("\n"),
    );
  }
  shutdown(code ?? 0);
});
