import { test, expect } from '@playwright/test';
import { getUserIdByEmail } from '../db/entities/users';

test('find user id', async () => {
  const userId = await getUserIdByEmail('auttickmail+leadTester67@gmail.com');

  console.log('leadTester67 user id:', userId);

  expect(userId).not.toBeNull();
});