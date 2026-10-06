// location: tests_keyword_driven/projects/dash-sites/steps/auth.steps.ts



import { createBdd } from 'playwright-bdd';
import { test, expect, resolveVars } from '../../../generic/support/vars';
import { resolveLocator } from '../../../generic/support/locator';

const { Given, When } = createBdd(test);

// Given I am logged in with "someusername" and pass "_AUTO_USER_PASS"
Given('I am logged in with {string} and pass {string}', async ({ page, vars }, usernameOrEmail, password) => {
  await page.goto(resolveVars('_APP_URL/auth?mode=login', vars));

  // Plain-text field resolution falls back to a literal text match if
  // nothing more specific is found - on a page that's still mounting, that
  // can match the <label> itself (it contains the same text) before the
  // real <input> next to it exists, and .fill() on a label fails outright.
  // Waiting for a real input here first means resolveLocator only starts
  // guessing once there's an actual field for it to find.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 10000 });

  const loginField = await resolveLocator(page, 'Username or Email');
  await loginField.fill(resolveVars(usernameOrEmail, vars));

  const passwordField = await resolveLocator(page, 'Password');
  await passwordField.fill(resolveVars(password, vars));

  // plain "Login" would match the nav bar link before the submit button -
  // role:button: is required here, not just a style choice
  const loginButton = await resolveLocator(page, 'role:button:Login');
  await loginButton.click();

  // Always assert right after a login step, before any navigation away -
  // otherwise a slow login is a race condition, not a real failure.
  await expect.poll(() => page.url()).not.toContain('/auth');
  await expect(page.locator('body')).toContainText('Welcome');
});

// Given I am logged in with "someusername"
// This assumes the default password (_AUTO_USER_PASS)
Given('I am logged in with {string}', async ({ page, vars }, usernameOrEmail) => {
  await page.goto(resolveVars('_APP_URL/auth?mode=login', vars));
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 10000 });

  const loginField = await resolveLocator(page, 'Username or Email');
  await loginField.fill(resolveVars(usernameOrEmail, vars));

  const password = resolveVars('_AUTO_USER_PASS', vars);
  const passwordField = await resolveLocator(page, 'Password');
  await passwordField.fill(resolveVars(password, vars));

  const loginButton = await resolveLocator(page, 'role:button:Login');
  await loginButton.click();

  await expect.poll(() => page.url()).not.toContain('/auth');
  await expect(page.locator('body')).toContainText('Welcome');
});
