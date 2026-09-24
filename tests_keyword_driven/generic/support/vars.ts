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
