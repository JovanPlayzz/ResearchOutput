// Copies a local portal (data/portal.db + uploads/) into the hosted database and file store.
//
//   node scripts/import-to-turso.mjs            # uses .env.local for the connection settings
//   node scripts/import-to-turso.mjs --force    # import even if the hosted database already has people in it
//
// Safe to run again: rows are upserted by id, files are overwritten by name.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { put } from "@vercel/blob";

const ROOT = process.cwd();
const LOCAL_FILE = process.env.DATABASE_FILE ?? path.join(ROOT, "data", "portal.db");
const UPLOADS = path.join(ROOT, "uploads");
const force = process.argv.includes("--force");

// .env.local is what `vercel env pull` writes; only Next.js loads it automatically.
const envFile = path.join(ROOT, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("TURSO_DATABASE_URL is not set. Run `vercel env pull .env.local --yes` first.");
  process.exit(1);
}
if (!fs.existsSync(LOCAL_FILE)) {
  console.error(`No local database at ${LOCAL_FILE}.`);
  process.exit(1);
}

// Parents before children, so foreign keys are satisfied as rows arrive.
const TABLES = ["schools", "sections", "users", "classrooms", "schedule_slots", "materials", "announcements", "announcement_reads", "events", "assignments", "submissions", "todos"];

const local = createClient({ url: `file:${LOCAL_FILE.replace(/\\/g, "/")}` });
const remote = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

console.log("Bringing the hosted database schema up to date...");
await migrate(drizzle(remote), { migrationsFolder: path.join(ROOT, "drizzle") });

const existing = Number((await remote.execute("select count(*) as n from users")).rows[0].n);
if (existing > 0 && !force) {
  console.error(`The hosted database already has ${existing} people in it. Re-run with --force to upsert on top of them.`);
  process.exit(1);
}

for (const table of TABLES) {
  const cols = (await local.execute(`pragma table_info(${table})`)).rows.map((r) => String(r.name));
  const rows = (await local.execute(`select * from ${table}`)).rows;
  const sql = `insert or replace into ${table} (${cols.map((c) => `"${c}"`).join(", ")}) values (${cols.map(() => "?").join(", ")})`;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200).map((r) => ({ sql, args: cols.map((c) => (r[c] === undefined ? null : r[c])) }));
    if (chunk.length) await remote.batch(chunk, "write");
  }
  const after = Number((await remote.execute(`select count(*) as n from ${table}`)).rows[0].n);
  console.log(`${table.padEnd(19)} local ${String(rows.length).padStart(4)}   hosted ${String(after).padStart(4)}${after < rows.length ? "   <-- fewer than expected" : ""}`);
}

if (process.env.BLOB_READ_WRITE_TOKEN && fs.existsSync(UPLOADS)) {
  const types = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", pdf: "application/pdf", txt: "text/plain" };
  const walk = (dir, out = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else out.push(p);
    }
    return out;
  };
  const files = walk(UPLOADS);
  let n = 0;
  for (const file of files) {
    const key = path.relative(UPLOADS, file).split(path.sep).join("/");
    const ext = path.extname(file).slice(1).toLowerCase();
    await put(key, fs.readFileSync(file), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: types[ext] ?? "application/octet-stream" });
    n++;
  }
  console.log(`uploads             ${n} file(s) copied to Vercel Blob`);
} else {
  console.log("uploads             skipped (no BLOB_READ_WRITE_TOKEN or no uploads/ folder)");
}

local.close();
remote.close();
console.log("Done.");
