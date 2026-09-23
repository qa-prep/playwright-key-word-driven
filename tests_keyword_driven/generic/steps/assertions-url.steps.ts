// location: tests_keyword_driven/steps/generic/assertions-url.steps.ts
// url is/contains/ends with

import { createBdd } from 'playwright-bdd';
import { test, expect, resolveVars } from '../support/vars';

const { Then } = createBdd(test);


/************************************************************** 
  *  All of these +ve assertions start with "I should see"    *
  *  I should see                                             *
  *************************************************************/

Then('I should see url is {string}', async ({ page, vars }, expected) => {
  const target = resolveVars(expected, vars).replace(/\/$/, '');
  await expect(page).toHaveURL((url) => url.toString().replace(/\/$/, '') === target);
});

Then('I should see url contains {string}', async ({ page, vars }, expected) => {
  await expect(page).toHaveURL(new RegExp(resolveVars(expected, vars)));
});

Then('I should see url ends with {string}', async ({ page, vars }, expected) => {
  const suffix = resolveVars(expected, vars);
  await expect.poll(() => page.url()).toMatch(new RegExp(`${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
});





/************************************************************** 
  *  I should not see                                         *
  *  we're adding a "not" only after "should"                 *
  *  to be consistent with the "I should see" steps above.    *
  *  Although it doesnt always read well.                     *
  *************************************************************/


Then('I should not see url is {string}', async ({ page, vars }, expected) => {
  const target = resolveVars(expected, vars).replace(/\/$/, '');
  await expect.poll(() => page.url().replace(/\/$/, '')).not.toBe(target);
});

Then('I should not see url ends with {string}', async ({ page, vars }, expected) => {
  const suffix = resolveVars(expected, vars);
  await expect.poll(() => page.url()).not.toMatch(new RegExp(`${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
});
  
Then('I should see url does not contain {string}', async ({ page, vars }, expected) => {
  const needle = resolveVars(expected, vars);
  await expect.poll(() => page.url()).not.toContain(needle);
});