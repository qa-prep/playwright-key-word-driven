// location: tests_keyword_driven/generic/support/vars.ts

import { test as base } from 'playwright-bdd';
import { expect } from '@playwright/test';
import path from 'path';
import type { Page } from '@playwright/test';
import { resolveTokens } from './envTokens';

type Fixtures = { vars: Map<string, string> };

// Shared across a single test: tracks which tab (Page) every step should act on.
// tabs.steps.ts is the only file that ever writes to this; every other step
// file is unaffected and unaware it exists.
export const activeTab: { page: Page | null } = { page: null };

// Every Page opened in the current test, in creation order (index 0 is always
// the original tab). Populated by a single context.on('page', ...) listener
// set up once per test below, so tab-switching steps never have to register
// their own one-off waitForEvent('page') listeners, which is what let a
// stale tab get picked up in tabs.steps.ts.
export const knownPages: Page[] = [];

export const test = base.extend<Fixtures>({
  vars: async ({}, use, testInfo) => {
    const vars = new Map<string, string>();
    vars.set('browserName', testInfo.project.name);
    vars.set('fixturePage', `file://${path.resolve(__dirname, '../fixtures/test-page.html')}`);
    vars.set('fixturePage2', `file://${path.resolve(__dirname, '../fixtures/test-page-2.html')}`);
    vars.set('tabsPage', `file://${path.resolve(__dirname, '../fixtures/tabs-page.html')}`);
    vars.set('locatorsPage', `file://${path.resolve(__dirname, '../fixtures/locators-page.html')}`);
    vars.set('clickByTextPage', `file://${path.resolve(__dirname, '../fixtures/click-by-text-page.html')}`);
    vars.set('setFieldPage', `file://${path.resolve(__dirname, '../fixtures/set-field-page.html')}`);
    vars.set('collapsePage', `file://${path.resolve(__dirname, '../fixtures/collapse-page.html')}`);
    vars.set('emailDomain', process.env._AUTO_USER_EMAIL_DOMAIN ?? 'example.com');
    await use(vars);
  },

  // Override the built-in `page` fixture. Every step still destructures
  // `page` exactly as before, but it now resolves to whichever tab is
  // currently active, checked fresh on every property access.
  page: async ({ page: originalPage, context }, use) => {
    activeTab.page = originalPage;
    knownPages.length = 0;
    knownPages.push(originalPage);
    context.on('page', (newPage) => {
      knownPages.push(newPage);
    });

    // Granted once per test, up front - a page's own navigator.clipboard.writeText()
    // call (eg. a real Copy button) needs this permission BEFORE it runs, not
    // after, or the write silently fails and "I get clipboard into variable"
    // reads back an empty string. clipboard-read/clipboard-write are
    // Chromium-only permissions in Playwright; caught and ignored on
    // firefox/webkit so this doesn't break every test on those browsers -
    // a clipboard step used there will fail loudly on its own instead.
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});

    const activePageProxy = new Proxy({}, {
      get(_target, prop) {
        const current = activeTab.page ?? originalPage;
        const value = (current as any)[prop];
        return typeof value === 'function' ? value.bind(current) : value;
      },
      set(_target, prop, value) {
        const current = activeTab.page ?? originalPage;
        (current as any)[prop] = value;
        return true;
      },
    }) as unknown as Page;

    await use(activePageProxy);
  },
});

export { expect };

export function resolveVars(input: string, vars: Map<string, string>): string {
  return resolveTokens(input, (key) => vars.get(key) ?? '');
}

// "I should see variable "teamSaveResponse.success" is "true"" - a dotted
// name that was never literally vars.set() (eg. a curl step only sets
// "<varName>" and "<varName>.status", not every field in the response)
// falls back to parsing the base variable as JSON and walking the rest of
// the dots as a field path into it, same traversal as "I set variable ...
// from field ... of variable ..." in data.steps.ts. A literal var with this
// exact dotted name (like the "<varName>.status" convention above) always
// wins over the JSON-path fallback, so existing explicit ".status" vars
// behave exactly as before.
export function resolveVarField(vars: Map<string, string>, name: string): string | undefined {
  const direct = vars.get(name);
  if (direct !== undefined) return direct;

  const dotIndex = name.indexOf('.');
  if (dotIndex === -1) return undefined;

  const raw = vars.get(name.slice(0, dotIndex));
  if (raw === undefined) return undefined;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }
  for (const key of name.slice(dotIndex + 1).split('.')) {
    if (value === null || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value : JSON.stringify(value);
}
