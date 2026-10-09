// location: tests_keyword_driven/generic/steps/test-automation-api.steps.ts
//
// Every step below is a thin adapter: resolve the Gherkin strings, call the
// plain exported function declared directly under it, store the result.
// The function is what's reusable from another step file directly.

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { testAutomationApi } from '../support/testAutomationApi';

const { When } = createBdd(test);

// When I api count "ds_core_users" rows where column "email" like "mike@test.com" into variable "userCount"
When(
  'I api count {string} rows where column {string} like {string} into variable {string}',
  async ({ vars }, tableName, column, value, varName) => {
    const count = await apiCountRowsLike(resolveVars(tableName, vars), column, resolveVars(value, vars));
    vars.set(varName, String(count));
  },
);

export async function apiCountRowsLike(tableName: string, column: string, value: string): Promise<number> {
  const result = await testAutomationApi.index({
    table_name: tableName,
    table_key: column,
    table_operator: 'LIKE',
    table_value: `%${value}%`,
    limit: 1000,
  });
  return Array.isArray(result?.data?.rows) ? result.data.rows.length : 0;
}

// When I api count "ds_core_users" rows where column "email" is "mike@test.com" into variable "userCount"
When(
  'I api count {string} rows where column {string} is {string} into variable {string}',
  async ({ vars }, tableName, column, value, varName) => {
    const count = await apiCountRowsIs(resolveVars(tableName, vars), column, resolveVars(value, vars));
    vars.set(varName, String(count));
  },
);

export async function apiCountRowsIs(tableName: string, column: string, value: string): Promise<number> {
  const result = await testAutomationApi.index({
    table_name: tableName,
    table_key: column,
    table_operator: '=',
    table_value: value,
    limit: 1000,
  });
  return Array.isArray(result?.data?.rows) ? result.data.rows.length : 0;
}

// When I api get newest "ds_core_users" column "user_id" where column "username" is "automationUser1" into variable "userId"
When(
  'I api get newest {string} column {string} where column {string} is {string} into variable {string}',
  async ({ vars }, tableName, colForExtraction, column, value, varName) => {
    const extracted = await apiGetNewestColumnIs(resolveVars(tableName, vars), colForExtraction, column, resolveVars(value, vars));
    vars.set(varName, extracted);
  },
);

export async function apiGetNewestColumnIs(tableName: string, colForExtraction: string, column: string, value: string): Promise<string> {
  const result = await testAutomationApi.index({
    table_name: tableName,
    table_key: column,
    table_operator: '=',
    table_value: value,
    order_key: 'updated_at',
    order_value: 'DESC',
    limit: 1,
  });
  const row = result?.data?.rows?.[0];
  if (!row || !(colForExtraction in row)) {
    throw new Error(`No row found (or missing column "${colForExtraction}") for ${tableName} where ${column} is ${value}`);
  }
  return String(row[colForExtraction]);
}

// When I api get newest "ds_core_users" column "user_id" where column "email" like "bobsemail@example.com" into variable "userId"
When(
  'I api get newest {string} column {string} where column {string} like {string} into variable {string}',
  async ({ vars }, tableName, colForExtraction, column, value, varName) => {
    const extracted = await apiGetNewestColumnLike(resolveVars(tableName, vars), colForExtraction, column, resolveVars(value, vars));
    vars.set(varName, extracted);
  },
);

export async function apiGetNewestColumnLike(tableName: string, colForExtraction: string, column: string, value: string): Promise<string> {
  const result = await testAutomationApi.index({
    table_name: tableName,
    table_key: column,
    table_operator: 'LIKE',
    table_value: `%${value}%`,
    order_key: 'updated_at',
    order_value: 'DESC',
    limit: 1,
  });
  const row = result?.data?.rows?.[0];
  if (!row || !(colForExtraction in row)) {
    throw new Error(`No row found (or missing column "${colForExtraction}") for ${tableName} where ${column} like ${value}`);
  }
  return String(row[colForExtraction]);
}

// When I api get newest row "ds_core_users" where column "username" is "automationUser1" into variable "row"
//
// Whole-row alternative to "I api get newest ... column ... where ...": one
// call gets every column instead of one call per column you want. See
// database.steps.ts's "I db get newest row ..." for why - resolveVarField()
// (vars.ts) already JSON-parses a variable and walks a dotted path once the
// name itself contains a dot, so "I should see variable "row.email"
// contains ..." just works on this with no extra wiring.
When(
  'I api get newest row {string} where column {string} is {string} into variable {string}',
  async ({ vars }, tableName, column, value, varName) => {
    const row = await apiGetNewestRowIs(resolveVars(tableName, vars), column, resolveVars(value, vars));
    vars.set(varName, JSON.stringify(row));
  },
);

export async function apiGetNewestRowIs(tableName: string, column: string, value: string): Promise<Record<string, unknown>> {
  const result = await testAutomationApi.index({
    table_name: tableName,
    table_key: column,
    table_operator: '=',
    table_value: value,
    order_key: 'updated_at',
    order_value: 'DESC',
    limit: 1,
  });
  const row = result?.data?.rows?.[0];
  if (!row) {
    throw new Error(`No row found for ${tableName} where ${column} is ${value}`);
  }
  return row;
}

// When I api get newest row "ds_core_users" where column "email" like "bobsemail@example.com" into variable "row"
When(
  'I api get newest row {string} where column {string} like {string} into variable {string}',
  async ({ vars }, tableName, column, value, varName) => {
    const row = await apiGetNewestRowLike(resolveVars(tableName, vars), column, resolveVars(value, vars));
    vars.set(varName, JSON.stringify(row));
  },
);

export async function apiGetNewestRowLike(tableName: string, column: string, value: string): Promise<Record<string, unknown>> {
  const result = await testAutomationApi.index({
    table_name: tableName,
    table_key: column,
    table_operator: 'LIKE',
    table_value: `%${value}%`,
    order_key: 'updated_at',
    order_value: 'DESC',
    limit: 1,
  });
  const row = result?.data?.rows?.[0];
  if (!row) {
    throw new Error(`No row found for ${tableName} where ${column} like ${value}`);
  }
  return row;
}

// When I api delete row "ds_core_users" where "email" is "mike+auto@test.com"
When(
  'I api delete row {string} where {string} is {string}',
  async ({ vars }, tableName, column, value) => {
    await apiDeleteRow(resolveVars(tableName, vars), column, resolveVars(value, vars));
  },
);

export async function apiDeleteRow(tableName: string, column: string, value: string): Promise<void> {
  await testAutomationApi.destroy({
    table_name: tableName,
    table_key: column,
    table_value: value,
  });
}

// When I api update table "ds_core_users" column "email_verified_at" where "user_id" is "+var(userId)" to value "2026-09-24 10:00:00"
//
// TestAutomationController::update() expects flat table_key/table_value/
// update_key/update_value fields, not a nested where/update object - this
// step previously sent the nested shape, which the server silently read as
// an empty table_key every time ("Column '' is not an allowed where-column"),
// meaning this step never actually worked. Confirmed live.
When(
  'I api update table {string} column {string} where {string} is {string} to value {string}',
  async ({ vars }, tableName, columnToUpdate, whereColumn, whereValue, toValue) => {
    await apiUpdateTable(resolveVars(tableName, vars), columnToUpdate, whereColumn, resolveVars(whereValue, vars), resolveVars(toValue, vars));
  },
);

export async function apiUpdateTable(tableName: string, columnToUpdate: string, whereColumn: string, whereValue: string, toValue: string): Promise<void> {
  await testAutomationApi.update({
    table_name: tableName,
    table_key: whereColumn,
    table_value: whereValue,
    update_key: columnToUpdate,
    update_value: toValue,
  });
}
