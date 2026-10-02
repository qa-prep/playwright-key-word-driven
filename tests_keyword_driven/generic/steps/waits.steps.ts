// location: tests_keyword_driven/steps/generic/waits.steps.ts
//
// Waits are best-effort and never fail the test on timeout - only an
// assertion ("I should see...") should fail. If a wait times out, the test
// just carries on immediately (instead of blocking for the full timeout AND
// throwing) and whatever assertion follows is what actually catches the
// problem. Always follow a wait with an assertion if you need the test to
// fail when the condition never becomes true.

import { createBdd } from 'playwright-bdd';
import type { Page, Locator } from '@playwright/test';
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

// Status vocabulary: disabled/enabled/exists/visible/invisible/checked/
// unchecked/clickable/obscured - negation is baked into the word you pick
// (eg. "disabled", not "not enabled"), no separate negated step needed.
// "clickable"/"obscured" use a trial click (Playwright's own actionability
// checks - visible, stable, receives events, enabled - without actually
// clicking) rather than a single property check, since "clickable" isn't
// just one DOM attribute.
// Polls up to 5s, resolving as soon as the status is reached - never fails,
// same as every other wait in this file (an unrecognised status just times
// out quietly rather than asserting - this used to hard-fail in an earlier
// version of this framework, which defeated the point of it being a wait).
// Follow with a real "I should see element X is Y" assertion if you need
// the test to fail when the status never arrives.
async function checkStatus(locator: Locator, status: string): Promise<boolean> {
  try {
    switch (status) {
      case 'visible': return await locator.isVisible();
      case 'invisible': return !(await locator.isVisible());
      case 'enabled': return await locator.isEnabled();
      case 'disabled': return await locator.isDisabled();
      case 'checked': return await locator.isChecked();
      case 'unchecked': return !(await locator.isChecked());
      case 'exists': return (await locator.count()) > 0;
      case 'clickable':
        return await locator.click({ trial: true, timeout: 200 }).then(() => true).catch(() => false);
      case 'obscured':
        return await locator.click({ trial: true, timeout: 200 }).then(() => false).catch(() => true);
      default: return false; // unrecognised status - never satisfied, just times out quietly
    }
  } catch {
    return false;
  }
}

async function waitForStatus(page: Page, vars: Map<string, string>, selector: string, status: string) {
  const locator = (await resolveLocator(page, resolveVars(selector, vars))).first();
  const start = Date.now();
  while (Date.now() - start < 5000) {
    if (await checkStatus(locator, status)) return;
    await page.waitForTimeout(100);
  }
}


// When I wait for element "css:button" is "enabled"
When('I wait for element {string} is {string}', async ({ page, vars }, selector, status) => {
  await waitForStatus(page, vars, selector, status);
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
