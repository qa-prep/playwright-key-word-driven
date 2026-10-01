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

// The cascade — mirrors getExistingFieldIdentifier: try each strategy in priority
// order against the live page, retrying with backoff until timeout.
export async function resolveLocator(
  page: Page,
  rawSelector: string,
  timeoutMs = 6000,
): Promise<Locator> {

  const prefixed = buildPrefixedLocator(page, rawSelector);
  if (prefixed) return prefixed; // explicit type given — trust it, skip the cascade entirely

  const strategies: CandidateFn[] = [
    (v) => page.locator(`[data-testid="${v}"]`),
    (v) => page.locator(`[data-test-id="${v}"]`),
    (v) => page.locator(`#${v}`),
    (v) => page.locator(`[name="${v}"]`),
    (v) => page.locator(`.${v}`),
    (v) => page.getByLabel(v),
    (v) => page.getByPlaceholder(v),
    (v) => page.getByText(v),
  ];

  const start = Date.now();
  let attempt = 0;

  while (Date.now() - start < timeoutMs) {
    for (const strategy of strategies) {
      const candidate = strategy(rawSelector);
      if (await candidateExists(candidate)) return candidate;
    }
    attempt++;
    await page.waitForTimeout(Math.min(150 * attempt, 1000)); // backoff, same idea as your 0.15 * ge_attempts, capped
  }

  // nothing matched in time — return the most permissive locator anyway, so
  // Playwright's own "element not found" error carries the actual selector
  return page.getByText(rawSelector);
}