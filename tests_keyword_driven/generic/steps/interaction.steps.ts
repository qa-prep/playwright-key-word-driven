// location: tests_keyword_driven/generic/steps/interaction.steps.ts

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
//
// Checkbox/radio are special-cased: Playwright's .fill() only works on
// text-like inputs and throws outright on a checkbox, regardless of what
// string you pass it. "true"/"1"/"yes"/"checked" (case-insensitive) set it
// checked, anything else unchecks it - via .setChecked(), which is already
// idempotent (a no-op if the box is already in the wanted state).
When('I set field {string} to {string}', async ({ page, vars }, selector, value) => {
  const locator = await resolveFieldLocator(page, resolveVars(selector, vars));
  const resolvedValue = resolveVars(value, vars);
  const inputType = await locator.getAttribute('type').catch(() => null);
  if (inputType === 'checkbox' || inputType === 'radio') {
    const truthy = ['true', '1', 'yes', 'checked'].includes(resolvedValue.toLowerCase());
    await locator.setChecked(truthy);
  } else {
    await locator.fill(resolvedValue);
  }
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

// When I get clipboard into variable "inviteLink"
// Reads the REAL OS/browser clipboard (navigator.clipboard.readText()), for
// when the thing under test is an actual Copy-button-writes-to-clipboard
// flow, not just a value sitting in a field. clipboard-read/clipboard-write
// are Chromium-only permissions in Playwright - this will throw on
// firefox/webkit, which is expected, not swallowed, since there's nothing
// sensible to test there.
When('I get clipboard into variable {string}', async ({ page, context, vars }, varName) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const text = await page.evaluate(() => navigator.clipboard.readText());
  vars.set(varName, text);
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

// Idempotent expand/collapse for a standard ARIA disclosure toggle
// (aria-expanded="true"/"false" on the clickable element itself, eg a
// <button class="ds-collapse-toggle" aria-expanded="...">). Only clicks if
// the element isn't already in the wanted state - safe to call regardless
// of current state, which is the whole point: you never have to know/assert
// what state a collapsible was left in by a previous step.
//
// No-nth form acts on EVERY matching element (eg. "expand every options
// group on this page" in one step); the nth form targets just one.
async function setExpanded(page: any, vars: Map<string, string>, selector: string, wantExpanded: boolean, nth?: string) {
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  const indices = nth !== undefined ? [parseInt(nth, 10) - 1] : [...Array(await locator.count()).keys()];
  for (const i of indices) {
    const el = locator.nth(i);
    const isExpanded = (await el.getAttribute('aria-expanded')) === 'true';
    if (isExpanded !== wantExpanded) {
      await el.click();
    }
  }
}

When('I expand {string}', async ({ page, vars }, selector) => {
  await setExpanded(page, vars, selector, true);
});

When('I collapse {string}', async ({ page, vars }, selector) => {
  await setExpanded(page, vars, selector, false);
});

When('I expand the {string} {string}', async ({ page, vars }, nth, selector) => {
  await setExpanded(page, vars, selector, true, nth);
});

When('I collapse the {string} {string}', async ({ page, vars }, nth, selector) => {
  await setExpanded(page, vars, selector, false, nth);
});