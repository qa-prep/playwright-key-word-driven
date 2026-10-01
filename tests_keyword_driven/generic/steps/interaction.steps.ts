// location: tests_keyword_driven/steps/generic/interaction.steps.ts

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { resolveLocator, resolveClickTarget, resolveFieldLocator } from '../support/locator';

const { When } = createBdd(test);

// Click-only resolution (link/button/dropdown/radio/checkbox by visible
// text, exact before partial) when no explicit prefix is given - see
// resolveClickTarget() in locator.ts for the full cascade. A native <select>
// match can't be .click()'d reliably, so it's selectOption()'d instead.
When('I click {string}', async ({ page, vars }, selector) => {
  const target = await resolveClickTarget(page, resolveVars(selector, vars));
  if (target.selectOptionLabel !== undefined) {
    await target.locator.selectOption({ label: target.selectOptionLabel });
  } else {
    await target.locator.click();
  }
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

// For "click if it's there" gates (cookie banners, ToS/policy dialogs).
// Can also be use for duplicate elements (better to use unique selectors, but when impossible this is an option)
// It will click 0 if not present, but the first it can if it finds it
When('I click any {string}', async ({ page, vars }, selector) => {
  const rawSelector = resolveVars(selector, vars);
  const locator = await resolveLocator(page, rawSelector);  // we wait for no more than 200ms
  await locator.first().waitFor({ state: 'visible', timeout: 200 }).catch(() => {});
  const count = await locator.count().catch(() => 0);
  if (count === 0) return;
  if (count === 1) {
    await locator.first().click().catch(() => {});
  }
  else { // this handles duplicate elements with the same selector (but possibly only one will be clickable, basically loop until clicked)
      for (let i = 0; i < count; i++) {
        const clicked = await locator.nth(i).click({ trial: false, force: false, timeout: 400 })
          .then(() => true).catch(() => false);
        if (clicked) break;
      }
    }
});


// Field-only resolution (id/name/label/placeholder/data-test-id, exact
// before partial) when no explicit prefix is given - see
// resolveFieldLocator() in locator.ts for the full cascade.
When('I set field {string} to {string}', async ({ page, vars }, selector, value) => {
  const locator = await resolveFieldLocator(page, resolveVars(selector, vars));
  await locator.fill(resolveVars(value, vars));
});

When('I set the {string} field {string} to {string}', async ({ page, vars }, nth, selector, value) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.nth(parseInt(nth, 10) - 1).fill(resolveVars(value, vars));
});

// When I get field "css:.ds-invite-input" value into variable "inviteLink"
// Same resolution as "I set field" - useful for reading a readonly/generated
// value (an invite link, a generated code, etc) so a later step can reuse it
// via +var(name).
When('I get field {string} value into variable {string}', async ({ page, vars }, selector, varName) => {
  const locator = await resolveFieldLocator(page, resolveVars(selector, vars));
  vars.set(varName, await locator.inputValue());
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