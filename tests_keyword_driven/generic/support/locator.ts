// location: tests_keyword_driven/support/locator.ts
import { Page, Locator } from '@playwright/test';

type CandidateFn = (value: string) => Locator;

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
      const [roleType, ...nameParts] = v.split(':');
      return page.getByRole(roleType as any, { name: nameParts.join(':') });
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