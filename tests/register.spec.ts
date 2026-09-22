// location: tests/register.spec.ts

import { test, expect } from '@playwright/test';

import { deleteUserByEmail } from '../db/entities/users';

test('user can register', { tag: '@register' }, async ({ page }, testInfo) => {

  const browser = testInfo.project.name; // 'chromium' | 'firefox' | 'webkit'
  const username = `username1_${browser}`; // to avoid parallel browser clashes. 
  const emailPrefix = 'testprefix+';
  const emailPostfix = '@example.com';

  const email = `${emailPrefix}${username}${emailPostfix}`;
  const password = "testPassword123!";
 
  await deleteUserByEmail(email); // prevent build up in test database (never do db operations in production code)

  await page.goto(`${process.env.APP_URL}/auth?mode=register`);
  await page.locator('input[type="text"]').fill(username);
  await page.locator('input[type="email"]').fill(email);
  await page.getByRole('textbox', { name: 'Password'}).fill(password);
  await page.getByRole('radio', { name: 'Yes'}).check();
  await page.getByRole('checkbox', { name: /I confirm I am over 18/}).check();
  await page.getByRole('checkbox', { name: /I agree to the/ }).check();
  await page.getByRole('button', { name: 'Accept all cookies'}).click();
  await page.getByRole('button', { name: 'Register' }).click();
  await expect( page.locator('h1')).toContainText('Welcome');


});