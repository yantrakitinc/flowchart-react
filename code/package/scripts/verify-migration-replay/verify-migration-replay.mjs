#!/usr/bin/env node
// Migration-replay gate. Proves the `drizzle/*.sql` migration chain applies
// cleanly, in filename order, against a FRESH database — catching ordering bugs,
// syntax errors, and "works on my already-migrated DB but not from scratch"
// drift. These services use real-Postgres SQL migrations (RLS, SECURITY DEFINER
// functions, GRANTs to cluster-global non-owner roles) applied via psql — not an
// in-process pglite loader — so replay runs against a throwaway database on the
// SAME cluster (the roles it GRANTs to already exist cluster-wide).
//
// Pure Node + the `postgres` devDependency. Run as `node <script>` (no tsx).
// Reads DATABASE_URL_OWNER from .env.local (the owner/migration pool, which has
// CREATEDB). Creates `<db>_replay_<pid>`, applies every migration, drops it.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// <ROOT>/scripts/verify-migration-replay/verify-migration-replay.mjs → ../.. = <ROOT>
const ROOT = new URL("../..", import.meta.url).pathname;
const DRIZZLE_DIR = join(ROOT, "drizzle");

function ownerUrl() {
  if (process.env.DATABASE_URL_OWNER) return process.env.DATABASE_URL_OWNER;
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return null;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    if (t.slice(0, i).trim() === "DATABASE_URL_OWNER") return t.slice(i + 1).trim();
  }
  return null;
}

function sqlFiles() {
  if (!existsSync(DRIZZLE_DIR)) return [];
  return readdirSync(DRIZZLE_DIR).filter((f) => f.endsWith(".sql")).sort();
}

async function main() {
  const files = sqlFiles();
  if (files.length === 0) {
    console.error("verify-migration-replay: no drizzle/*.sql migrations found — refusing to claim success on an empty replay");
    process.exit(1);
  }
  const url = ownerUrl();
  if (!url) {
    console.error("verify-migration-replay: DATABASE_URL_OWNER not set (env or .env.local) — cannot run replay");
    process.exit(1);
  }

  let postgres;
  try { postgres = require("postgres"); }
  catch (err) {
    console.error("verify-migration-replay: failed to import `postgres`");
    console.error(`  ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  // maintenance connection on the same cluster (the default `postgres` db) to
  // CREATE/DROP the throwaway replay database.
  const maintUrl = new URL(url);
  maintUrl.pathname = "/postgres";
  const tmpDb = `replay_${String(process.pid)}_${String(Date.now()).slice(-6)}`;
  const replayUrl = new URL(url);
  replayUrl.pathname = `/${tmpDb}`;

  const admin = postgres(maintUrl.toString(), { max: 1 });
  let exitCode = 0;
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS ${tmpDb}`);
    await admin.unsafe(`CREATE DATABASE ${tmpDb}`);
    const db = postgres(replayUrl.toString(), { max: 1 });
    try {
      let n = 0;
      for (const f of files) {
        const sqlText = readFileSync(join(DRIZZLE_DIR, f), "utf8");
        try {
          await db.unsafe(sqlText);
          n += 1;
        } catch (err) {
          exitCode = 1;
          console.error(`verify-migration-replay: migration ${f} failed on a fresh database`);
          console.error(`  ${err instanceof Error ? err.message : String(err)}`);
          break;
        }
      }
      if (exitCode === 0) {
        console.log(`verify-migration-replay: OK (${String(n)} migration(s) applied to a fresh database)`);
      }
    } finally {
      await db.end({ timeout: 5 });
    }
  } catch (err) {
    exitCode = 1;
    console.error("verify-migration-replay: replay harness error");
    console.error(`  ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    try { await admin.unsafe(`DROP DATABASE IF EXISTS ${tmpDb}`); } catch { /* best-effort */ }
    await admin.end({ timeout: 5 });
  }
  process.exit(exitCode);
}

main();
