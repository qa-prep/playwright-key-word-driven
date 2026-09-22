// location: keyword_driven/steps/generic/assertions-visibility.steps.ts

import { createBdd } from 'playwright-bdd';
import { test, expect, resolveVars } from '../support/vars';
import { resolveLocator } from '../support/locator';

const { Then } = createBdd(test);


/************************************************************** 
  *  All of these +ve assertions start with "I should see"    *
  *  I should see                                             *
  *************************************************************/


Then('I should see element {string}', async ({ page, vars }, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await expect(locator.first()).toBeAttached();
});

Then('I should see visible element {string}', async ({ page, vars }, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await expect(locator.first()).toBeVisible();
});

Then('I should see element {string} count is {string}', async ({ page, vars }, selector, countStr) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await expect(locator).toHaveCount(parseInt(resolveVars(countStr, vars), 10));
});

Then('I should see element {string} is {string}', async ({ page, vars }, selector, status) => {
  const locator = (await resolveLocator(page, resolveVars(selector, vars))).first();
  switch (status) {
    case 'visible': await expect(locator).toBeVisible(); break;
    case 'invisible': await expect(locator).not.toBeVisible(); break;
    case 'enabled': await expect(locator).toBeEnabled(); break;
    case 'disabled': await expect(locator).toBeDisabled(); break;
    case 'checked': await expect(locator).toBeChecked(); break;
    case 'unchecked': await expect(locator).not.toBeChecked(); break;
    default:
      throw new Error(`Unsupported status "${status}" — add a case or use a computed-style/attribute step instead`);
  }
});

Then('I should see tab count is {string}', async ({ page, vars }, expCountStr) => {
  const expected = parseInt(resolveVars(expCountStr, vars), 10);
  await expect.poll(() => page.context().pages().length).toBe(expected);
});

Then('I should see page has scrollbar', async ({ page }) => {
  const hasScroll = await page.evaluate(() => document.body.scrollHeight > document.body.clientHeight
    || document.body.scrollWidth > document.body.clientWidth);
  expect(hasScroll).toBe(true);
});




/************************************************************** 
  *  I should not see                                         *
  *  we're adding a "not" only after "should"                 *
  *  to be consistent with the "I should see" steps above.    *
  *  Although it doesnt always read well.                     *
  *************************************************************/


Then('I should not see visible element {string}', async ({ page, vars }, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await expect(locator.first()).not.toBeVisible();
});

Then('I should not see element {string}', async ({ page, vars }, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await expect(locator).toHaveCount(0);
});

Then('I should not see element {string} is {string}', async ({ page, vars }, selector, status) => {
  const locator = (await resolveLocator(page, resolveVars(selector, vars))).first();
  switch (status) {
    case 'visible': await expect(locator).not.toBeVisible(); break;
    case 'invisible': await expect(locator).toBeVisible(); break;
    case 'enabled': await expect(locator).toBeDisabled(); break;
    case 'disabled': await expect(locator).toBeEnabled(); break;
    case 'checked': await expect(locator).not.toBeChecked(); break;
    case 'unchecked': await expect(locator).toBeChecked(); break;
    default:
      throw new Error(`Unsupported status "${status}" — add a case or use a computed-style/attribute step instead`);
  }
});