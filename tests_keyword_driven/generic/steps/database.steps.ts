// location: tests_keyword_driven/generic/steps/database.steps.ts
//
// Direct-database equivalents of test-automation-api.steps.ts's "I api ..."
// steps - same verbs/semantics, "I db ..." instead of "I api ...", going
// straight to MySQL (see dbClient.ts) instead of through an HTTP call to
// TestAutomationController. Use this family when you don't have (or don't
// want) a dev adding a test-automation endpoint to the app at all - just
// real DB credentials in your env file (_DB_HOST/_DB_PORT/_DB_NAME/_DB_USER/
// _DB_PASSWORD).
//
// Every step below is a thin adapter: resolve the Gherkin strings, call the
// plain exported function declared directly under it, store the result.
// The function is what's reusable from another step file directly.

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { dbQuery, dbExecute, assertSafeIdentifier, resolveOrderColumn } from '../support/dbClient';

const { When } = createBdd(test);

// When I db count "ds_core_users" rows where column "email" like "mike@test.com" into variable "userCount"
When(
  'I db count {string} rows where column {string} like {string} into variable {string}',
  async ({ vars }, tableName, column, value, varName) => {
    const count = await dbCountRowsLike(resolveVars(tableName, vars), column, resolveVars(value, vars));
    vars.set(varName, String(count));
  },
);

export async function dbCountRowsLike(table: string, column: string, value: string): Promise<number> {
  assertSafeIdentifier(table, 'table_name');
  assertSafeIdentifier(column, 'column');
  const rows = await dbQuery<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM \`${table}\` WHERE \`${column}\` LIKE ?`,
    [`%${value}%`],
  );
  return rows[0]?.cnt ?? 0;
}

// When I db count "ds_core_users" rows where column "email" is "mike@test.com" into variable "userCount"
When(
  'I db count {string} rows where column {string} is {string} into variable {string}',
  async ({ vars }, tableName, column, value, varName) => {
    const count = await dbCountRowsIs(resolveVars(tableName, vars), column, resolveVars(value, vars));
    vars.set(varName, String(count));
  },
);

export async function dbCountRowsIs(table: string, column: string, value: string): Promise<number> {
  assertSafeIdentifier(table, 'table_name');
  assertSafeIdentifier(column, 'column');
  const rows = await dbQuery<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM \`${table}\` WHERE \`${column}\` = ?`,
    [value],
  );
  return rows[0]?.cnt ?? 0;
}

// When I db get newest "ds_core_users" column "user_id" where column "username" is "automationUser1" into variable "userId"
When(
  'I db get newest {string} column {string} where column {string} is {string} into variable {string}',
  async ({ vars }, tableName, colForExtraction, column, value, varName) => {
    const extracted = await dbGetNewestColumnIs(resolveVars(tableName, vars), colForExtraction, column, resolveVars(value, vars));
    vars.set(varName, extracted);
  },
);

export async function dbGetNewestColumnIs(table: string, colForExtraction: string, column: string, value: string): Promise<string> {
  assertSafeIdentifier(table, 'table_name');
  assertSafeIdentifier(column, 'column');
  assertSafeIdentifier(colForExtraction, 'column');
  const orderColumn = await resolveOrderColumn(table);
  const orderClause = orderColumn ? ` ORDER BY \`${orderColumn}\` DESC` : '';
  const rows = await dbQuery<Record<string, unknown>>(
    `SELECT * FROM \`${table}\` WHERE \`${column}\` = ?${orderClause} LIMIT 1`,
    [value],
  );
  const row = rows[0];
  if (!row || !(colForExtraction in row)) {
    throw new Error(`No row found (or missing column "${colForExtraction}") for ${table} where ${column} is ${value}`);
  }
  return String(row[colForExtraction]);
}

// When I db get newest "ds_core_users" column "user_id" where column "email" like "bobsemail@example.com" into variable "userId"
When(
  'I db get newest {string} column {string} where column {string} like {string} into variable {string}',
  async ({ vars }, tableName, colForExtraction, column, value, varName) => {
    const extracted = await dbGetNewestColumnLike(resolveVars(tableName, vars), colForExtraction, column, resolveVars(value, vars));
    vars.set(varName, extracted);
  },
);

export async function dbGetNewestColumnLike(table: string, colForExtraction: string, column: string, value: string): Promise<string> {
  assertSafeIdentifier(table, 'table_name');
  assertSafeIdentifier(column, 'column');
  assertSafeIdentifier(colForExtraction, 'column');
  const orderColumn = await resolveOrderColumn(table);
  const orderClause = orderColumn ? ` ORDER BY \`${orderColumn}\` DESC` : '';
  const rows = await dbQuery<Record<string, unknown>>(
    `SELECT * FROM \`${table}\` WHERE \`${column}\` LIKE ?${orderClause} LIMIT 1`,
    [`%${value}%`],
  );
  const row = rows[0];
  if (!row || !(colForExtraction in row)) {
    throw new Error(`No row found (or missing column "${colForExtraction}") for ${table} where ${column} like ${value}`);
  }
  return String(row[colForExtraction]);
}

// When I db get newest row "ds_core_users" where column "username" is "automationUser1" into variable "row"
//
// Whole-row alternative to "I db get newest ... column ... where ...": one
// query gets every column instead of one query per column you want.
// "I spit +var(row)" to see the raw JSON, or use it directly -
// resolveVarField() (see vars.ts, used by every "I should see variable ..."
// step) already JSON-parses a variable and walks a dotted path the moment
// the name itself contains a dot, so "I should see variable "row.email"
// contains ..." and "I set variable "x" from field "email" of variable
// "row"" both just work on this, no extra wiring needed.
When(
  'I db get newest row {string} where column {string} is {string} into variable {string}',
  async ({ vars }, tableName, column, value, varName) => {
    const row = await dbGetNewestRowIs(resolveVars(tableName, vars), column, resolveVars(value, vars));
    vars.set(varName, JSON.stringify(row));
  },
);

export async function dbGetNewestRowIs(table: string, column: string, value: string): Promise<Record<string, unknown>> {
  assertSafeIdentifier(table, 'table_name');
  assertSafeIdentifier(column, 'column');
  const orderColumn = await resolveOrderColumn(table);
  const orderClause = orderColumn ? ` ORDER BY \`${orderColumn}\` DESC` : '';
  const rows = await dbQuery<Record<string, unknown>>(
    `SELECT * FROM \`${table}\` WHERE \`${column}\` = ?${orderClause} LIMIT 1`,
    [value],
  );
  const row = rows[0];
  if (!row) {
    throw new Error(`No row found for ${table} where ${column} is ${value}`);
  }
  return row;
}

// When I db get newest row "ds_core_users" where column "email" like "bobsemail@example.com" into variable "row"
When(
  'I db get newest row {string} where column {string} like {string} into variable {string}',
  async ({ vars }, tableName, column, value, varName) => {
    const row = await dbGetNewestRowLike(resolveVars(tableName, vars), column, resolveVars(value, vars));
    vars.set(varName, JSON.stringify(row));
  },
);

export async function dbGetNewestRowLike(table: string, column: string, value: string): Promise<Record<string, unknown>> {
  assertSafeIdentifier(table, 'table_name');
  assertSafeIdentifier(column, 'column');
  const orderColumn = await resolveOrderColumn(table);
  const orderClause = orderColumn ? ` ORDER BY \`${orderColumn}\` DESC` : '';
  const rows = await dbQuery<Record<string, unknown>>(
    `SELECT * FROM \`${table}\` WHERE \`${column}\` LIKE ?${orderClause} LIMIT 1`,
    [`%${value}%`],
  );
  const row = rows[0];
  if (!row) {
    throw new Error(`No row found for ${table} where ${column} like ${value}`);
  }
  return row;
}

// When I db delete row "ds_core_users" where "email" is "mike+auto@test.com"
When(
  'I db delete row {string} where {string} is {string}',
  async ({ vars }, tableName, column, value) => {
    await dbDeleteRow(resolveVars(tableName, vars), column, resolveVars(value, vars));
  },
);

export async function dbDeleteRow(table: string, column: string, value: string): Promise<void> {
  assertSafeIdentifier(table, 'table_name');
  assertSafeIdentifier(column, 'column');
  await dbExecute(`DELETE FROM \`${table}\` WHERE \`${column}\` = ? LIMIT 1`, [value]);
}

// When I db update table "ds_core_users" column "email_verified_at" where "user_id" is "+var(userId)" to value "2026-09-24 10:00:00"
When(
  'I db update table {string} column {string} where {string} is {string} to value {string}',
  async ({ vars }, tableName, columnToUpdate, whereColumn, whereValue, toValue) => {
    await dbUpdateTable(resolveVars(tableName, vars), columnToUpdate, whereColumn, resolveVars(whereValue, vars), resolveVars(toValue, vars));
  },
);

export async function dbUpdateTable(table: string, columnToUpdate: string, whereColumn: string, whereValue: string, toValue: string): Promise<void> {
  assertSafeIdentifier(table, 'table_name');
  assertSafeIdentifier(columnToUpdate, 'column');
  assertSafeIdentifier(whereColumn, 'column');
  await dbExecute(
    `UPDATE \`${table}\` SET \`${columnToUpdate}\` = ? WHERE \`${whereColumn}\` = ? LIMIT 1`,
    [toValue, whereValue],
  );
}
