/**
 * Resilient Prisma migration script for CI/CD environments (e.g. Vercel).
 *
 * 1. Attempts `prisma migrate deploy`.
 * 2. If it fails (e.g. P3009 – failed migrations recorded in the database),
 *    resolves every failed migration as rolled-back, pushes the schema
 *    directly with `prisma db push`, then marks every migration as applied
 *    so future deploys work normally.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function run(args) {
  try {
    execFileSync("npx", args, { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

// ── 1. Happy path ──────────────────────────────────────────────
if (run(["prisma", "migrate", "deploy"])) {
  process.exit(0);
}

console.log(
  "\n⚠️  prisma migrate deploy failed (likely P3009). Attempting recovery…\n"
);

// ── 2. Discover migration directories ──────────────────────────
const migrationsDir = join(process.cwd(), "prisma", "migrations");
const migrations = readdirSync(migrationsDir).filter(
  (f) =>
    f !== "migration_lock.toml" &&
    statSync(join(migrationsDir, f)).isDirectory()
);

// ── 3. Mark every failed migration as rolled-back ──────────────
for (const m of migrations) {
  run(["prisma", "migrate", "resolve", "--rolled-back", m]);
}

// ── 4. Push schema directly (idempotent) ───────────────────────
if (!run(["prisma", "db", "push", "--skip-generate"])) {
  console.error("❌  prisma db push failed");
  process.exit(1);
}

// ── 5. Mark every migration as applied ─────────────────────────
for (const m of migrations) {
  run(["prisma", "migrate", "resolve", "--applied", m]);
}

console.log("✅  Database synchronized and migrations resolved");
