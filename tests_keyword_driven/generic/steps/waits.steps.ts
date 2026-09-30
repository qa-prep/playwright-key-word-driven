// location: tests_keyword_driven/steps/generic/waits.steps.ts
//
// Waits are best-effort and never fail the test on timeout - only an
// assertion ("I should see...") should fail. If a wait times out, the test
// just carries on immediately (instead of blocking for the full timeout AND
// throwing) and whatever assertion follows is what actually catches the
// problem. Always follow a wait with an assertion if you need the test to
// fail when the condition never becomes true.

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
  await locator.first().waitFor({ state: 'attached' }).catch(() => {});
});

When('I wait for element {string} to be visible', async ({ page, vars }, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.first().waitFor({ state: 'visible' }).catch(() => {});
});

When('I wait for element {string} to not be visible', async ({ page, vars }, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.first().waitFor({ state: 'hidden' }).catch(() => {});
});

// When I wait for element count "1" (exact) or "< 0" / "<0" / "> 0" / ">0"
// (operator, optional space, number - matches the old syntax). Polls up to 5s,
// resolving as soon as the condition is true instead of always waiting the
// full timeout (e.g. an exact-0 check that's already true returns immediately).
// A malformed count expression still throws - that's a broken step argument,
// not a timing issue, so swallowing it would just hide a typo in the feature.
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
      : 'toBe'](expected)
    .catch(() => {});
});

When('I wait for page to load', async ({ page }) => {
  await page.waitForLoadState('load').catch(() => {});
});

When('I wait for network idle', async ({ page }) => {
  await page.waitForLoadState('networkidle').catch(() => {});
});
