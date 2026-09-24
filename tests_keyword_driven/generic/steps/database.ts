// location: tests_keyword_driven/generic/steps/database.steps.ts
import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { testAutomationApi } from '../support/testAutomationApi';

const { When } = createBdd(test);

// When I db api count "ds_core_users" rows where column "email" is "mike@test.com" into variable "userCount"
When(
  'I db api count {string} rows where column {string} is {string} into variable {string}',
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

// When I db api get newest "ds_core_users" column "user_id" where column "username" is "automationUser1" into variable "userId"
When(
  'I db api get newest {string} column {string} where column {string} is {string} into variable {string}',
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

// When I db api delete row "ds_core_users" where "email" is "mike+auto@test.com"
When(
  'I db api delete row {string} where {string} is {string}',
  async ({ vars }, tableName, column, value) => {
    await testAutomationApi.destroy({
      table_name: resolveVars(tableName, vars),
      table_key: column,
      table_value: resolveVars(value, vars),
    });
  },
);

// When I db api update table "ds_core_users" column "email_verified_at" where "user_id" is "+var(userId)" to value "2026-09-24 10:00:00"
When(
  'I db api update table {string} column {string} where {string} is {string} to value {string}',
  async ({ vars }, tableName, columnToUpdate, whereColumn, whereValue, toValue) => {
    await testAutomationApi.update({
      table_name: resolveVars(tableName, vars),
      where: { [whereColumn]: resolveVars(whereValue, vars) },
      update: { [columnToUpdate]: resolveVars(toValue, vars) },
    });
  },
);