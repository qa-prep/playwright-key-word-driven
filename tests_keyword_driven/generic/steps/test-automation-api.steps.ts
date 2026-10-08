// location: tests_keyword_driven/generic/steps/test-automation-api.steps.ts
import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { testAutomationApi } from '../support/testAutomationApi';

const { When } = createBdd(test);




// When I api count "ds_core_users" rows where column "email" like "mike@test.com" into variable "userCount"
When(
  'I api count {string} rows where column {string} like {string} into variable {string}',
  async ({ vars }, tableName, column, value, varName) => {
    const result = await testAutomationApi.index({
      table_name: resolveVars(tableName, vars),
      table_key: column,
      table_operator: 'LIKE',
      table_value: `%${resolveVars(value, vars)}%`,
      limit: 1000,
    });
    const count = Array.isArray(result?.data?.rows) ? result.data.rows.length : 0;
    vars.set(varName, String(count));
  },
);

// When I api count "ds_core_users" rows where column "email" is "mike@test.com" into variable "userCount"
When(
  'I api count {string} rows where column {string} is {string} into variable {string}',
  async ({ vars }, tableName, column, value, varName) => {
    const result = await testAutomationApi.index({
      table_name: resolveVars(tableName, vars),
      table_key: column,
      table_operator: '=',
      table_value: resolveVars(value, vars),
      limit: 1000,
    });
    const count = Array.isArray(result?.data?.rows) ? result.data.rows.length : 0;
    vars.set(varName, String(count));
  },
);

// When I api get newest "ds_core_users" column "user_id" where column "username" is "automationUser1" into variable "userId"
When(
  'I api get newest {string} column {string} where column {string} is {string} into variable {string}',
  async ({ vars }, tableName, colForExtraction, column, value, varName) => {
    const result = await testAutomationApi.index({
      table_name: resolveVars(tableName, vars),
      table_key: column,
      table_operator: '=',
      table_value: resolveVars(value, vars),
      order_key: 'updated_at',
      order_value: 'DESC',
      limit: 1,
    });
    const row = result?.data?.rows?.[0];
    if (!row || !(colForExtraction in row)) {
      throw new Error(
        `No row found (or missing column "${colForExtraction}") for ${tableName} where ${column} is ${value}`,
      );
    }
    vars.set(varName, String(row[colForExtraction]));
  },
);

// When I api get newest "ds_core_users" column "user_id" where column "email" like "bobsemail@example.com" into variable "userId"
When(
  'I api get newest {string} column {string} where column {string} like {string} into variable {string}',
  async ({ vars }, tableName, colForExtraction, column, value, varName) => {
    const result = await testAutomationApi.index({
      table_name: resolveVars(tableName, vars),
      table_key: column,
      table_operator: 'LIKE',
      table_value: `%${resolveVars(value, vars)}%`,
      order_key: 'updated_at',
      order_value: 'DESC',
      limit: 1,
    });
    const row = result?.data?.rows?.[0];
    if (!row || !(colForExtraction in row)) {
      throw new Error(
        `No row found (or missing column "${colForExtraction}") for ${tableName} where ${column} like ${value}`,
      );
    }
    vars.set(varName, String(row[colForExtraction]));
  },
);

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
    const result = await testAutomationApi.index({
      table_name: resolveVars(tableName, vars),
      table_key: column,
      table_operator: '=',
      table_value: resolveVars(value, vars),
      order_key: 'updated_at',
      order_value: 'DESC',
      limit: 1,
    });
    const row = result?.data?.rows?.[0];
    if (!row) {
      throw new Error(`No row found for ${tableName} where ${column} is ${value}`);
    }
    vars.set(varName, JSON.stringify(row));
  },
);

// When I api get newest row "ds_core_users" where column "email" like "bobsemail@example.com" into variable "row"
When(
  'I api get newest row {string} where column {string} like {string} into variable {string}',
  async ({ vars }, tableName, column, value, varName) => {
    const result = await testAutomationApi.index({
      table_name: resolveVars(tableName, vars),
      table_key: column,
      table_operator: 'LIKE',
      table_value: `%${resolveVars(value, vars)}%`,
      order_key: 'updated_at',
      order_value: 'DESC',
      limit: 1,
    });
    const row = result?.data?.rows?.[0];
    if (!row) {
      throw new Error(`No row found for ${tableName} where ${column} like ${value}`);
    }
    vars.set(varName, JSON.stringify(row));
  },
);

// When I api delete row "ds_core_users" where "email" is "mike+auto@test.com"
When(
  'I api delete row {string} where {string} is {string}',
  async ({ vars }, tableName, column, value) => {
    await testAutomationApi.destroy({
      table_name: resolveVars(tableName, vars),
      table_key: column,
      table_value: resolveVars(value, vars),
    });
  },
);

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
    await testAutomationApi.update({
      table_name: resolveVars(tableName, vars),
      table_key: whereColumn,
      table_value: resolveVars(whereValue, vars),
      update_key: columnToUpdate,
      update_value: resolveVars(toValue, vars),
    });
  },
);