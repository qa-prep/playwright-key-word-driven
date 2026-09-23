// location: keyword_driven/generic/steps/tabs.steps.ts

import { createBdd } from 'playwright-bdd';
import { test, expect, resolveVars, activeTab, knownPages } from '../support/vars';
import { resolveLocator } from '../support/locator';
import { isDebug } from '../support/debug';

const { When } = createBdd(test);

When('I click {string} no newtab', async ({ page, vars }, selector) => {
  await page.evaluate(() => {
    document.querySelectorAll('[target="_blank"]').forEach((el) => {
      el.setAttribute('target', '_self');
    });
  });
  const locator = await resolveLocator(page, resolveVars(selector, vars));
  await locator.click();
});

When('I click {string} and switch to the new tab', async ({ page, vars }, selector) => {
  const locator = await resolveLocator(page, resolveVars(selector, vars));

  const countBefore = knownPages.length;
  await locator.click();
  await expect.poll(() => knownPages.length, {
    message: 'expected a new tab to open',
  }).toBeGreaterThan(countBefore);

  const newPage = knownPages[knownPages.length - 1];
  await newPage.waitForLoadState();
  activeTab.page = newPage;

  // if (isDebug('debug')) {console.log('debug: new tab url:', newPage.url());}
  
});

When('I switch to tab {string}', async ({ context }, indexStr) => {
  const pages = context.pages();
  const index = parseInt(indexStr, 10) - 1;
  activeTab.page = pages[index];
});

When('I switch to the original tab', async ({ context }) => {
  activeTab.page = context.pages()[0];
});

When('I close the current tab', async ({ context }) => {
  const pages = context.pages();
  const current = activeTab.page ?? pages[pages.length - 1];
  await current.close();
  activeTab.page = context.pages()[0];
});