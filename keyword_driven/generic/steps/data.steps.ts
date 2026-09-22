// location: keyword_driven/steps/generic/data.steps.ts

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { deleteUserByEmail } from '../../../db/entities/users';

const { Given, When } = createBdd(test);

Given('I set variable {string} to {string}', async ({ vars }, name, value) => {
  vars.set(name, resolveVars(value, vars));
});

// better to use an api endpoint written for cleaning up test data
// (so other tables can be cleaned up according to devs' intentions)
Given('I clean up user data for email {string}', async ({ vars }, email) => {
  await deleteUserByEmail(resolveVars(email, vars));
});

When('I script {string} to variable {string}', async ({ page, vars }, script, varName) => {
  const resolved = resolveVars(script, vars);
  const result = await page.evaluate(resolved);
  vars.set(varName, typeof result === 'string' ? result : JSON.stringify(result));
});