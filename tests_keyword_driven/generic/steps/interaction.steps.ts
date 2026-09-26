// location: tests_keyword_driven/steps/generic/interaction.steps.ts

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { resolveLocator } from '../support/locator';

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

// For "accept this if it's there" gates (cookie banners, ToS/policy dialogs,
// etc): clicks every currently-matching element, one at a time, none if
// there aren't any - not an "attempt" on a single element, since more than
// one identical dialog can be open at once (e.g. separate ToS + Privacy
// Policy gates both showing "I accept"). Deliberately not a general
// conditional-in-Gherkin mechanism, this only ever does the one thing
// ("accept it if present") regardless of environment, so the scenario stays
// deterministic - it doesn't branch what the scenario does next.
When('I accept any {string}', async ({ page, vars }, selector) => {
  const rawSelector = resolveVars(selector, vars);
  for (let i = 0; i < 10; i++) {
    const locator = await resolveLocator(page, rawSelector);
    const count = await locator.count().catch(() => 0);
    if (count === 0) break;
    await locator.first().click().catch(() => {});
  }
});

When('I set field {string} to {string}', async ({ page, vars }, selector, value) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.fill(resolveVars(value, vars));
});

When('I set the {string} field {string} to {string}', async ({ page, vars }, nth, selector, value) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.nth(parseInt(nth, 10) - 1).fill(resolveVars(value, vars));
});

When('I set field {string} to {string} noCheck', async ({ page, vars }, selector, value) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.fill(resolveVars(value, vars)); // Playwright's fill already verifies the value landed; kept for step-text parity
});

// For a native <select>, not a custom dropdown component - .fill() throws on
// these, Playwright requires .selectOption() instead. Matches by visible
// option text (the <option>...</option> label), not its underlying value.
When('I select {string} from {string}', async ({ page, vars }, optionText, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.selectOption({ label: resolveVars(optionText, vars) });
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