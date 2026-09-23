// location: keyword_driven/support/vars.ts

import { test as base } from 'playwright-bdd';
import { expect } from '@playwright/test';
import path from 'path';

type Fixtures = { vars: Map<string, string> };

export const test = base.extend<Fixtures>({
  vars: async ({}, use, testInfo) => {
    const vars = new Map<string, string>();
    vars.set('browserName', testInfo.project.name);
    vars.set('fixturePage', `file://${path.resolve(__dirname, '../fixtures/test-page.html')}`);
    vars.set('fixturePage2', `file://${path.resolve(__dirname, '../fixtures/test-page-2.html')}`);

    await use(vars);
  },
});

export { expect };

export function resolveVars(input: string, vars: Map<string, string>): string {
  return input.replace(/\+var\(([^)]+)\)/g, (_, key) => vars.get(key) ?? '');
}