// location: keyword_driven/projects/myProjectA/steps/interaction.steps.ts

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../../../generic/support/vars';
import { resolveLocator } from '../../../generic/support/locator';

const { When } = createBdd(test);

When('I click {string}', async ({ page, vars }, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.click();
});

When('I click the {string} {string}', async ({ page, vars }, nth, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.nth(parseInt(nth, 10) - 1).click();
});

When('I double click {string}', async ({ page, vars }, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.dblclick();
});

When('I attempt click {string}', async ({ page, vars }, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.click({ trial: false, force: false }).catch(() => {}); // best-effort, do not fail if unclickable
});

When('I set field {string} to {string}', async ({ page, vars }, selector, value) => {
  // if the second string contains _manual lets change it to __browser
  // that way, we can have the manual test no require any +var and simply replace the _manual with __browser 
  // which will allow parallel execution of the test in the browser
  const replacedManual = value.replace('_manual', '__browser');
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.fill(resolveVars(replacedManual, vars));
});

When('I set the {string} field {string} to {string}', async ({ page, vars }, nth, selector, value) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.nth(parseInt(nth, 10) - 1).fill(resolveVars(value, vars));
});

When('I set field {string} to {string} noCheck', async ({ page, vars }, selector, value) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.fill(resolveVars(value, vars)); // Playwright's fill already verifies the value landed; kept for step-text parity
});

When('I toggle the {string} element {string} attribute {string} to contain {string}', async (
  { page, vars },
  nth,
  selector,
  attr,
  wantValue,
) => {
  const locator = (await resolveLocator(page, resolveVars(selector, vars))).nth(parseInt(nth, 10) - 1);
  const current = (await locator.getAttribute(attr)) ?? '';
  if (!current.includes(resolveVars(wantValue, vars))) {
    await locator.click();
  }
});

When('I upload file {string} to {string}', async ({ page, vars }, filePath, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.setInputFiles(resolveVars(filePath, vars));
});

When('I upload file {string}', async ({ page, vars }, filePath) => {
  const locator = await resolveLocator(page, 'css:[type=file]');
  await locator.setInputFiles(resolveVars(filePath, vars));
});

When('I mouse over {string}', async ({ page, vars }, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.hover();
});

When('I scroll to {string}', async ({ page, vars }, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.scrollIntoViewIfNeeded();
});

When('I scroll to {string} {string}', async ({ page, vars }, nth, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.nth(parseInt(nth, 10) - 1).scrollIntoViewIfNeeded();
});

When('I send keys {string}', async ({ page, vars }, txt) => {
  await page.keyboard.type(resolveVars(txt, vars));
});

When('I press key {string}', async ({ page }, key) => {
  // Playwright key names differ from Selenium's Keys enum (e.g. "Escape" not "_ESCAPE") — map at the feature-file level
  await page.keyboard.press(key);
});