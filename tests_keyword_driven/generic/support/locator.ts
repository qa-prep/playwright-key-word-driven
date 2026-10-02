// location: tests_keyword_driven/support/locator.ts
import { Page, Locator } from '@playwright/test';

type CandidateFn = (value: string) => Locator;

// role:<roleType>:<name>[,<option>:<value>...], e.g.
//   role:link:Teams
//   role:link:Teams,exact:true
//   role:heading:Title,level:2
// Options match Playwright's getByRole() options (exact/checked/disabled/
// expanded/includeHidden/pressed/selected are booleans, level is a number -
// anything else is passed through as a plain string). Split on comma for
// options, so a name containing a literal comma isn't supported - use a
// different locator strategy (css:, text:, etc) for that case.
function parseRoleValue(value: string): [string, Record<string, unknown>] {
  const [roleAndName, ...optionParts] = value.split(',');
  const colonIndex = roleAndName.indexOf(':');
  const roleType = colonIndex === -1 ? roleAndName : roleAndName.slice(0, colonIndex);
  const name = colonIndex === -1 ? '' : roleAndName.slice(colonIndex + 1);

  const options: Record<string, unknown> = { name };
  for (const part of optionParts) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const rawValue = part.slice(idx + 1).trim();
    if (rawValue === 'true') options[key] = true;
    else if (rawValue === 'false') options[key] = false;
    else if (rawValue !== '' && Number.isFinite(Number(rawValue))) options[key] = Number(rawValue);
    else options[key] = rawValue;
  }
  return [roleType, options];
}

// Explicit prefixes, if given, use directly, no guessing, no cascade (fast path).
function buildPrefixedLocator(page: Page, selector: string): Locator | null {
  // Auto-detect XPath by its own unmistakable syntax - no "xpath:" prefix
  // needed for //div, (//button)[1], etc, matching the auto-detection most
  // keyword-driven frameworks already do. The explicit xpath: prefix below
  // still works too - mainly for a RELATIVE xpath that doesn't start with
  // "//" (eg. xpath:.//div), which this can't distinguish from plain text.
  if (selector.startsWith('//') || selector.startsWith('(')) {
    return page.locator(`xpath=${selector}`);
  }

  const prefixHandlers: [string, CandidateFn][] = [
    ['text:', (v) => page.getByText(v)],
    ['css:', (v) => page.locator(v)],
    ['cssSelector:', (v) => page.locator(v)],
    ['xpath:', (v) => page.locator(`xpath=${v}`)],
    ['id:', (v) => page.locator(`#${v}`)],
    ['name:', (v) => page.locator(`[name="${v}"]`)],
    ['class:', (v) => page.locator(`.${v}`)],
    ['className:', (v) => page.locator(`.${v}`)],
    ['placeholder:', (v) => page.getByPlaceholder(v)],
    ['ariaLabel:', (v) => page.getByLabel(v)],
    ['aria-label:', (v) => page.getByLabel(v)],
    ['linkText:', (v) => page.getByRole('link', { name: v, exact: true })],
    ['partialLinkText:', (v) => page.getByRole('link', { name: v })],
    ['tagName:', (v) => page.locator(v)],
    ['data-test-id:', (v) => page.locator(`[data-test-id="${v}"]`)],
    ['role:', (v) => {
      const [roleType, options] = parseRoleValue(v);
      return page.getByRole(roleType as any, options as any);
    }],
  ];

  for (const [prefix, fn] of prefixHandlers) {
    if (selector.startsWith(prefix)) return fn(selector.slice(prefix.length));
  }
  return null;
}

async function candidateExists(locator: Locator): Promise<boolean> {
  try { return (await locator.count()) > 0; } catch { return false; }
}

// getByLabel() only matches a <label for="id">/<input id>, a <label> that
// WRAPS its input, or aria-labelledby - it does nothing for a <label> that's
// merely a nearby sibling with no linking attribute at all, e.g.
//   <div class="ds-floating-label"><input><label>Username or Email</label></div>
// which is a real, common pattern in this app's forms (no for/id, label not
// wrapping the input). This finds the label by its text, then walks UP
// through ancestors to the NEAREST one that also contains an input/textarea/
// select (XPath's ancestor:: axis is nearest-first per spec, so `[1]` here
// is the closest qualifying container, not the outermost), then returns the
// field within it. Covers both a one-level sibling wrapper (like the one
// above) and a deeper one (eg. a label and its field in separate child divs
// under one shared row) without needing to know the wrapper's class name.
function siblingLabelFieldLocator(page: Page, text: string, exact: boolean): Locator {
  const label = page.getByText(text, { exact }).locator('xpath=ancestor-or-self::label[1]');
  const container = label.locator('xpath=ancestor::*[.//input or .//textarea or .//select][1]');
  return container.locator('input, textarea, select').first();
}

// select option (native dropdown) or a styled trigger - [role=combobox],
// [role=listbox], [aria-haspopup] - matched by visible text. Shared between
// resolveLocator's fallback and resolveClickTarget's dropdown tier, but
// unlike resolveClickTarget this returns the OPTION element itself (not the
// <select>) for native dropdowns - for a general "find this described
// element" cascade, the option IS the thing being described.
function dropdownLikeLocator(page: Page, text: string, exact: boolean): Locator {
  const textMatch = `:${exact ? 'text-is' : 'text'}(${JSON.stringify(text)})`;
  return page
    .locator(`select option${textMatch}`)
    .or(page.getByRole('combobox', { name: text, exact }))
    .or(page.getByRole('listbox', { name: text, exact }))
    .or(page.locator(`[aria-haspopup]${textMatch}`));
}

// Fallback cascade for resolveLocator (asserts, fills, hover, scroll, etc -
// every step that isn't "I click" or "I set field", which each have their
// own dedicated cascades). Same two-tier shape as those: every type tried
// as an EXACT match first, then every type again as a case-insensitive
// PARTIAL (substring) match - "Copy" should find an exact <button>Copy</button>
// before it ever considers a looser match. Structural/attribute identifiers
// (data-testid, id, name, class) come first in each tier since they're the
// most deliberately-placed, then label/placeholder (form semantics), then
// role-based matches (link/button/dropdown/radio/checkbox - "describe what
// you see on the page" matches), then plain text as the final catch-all.
function fallbackCandidates(page: Page, text: string, exact: boolean): Locator[] {
  const quoted = JSON.stringify(text);
  if (exact) {
    return [
      page.locator(`[data-testid="${text}"]`),
      page.locator(`[data-test-id="${text}"]`),
      page.locator(`#${text}`),
      page.locator(`[name="${text}"]`),
      page.locator(`.${text}`),
      page.getByLabel(text, { exact: true }),
      siblingLabelFieldLocator(page, text, true),
      page.getByPlaceholder(text, { exact: true }),
      page.getByRole('link', { name: text, exact: true }),
      page.getByRole('button', { name: text, exact: true }),
      dropdownLikeLocator(page, text, true),
      page.getByRole('radio', { name: text, exact: true }),
      page.getByRole('checkbox', { name: text, exact: true }),
      page.getByText(text, { exact: true }),
    ];
  }
  return [
    page.locator(`[data-testid*=${quoted} i]`),
    page.locator(`[data-test-id*=${quoted} i]`),
    page.locator(`[id*=${quoted} i]`),
    page.locator(`[name*=${quoted} i]`),
    page.locator(`[class*=${quoted} i]`),
    page.getByLabel(text),
    siblingLabelFieldLocator(page, text, false),
    page.getByPlaceholder(text),
    page.getByRole('link', { name: text }),
    page.getByRole('button', { name: text }),
    dropdownLikeLocator(page, text, false),
    page.getByRole('radio', { name: text }),
    page.getByRole('checkbox', { name: text }),
    page.getByText(text),
  ];
}

// The cascade — mirrors getExistingFieldIdentifier: try each strategy in priority
// order against the live page, retrying with backoff until timeout.
export async function resolveLocator(
  page: Page,
  rawSelector: string,
  timeoutMs = 6000,
): Promise<Locator> {

  const prefixed = buildPrefixedLocator(page, rawSelector);
  if (prefixed) return prefixed; // explicit type given — trust it, skip the cascade entirely

  const start = Date.now();
  let attempt = 0;

  while (Date.now() - start < timeoutMs) {
    for (const exact of [true, false]) { // every type exact, THEN every type partial
      for (const candidate of fallbackCandidates(page, rawSelector, exact)) {
        if (await candidateExists(candidate)) return candidate;
      }
    }
    attempt++;
    await page.waitForTimeout(Math.min(150 * attempt, 1000)); // backoff, same idea as your 0.15 * ge_attempts, capped
  }

  // nothing matched in time — return the most permissive locator anyway, so
  // Playwright's own "element not found" error carries the actual selector
  return page.getByText(rawSelector);
}

// --- Click-only resolution (used by "I click {string}" when no explicit
// prefix is given - a "css:"/"role:"/etc selector still skips straight to
// buildPrefixedLocator above, same as resolveLocator) -----------------------
//
// Ported from an earlier framework: guesses what's clickable by its visible
// text, trying every EXACT match first (across all types below, in this
// order), then falling back to every PARTIAL (substring) match in the same
// order. An exact button beats a partial link, e.g. "Submit" matches an
// exact <button>Submit</button> even if a <button>Submit for review</button>
// also exists. This is deliberately a different cascade from resolveLocator
// (which is id/data-testid/name/class/label/placeholder/text, for asserts
// and fills) - "what's clickable by text" and "any element by attributes"
// are different questions.
//
// Types tried, per tier (exact, then partial):
//   1. link            getByRole('link')
//   2. button          getByRole('button')
//   3. dropdown        a native <select> containing a matching <option>,
//                      else a styled trigger - [role=combobox],
//                      [role=listbox], or anything with [aria-haspopup] -
//                      matched by its own visible text
//   4. radio button    getByRole('radio') - matched by its label text
//   5. checkbox        getByRole('checkbox') - matched by its label text
export type ClickTarget = { locator: Locator; selectOptionLabel?: string };

// select:has(option:text-is("...")) / :text("...") - Playwright's own CSS
// text pseudo-classes, JSON.stringify quotes+escapes the text safely.
async function findNativeSelectOption(page: Page, text: string, exact: boolean): Promise<ClickTarget | null> {
  const optionMatch = `:${exact ? 'text-is' : 'text'}(${JSON.stringify(text)})`;
  const select = page.locator(`select:has(option${optionMatch})`).first();
  if (!(await candidateExists(select))) return null;

  // selectOption() needs the option's real/full label, not our (possibly
  // partial) search text, so read it off the matched <option> itself.
  const optionText = await select.locator(`option${optionMatch}`).first().textContent();
  if (optionText === null) return null;
  return { locator: select, selectOptionLabel: optionText.trim() };
}

function dropdownLookalike(page: Page, text: string, exact: boolean): Locator {
  const textMatch = `:${exact ? 'text-is' : 'text'}(${JSON.stringify(text)})`;
  return page
    .getByRole('combobox', { name: text, exact })
    .or(page.getByRole('listbox', { name: text, exact }))
    .or(page.locator(`[aria-haspopup]${textMatch}`));
}

async function clickCandidates(page: Page, text: string, exact: boolean): Promise<ClickTarget[]> {
  const dropdownOption = await findNativeSelectOption(page, text, exact);
  return [
    { locator: page.getByRole('link', { name: text, exact }) },
    { locator: page.getByRole('button', { name: text, exact }) },
    ...(dropdownOption ? [dropdownOption] : [{ locator: dropdownLookalike(page, text, exact) }]),
    { locator: page.getByRole('radio', { name: text, exact }) },
    { locator: page.getByRole('checkbox', { name: text, exact }) },
  ];
}

export async function resolveClickTarget(
  page: Page,
  rawSelector: string,
  timeoutMs = 6000,
): Promise<ClickTarget> {
  const prefixed = buildPrefixedLocator(page, rawSelector);
  if (prefixed) return { locator: prefixed }; // explicit type given — trust it, skip the cascade entirely

  const start = Date.now();
  let attempt = 0;

  while (Date.now() - start < timeoutMs) {
    for (const exact of [true, false]) { // every type exact, THEN every type partial
      for (const candidate of await clickCandidates(page, rawSelector, exact)) {
        if (await candidateExists(candidate.locator)) return candidate;
      }
    }
    attempt++;
    await page.waitForTimeout(Math.min(150 * attempt, 1000));
  }

  return { locator: page.getByText(rawSelector) };
}

// --- Field-only resolution (used by "I set field {string} to ..." when no
// explicit prefix is given) --------------------------------------------------
//
// Same two-tier shape as resolveClickTarget: every type tried as an EXACT
// match first, and only once every exact candidate has failed does it fall
// back to a case-insensitive PARTIAL (substring) match. That ordering is
// deliberate - exact always wins, e.g. if both id="user" and id="users"
// exist on the page, searching "user" always hits the exact id="user" field,
// never "users", regardless of DOM order.
//
// Types tried, per tier:
//   1. id    2. name    3. label    4. placeholder    5. data-test-id
// getByLabel/getByPlaceholder are already case-insensitive substring
// matches when exact:false (Playwright's own default) - id/name have no
// such built-in, hence the explicit CSS [attr*="..." i] substring+
// case-insensitive selector for those two.
function fieldCandidates(page: Page, text: string, exact: boolean): Locator[] {
  if (exact) {
    return [
      page.locator(`#${text}`),
      page.locator(`[name="${text}"]`),
      page.getByLabel(text, { exact: true }),
      siblingLabelFieldLocator(page, text, true),
      page.getByPlaceholder(text, { exact: true }),
      page.locator(`[data-test-id="${text}"]`),
    ];
  }
  const quoted = JSON.stringify(text); // safe CSS string escaping, same as the :text()/:text-is() pseudo-classes above
  return [
    page.locator(`[id*=${quoted} i]`),
    page.locator(`[name*=${quoted} i]`),
    page.getByLabel(text),
    siblingLabelFieldLocator(page, text, false),
    page.getByPlaceholder(text),
    page.locator(`[data-test-id*=${quoted} i]`),
  ];
}

export async function resolveFieldLocator(
  page: Page,
  rawSelector: string,
  timeoutMs = 6000,
): Promise<Locator> {
  const prefixed = buildPrefixedLocator(page, rawSelector);
  if (prefixed) return prefixed; // explicit type given — trust it, skip the cascade entirely

  const start = Date.now();
  let attempt = 0;

  while (Date.now() - start < timeoutMs) {
    for (const exact of [true, false]) { // every type exact, THEN every type partial
      for (const candidate of fieldCandidates(page, rawSelector, exact)) {
        if (await candidateExists(candidate)) return candidate;
      }
    }
    attempt++;
    await page.waitForTimeout(Math.min(150 * attempt, 1000));
  }

  return page.getByText(rawSelector);
}