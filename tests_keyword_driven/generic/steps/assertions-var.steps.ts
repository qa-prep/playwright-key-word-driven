// location: tests_keyword_driven/generic/steps/assertions-var.steps.ts

import { createBdd } from 'playwright-bdd';
import { test, expect, resolveVars } from '../support/vars';

const { Then } = createBdd(test);

// Then I should see variable "userCount" is "1"
Then('I should see variable {string} is {string}', async ({ vars }, name, expected) => {
  expect(vars.get(name)).toBe(resolveVars(expected, vars));
});

// Then I should see variable "loginUrl" contains "/login"
Then('I should see variable {string} contains {string}', async ({ vars }, name, expected) => {
  expect(vars.get(name) ?? '').toContain(resolveVars(expected, vars));
});