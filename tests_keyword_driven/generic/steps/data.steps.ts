// location: tests_keyword_driven/steps/generic/data.steps.ts

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { testAutomationApi } from '../support/testAutomationApi';

const { Given, When } = createBdd(test);

Given('I set variable {string} to {string}', async ({ vars }, name, value) => {
  vars.set(name, resolveVars(value, vars));
});

// goes through the backend's own tiered cleanup (moderation queue, team
// ownership, personal tables, etc), not just a direct delete on ds_core_users.
// for a direct-query example instead of the api, see db/entities/users.ts
// (deleteUserByEmail/getUserIdByEmail) and tests/db_test.spec.ts.
Given('I clean up user data for email {string}', async ({ vars }, email) => {
  await testAutomationApi.deleteUserByEmail(resolveVars(email, vars));
});

// bulk sweep: use this once per suite/run (e.g. with your test-run's email
// prefix) instead of calling the single-email cleanup once per test - that's
// what keeps the query count flat when many tests run in parallel
Given('I clean up user data for email contains {string}', async ({ vars }, emailContains) => {
  await testAutomationApi.deleteUsersByEmailContains(resolveVars(emailContains, vars));
});

When('I script {string} to variable {string}', async ({ page, vars }, script, varName) => {
  const resolved = resolveVars(script, vars);
  const result = await page.evaluate(resolved);
  vars.set(varName, typeof result === 'string' ? result : JSON.stringify(result));
});