// location: tests_keyword_driven/steps/generic/waits.steps.ts

import { createBdd } from 'playwright-bdd';
import { test, resolveVars, expect } from '../support/vars';
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

// When I wait for element count "1" (exact) or "< 0" / "<0" / "> 0" / ">0"
// (operator, optional space, number - matches the old syntax). Polls up to 5s,
// resolving as soon as the condition is true instead of always waiting the
// full timeout (e.g. an exact-0 check that's already true returns immediately).
When('I wait for element {string} count is {string}', async ({ page, vars }, selector, countExpr) => {
  const resolvedSelector = resolveVars(selector, vars);
  const resolvedExpr = resolveVars(countExpr, vars).trim();
  const match = resolvedExpr.match(/^(<=|>=|<|>)?\s*(\d+)$/);
  if (!match) {
    throw new Error(`Invalid count expression "${resolvedExpr}" - expected e.g. "1", "< 0", ">0", "<=2"`);
  }
  const [, operator, numberStr] = match;
  const expected = parseInt(numberStr, 10);

  const locator = await resolveLocator(page, resolvedSelector);
  await expect
    .poll(async () => locator.count(), { timeout: 5000 })
    [operator === '<' ? 'toBeLessThan'
      : operator === '>' ? 'toBeGreaterThan'
      : operator === '<=' ? 'toBeLessThanOrEqual'
      : operator === '>=' ? 'toBeGreaterThanOrEqual'
      : 'toBe'](expected);
});

When('I wait for page to load', async ({ page }) => {
  await page.waitForLoadState('load');
});

When('I wait for network idle', async ({ page }) => {
  await page.waitForLoadState('networkidle');
});