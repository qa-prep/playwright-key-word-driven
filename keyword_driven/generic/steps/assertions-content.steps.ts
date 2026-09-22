// location: keyword_driven/generic/steps/assertions-content.steps.ts
// contains text, field value, attribute

import { createBdd } from 'playwright-bdd';
import { test, expect, resolveVars } from '../support/vars';
import { resolveLocator } from '../support/locator';

const { Then } = createBdd(test);


/************************************************************** 
  *  All of these +ve assertions start with "I should see"    *
  *  I should see                                             *
  *************************************************************/


Then('I should see element {string} contains text {string}', async ({ page, vars }, selector, text) => {
  const locator = (await resolveLocator(page, resolveVars(selector, vars))).first();
  await expect(locator).toContainText(resolveVars(text, vars));
});

Then('I should see the {string} element {string} contains text {string}', async ({ page, vars }, nth, selector, text) => {
  const locator = (await resolveLocator(page, resolveVars(selector, vars))).nth(parseInt(nth, 10) - 1);
  await expect(locator).toContainText(resolveVars(text, vars));
});

Then('I should see viewport text {string}', async ({ page, vars }, text) => {
  await expect(page.locator('body')).toContainText(resolveVars(text, vars));
});

Then('I should see field {string} contains {string}', async ({ page, vars }, selector, value) => {
  const locator = (await resolveLocator(page, resolveVars(selector, vars))).first();
  await expect.poll(async () => locator.inputValue()).toContain(resolveVars(value, vars));
});

Then('I should see field {string} is {string}', async ({ page, vars }, selector, value) => {
  const locator = (await resolveLocator(page, resolveVars(selector, vars))).first();
  await expect(locator).toHaveValue(resolveVars(value, vars));
});

Then('I should see the {string} field {string} is {string}', async ({ page, vars }, nth, selector, value) => {
  const locator = (await resolveLocator(page, resolveVars(selector, vars))).nth(parseInt(nth, 10) - 1);
  await expect(locator).toHaveValue(resolveVars(value, vars));
});

Then('I should see element {string} has attribute {string}', async ({ page, vars }, selector, attr) => {
  const locator = (await resolveLocator(page, resolveVars(selector, vars))).first();
  await expect(locator).toHaveAttribute(attr);
});

Then('I should see element {string} attribute {string} is {string}', async ({ page, vars }, selector, attr, value) => {
  const locator = (await resolveLocator(page, resolveVars(selector, vars))).first();
  await expect(locator).toHaveAttribute(attr, resolveVars(value, vars));
});

Then('I should see element {string} attribute {string} contains {string}', async ({ page, vars }, selector, attr, value) => {
  const locator = (await resolveLocator(page, resolveVars(selector, vars))).first();
  await expect(locator).toHaveAttribute(attr, new RegExp(resolveVars(value, vars)));
});

Then('I should see element {string} computed style {string} is {string}', async ({ page, vars }, selector, styleName, value) => {
  const locator = (await resolveLocator(page, resolveVars(selector, vars))).first();
  await expect(locator).toHaveCSS(styleName, resolveVars(value, vars));
});



/************************************************************** 
  *  I should not see                                         *
  *  we're adding a "not" only after "should"                 *
  *  to be consistent with the "I should see" steps above.    *
  *  Although it doesnt always read well.                     *
  *************************************************************/


Then('I should not see viewport text {string}', async ({ page, vars }, text) => {
  await expect(page.locator('body')).not.toContainText(resolveVars(text, vars));
});

Then('I should not see element {string} contains text {string}', async ({ page, vars }, selector, text) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  if ((await locator.count()) === 0) { return; } // no element, so it "does not contain" trivially
  await expect(locator.first()).not.toContainText(resolveVars(text, vars));
});

Then('I should not see field {string} contains {string}', async ({ page, vars }, selector, value) => {
  const locator = (await resolveLocator(page, resolveVars(selector, vars))).first();
  await expect(locator).not.toHaveValue(new RegExp(resolveVars(value, vars)));
});

Then('I should not see element {string} has attribute {string}', async ({ page, vars }, selector, attr) => {
  const locator = (await resolveLocator(page, resolveVars(selector, vars))).first();
  await expect(locator).not.toHaveAttribute(attr);
});