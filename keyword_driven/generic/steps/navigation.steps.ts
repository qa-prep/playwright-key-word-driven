// location: keyword_driven/steps/generic/navigation.steps.ts
// go to, page refresh, browser back/forward

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';

const { Given, When } = createBdd(test);

When('I go to {string}', async ({ page, vars }, url) => {
  await page.goto(resolveVars(url, vars));
});

Given('I am on {string}', async ({ page, vars }, url) => {
  await page.goto(resolveVars(url, vars));
});

When('I page refresh', async ({ page }) => {
  await page.reload();
});

When('I click the browser back button', async ({ page }) => {
  await page.goBack();
});

When('I click the browser forward button', async ({ page }) => {
  await page.goForward();
});

When('I set browser width {string} height {string}', async ({ page }, widthStr, heightStr) => {
  const width = parseInt(widthStr, 10);
  const height = parseInt(heightStr, 10);
  await page.setViewportSize({ width, height });
});

When('I set browser width {string}', async ({ page }, widthStr) => {
  const width = parseInt(widthStr, 10);
  const current = page.viewportSize();
  await page.setViewportSize({ width, height: current?.height ?? 720 });
});

When('I set browser height {string}', async ({ page }, heightStr) => {
  const height = parseInt(heightStr, 10);
  const current = page.viewportSize();
  await page.setViewportSize({ width: current?.width ?? 1280, height });
});