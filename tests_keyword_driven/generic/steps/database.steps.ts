// location: tests_keyword_driven/generic/steps/database.steps.ts
//
// Direct-database equivalents of test-automation-api.steps.ts's "I api ..."
// steps - same verbs/semantics, "I db ..." instead of "I api ...", going
// straight to MySQL (see dbClient.ts) instead of through an HTTP call to
// TestAutomationController. Use this family when you don't have (or don't
// want) a dev adding a test-automation endpoint to the app at all - just
// real DB credentials in your env file (_DB_HOST/_DB_PORT/_DB_NAME/_DB_USER/
// _DB_PASSWORD).

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { dbQuery, dbExecute, assertSafeIdentifier, resolveOrderColumn } from '../support/dbClient';

const { When } = createBdd(test);

// When I db count "ds_core_users" rows where column "email" like "mike@test.com" into variable "userCount"
When(
  'I db count {string} rows where column {string} like {string} into variable {string}',
  async ({ vars }, tableName, column, value, varName) => {
    const table = resolveVars(tableName, vars);
    assertSafeIdentifier(table, 'table_name');
    assertSafeIdentifier(column, 'column');
    const rows = await dbQuery<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM \`${table}\` WHERE \`${column}\` LIKE ?`,
      [`%${resolveVars(value, vars)}%`],
    );
    vars.set(varName, String(rows[0]?.cnt ?? 0));
  },
);

// When I db count "ds_core_users" rows where column "email" is "mike@test.com" into variable "userCount"
When(
  'I db count {string} rows where column {string} is {string} into variable {string}',
  async ({ vars }, tableName, column, value, varName) => {
    const table = resolveVars(tableName, vars);
    assertSafeIdentifier(table, 'table_name');
    assertSafeIdentifier(column, 'column');
    const rows = await dbQuery<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM \`${table}\` WHERE \`${column}\` = ?`,
      [resolveVars(value, vars)],
    );
    vars.set(varName, String(rows[0]?.cnt ?? 0));
  },
);

// When I db get newest "ds_core_users" column "user_id" where column "username" is "automationUser1" into variable "userId"
When(
  'I db get newest {string} column {string} where column {string} is {string} into variable {string}',
  async ({ vars }, tableName, colForExtraction, column, value, varName) => {
    const table = resolveVars(tableName, vars);
    assertSafeIdentifier(table, 'table_name');
    assertSafeIdentifier(column, 'column');
    assertSafeIdentifier(colForExtraction, 'column');
    const orderColumn = await resolveOrderColumn(table);
    const orderClause = orderColumn ? ` ORDER BY \`${orderColumn}\` DESC` : '';
    const rows = await dbQuery<Record<string, unknown>>(
      `SELECT * FROM \`${table}\` WHERE \`${column}\` = ?${orderClause} LIMIT 1`,
      [resolveVars(value, vars)],
    );
    const row = rows[0];
    if (!row || !(colForExtraction in row)) {
      throw new Error(
        `No row found (or missing column "${colForExtraction}") for ${table} where ${column} is ${value}`,
      );
    }
    vars.set(varName, String(row[colForExtraction]));
  },
);

// When I db get newest "ds_core_users" column "user_id" where column "email" like "bobsemail@example.com" into variable "userId"
When(
  'I db get newest {string} column {string} where column {string} like {string} into variable {string}',
  async ({ vars }, tableName, colForExtraction, column, value, varName) => {
    const table = resolveVars(tableName, vars);
    assertSafeIdentifier(table, 'table_name');
    assertSafeIdentifier(column, 'column');
    assertSafeIdentifier(colForExtraction, 'column');
    const orderColumn = await resolveOrderColumn(table);
    const orderClause = orderColumn ? ` ORDER BY \`${orderColumn}\` DESC` : '';
    const rows = await dbQuery<Record<string, unknown>>(
      `SELECT * FROM \`${table}\` WHERE \`${column}\` LIKE ?${orderClause} LIMIT 1`,
      [`%${resolveVars(value, vars)}%`],
    );
    const row = rows[0];
    if (!row || !(colForExtraction in row)) {
      throw new Error(
        `No row found (or missing column "${colForExtraction}") for ${table} where ${column} like ${value}`,
      );
    }
    vars.set(varName, String(row[colForExtraction]));
  },
);

// When I db delete row "ds_core_users" where "email" is "mike+auto@test.com"
When(
  'I db delete row {string} where {string} is {string}',
  async ({ vars }, tableName, column, value) => {
    const table = resolveVars(tableName, vars);
    assertSafeIdentifier(table, 'table_name');
    assertSafeIdentifier(column, 'column');
    await dbExecute(`DELETE FROM \`${table}\` WHERE \`${column}\` = ? LIMIT 1`, [resolveVars(value, vars)]);
  },
);

// When I db update table "ds_core_users" column "email_verified_at" where "user_id" is "+var(userId)" to value "2026-09-24 10:00:00"
When(
  'I db update table {string} column {string} where {string} is {string} to value {string}',
  async ({ vars }, tableName, columnToUpdate, whereColumn, whereValue, toValue) => {
    const table = resolveVars(tableName, vars);
    assertSafeIdentifier(table, 'table_name');
    assertSafeIdentifier(columnToUpdate, 'column');
    assertSafeIdentifier(whereColumn, 'column');
    await dbExecute(
      `UPDATE \`${table}\` SET \`${columnToUpdate}\` = ? WHERE \`${whereColumn}\` = ? LIMIT 1`,
      [resolveVars(toValue, vars), resolveVars(whereValue, vars)],
    );
  },
);
