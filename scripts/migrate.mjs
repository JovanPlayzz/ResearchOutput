// Brings the hosted database up to date. Runs before `next build` on Vercel.
// Without TURSO_DATABASE_URL it does nothing: a local SQLite file migrates itself at startup.
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.log("[migrate] No hosted database configured; skipping.");
  process.exit(0);
}
const db = drizzle(createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN }));
await migrate(db, { migrationsFolder: "drizzle" });
console.log("[migrate] Hosted database is up to date.");
