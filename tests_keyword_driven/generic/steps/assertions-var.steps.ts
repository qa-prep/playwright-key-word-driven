// location: tests_keyword_driven/generic/steps/assertions-var.steps.ts

import { createBdd } from 'playwright-bdd';
import { test, expect, resolveVars, resolveVarField } from '../support/vars';

const { Then } = createBdd(test);

// Then I should see variable "userCount" is "1"
// name can be a dotted JSON field path into another variable (eg.
// "teamSaveResponse.success") as well as a literal variable name - see
// resolveVarField() in vars.ts.
Then('I should see variable {string} is {string}', async ({ vars }, name, expected) => {
  expect(resolveVarField(vars, name)).toBe(resolveVars(expected, vars));
});

// Then I should see variable "loginUrl" contains "/login"
Then('I should see variable {string} contains {string}', async ({ vars }, name, expected) => {
  expect(resolveVarField(vars, name) ?? '').toContain(resolveVars(expected, vars));
});

// Then I should not see variable "loginResponse" is "error"
Then('I should not see variable {string} is {string}', async ({ vars }, name, expected) => {
  expect(resolveVarField(vars, name)).not.toBe(resolveVars(expected, vars));
});

// Then I should not see variable "loginResponse" contains "error"
Then('I should not see variable {string} contains {string}', async ({ vars }, name, expected) => {
  expect(resolveVarField(vars, name) ?? '').not.toContain(resolveVars(expected, vars));
});