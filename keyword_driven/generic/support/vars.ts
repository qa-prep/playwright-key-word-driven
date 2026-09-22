// location: keyword_driven/support/vars.ts

import { test as base } from 'playwright-bdd';
import { expect } from '@playwright/test';

type Fixtures = { vars: Map<string, string> };

export const test = base.extend<Fixtures>({
  vars: async ({}, use, testInfo) => {
    const vars = new Map<string, string>();
    vars.set('browserName', testInfo.project.name);
    await use(vars);
  },
});

export { expect };

export function resolveVars(input: string, vars: Map<string, string>): string {
  return input.replace(/\+var\(([^)]+)\)/g, (_, key) => vars.get(key) ?? '');
}