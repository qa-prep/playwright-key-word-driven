// location: tests_keyword_driven/steps/generic/waits.steps.ts

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { resolveLocator } from '../support/locator';

const { When } = createBdd(test);

When('I wait {string} seconds', async ({}, secondsStr) => {
  const ms = parseFloat(secondsStr) * 1000;
  await new Promise((resolve) => setTimeout(resolve, ms));
});

When('I wait for element {string}', async ({ page, vars }, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.first().waitFor({ state: 'attached' });
});

When('I wait for element {string} to be visible', async ({ page, vars }, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.first().waitFor({ state: 'visible' });
});

When('I wait for element {string} to not be visible', async ({ page, vars }, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.first().waitFor({ state: 'hidden' });
});

When('I wait for page to load', async ({ page }) => {
  await page.waitForLoadState('load');
});

When('I wait for network idle', async ({ page }) => {
  await page.waitForLoadState('networkidle');
});