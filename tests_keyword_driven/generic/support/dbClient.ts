// location: tests_keyword_driven/generic/support/dbClient.ts
//
// One real MySQL connection per worker, not per test - lazily created on
// first query and reused for the rest of this worker's run (mirrors
// apiClient.ts's own single-cached-context pattern; each Playwright worker
// is its own Node process, so a module-level singleton already gives you
// "per worker" for free). Used by database.steps.ts ("I db ...") for direct
// database access - the alternative to test-automation-api.steps.ts's
// ("I api ...") HTTP calls to TestAutomationController, for when you don't
// have (or don't want) a dev adding a test-automation endpoint to the app
// at all. Reads _DB_HOST/_DB_PORT/_DB_NAME/_DB_USER/_DB_PASSWORD from
// whichever env file was loaded, same vars the installer's config/local.env
// template already lays down.

import mysql, { Connection } from 'mysql2/promise';

let cachedConnection: Connection | null = null;

export async function getDbConnection(): Promise<Connection> {
  if (cachedConnection) return cachedConnection;
  cachedConnection = await mysql.createConnection({
    host: process.env._DB_HOST,
    port: Number(process.env._DB_PORT ?? 3306),
    database: process.env._DB_NAME,
    user: process.env._DB_USER,
    password: process.env._DB_PASSWORD,
  });
  return cachedConnection;
}

// Table/column names can't go through a bound `?` placeholder (only values
// can) - they're interpolated directly into the SQL string, so this is the
// actual SQL-injection guard for them. Mirrors
// TestAutomationController::isSafeIdentifier() exactly - direct DB access
// needs the same protection that endpoint already has, not a weaker one.
export function assertSafeIdentifier(name: string, what: string): void {
  if (typeof name !== 'string' || !/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`${what} "${name}" is not a safe identifier (letters, numbers, underscore only).`);
  }
}

export async function dbQuery<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const conn = await getDbConnection();
  const [rows] = await conn.query(sql, params);
  return rows as T[];
}

export async function dbExecute(sql: string, params: unknown[] = []): Promise<void> {
  const conn = await getDbConnection();
  await conn.query(sql, params);
}

// Checked in this order, first match wins - "updated" columns before
// "created" ones, since "newest" more often means "most recently touched"
// than "most recently inserted", id (an auto-increment PK) as a last
// resort before giving up entirely. These never come from user input (only
// ever one of the literals below), so they're safe to interpolate directly
// unlike a caller-supplied column name.
const ORDER_COLUMN_PRIORITY = ['updated_at', 'updated', 'modified_at', 'modified', 'created_at', 'created', 'id'];

// "Get newest" needs an ORDER BY, but not every table has updated_at -
// rather than hardcode one column name and fail on any table that doesn't
// have it, check which of a sensible fallback chain actually exists on
// THIS table (one extra query, cheap relative to the save it avoids
// debugging), and order by whichever is found first. Returns null if the
// table has none of them, meaning "get newest" falls back to no ordering
// at all rather than throwing - an arbitrary row beats a hard failure.
export async function resolveOrderColumn(table: string): Promise<string | null> {
  const rows = await dbQuery<{ COLUMN_NAME: string }>(
    'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table],
  );
  const existingColumns = new Set(rows.map((r) => r.COLUMN_NAME));
  return ORDER_COLUMN_PRIORITY.find((candidate) => existingColumns.has(candidate)) ?? null;
}
