import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";

export type Db = LibSQLDatabase<typeof schema> & { $client: Client };

/**
 * One database driver for both places the portal runs:
 *  - on a PC: a SQLite file at data/portal.db (or DATABASE_FILE)
 *  - on Vercel: a hosted Turso database, via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
 */
const REMOTE_URL = process.env.TURSO_DATABASE_URL;
const LOCAL_FILE = process.env.DATABASE_FILE ?? path.join(process.cwd(), "data", "portal.db");
const MIGRATIONS = path.join(process.cwd(), "drizzle");

declare global {
  var __portal: { db: Db; ready: Promise<void> } | undefined;
}

function create(): Db {
  if (REMOTE_URL) {
    return drizzle(createClient({ url: REMOTE_URL, authToken: process.env.TURSO_AUTH_TOKEN }), { schema });
  }
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  return drizzle(createClient({ url: `file:${LOCAL_FILE.replace(/\\/g, "/")}` }), { schema });
}

/** Applies pending migrations, then seeds the demo school when the database is empty. */
async function prepare(database: Db): Promise<void> {
  if (!REMOTE_URL) {
    await database.$client.execute("PRAGMA journal_mode = WAL");
    await database.$client.execute("PRAGMA foreign_keys = ON");
  }
  try {
    await migrate(database, { migrationsFolder: MIGRATIONS });
  } catch (err) {
    throw new Error(
      `[db] Could not bring the database up to date: ${(err as Error).message}. ` +
        (REMOTE_URL ? "Check the Turso connection settings." : "If this is a throwaway local database, run `npm run db:reset`."),
    );
  }
  // The hosted database is filled by importing real data, not by the demo seed, unless asked.
  if (!REMOTE_URL || process.env.SEED_DEMO === "1") await seedIfEmpty(database);
}

// Reuse one connection across hot reloads in development.
const shared = globalThis.__portal ?? (() => {
  const database = create();
  return { db: database, ready: prepare(database) };
})();
if (process.env.NODE_ENV !== "production") globalThis.__portal = shared;

export const db: Db = shared.db;
/** Resolves once migrations (and the demo seed, if any) have run. Await it before the first query of a request. */
export const ready: Promise<void> = shared.ready;

export * from "./schema";
