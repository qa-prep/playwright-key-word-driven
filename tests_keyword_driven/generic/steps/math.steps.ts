// location: tests_keyword_driven/generic/steps/math.steps.ts
//
// Arithmetic that writes its result into a variable - "I should see variable
// X is Y" (assertions-var.steps.ts) already covers comparing two values, so
// there's no separate "I math X == Y" assert step here, just the operations
// that actually compute something new.

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';

const { When } = createBdd(test);

function toNumber(raw: string, label: string): number {
  const n = Number(raw);
  if (Number.isNaN(n)) { throw new Error(`I math: "${label}" is not a number (got "${raw}")`); }
  return n;
}

// When I math "total" = "+var(subtotal)" + "+var(tax)"
When('I math {string} = {string} + {string}', async ({ vars }, name, aRaw, bRaw) => {
  const a = toNumber(resolveVars(aRaw, vars), aRaw);
  const b = toNumber(resolveVars(bRaw, vars), bRaw);
  vars.set(name, String(a + b));
});

// When I math "remaining" = "+var(total)" - "+var(used)"
When('I math {string} = {string} - {string}', async ({ vars }, name, aRaw, bRaw) => {
  const a = toNumber(resolveVars(aRaw, vars), aRaw);
  const b = toNumber(resolveVars(bRaw, vars), bRaw);
  vars.set(name, String(a - b));
});

// When I math "average" = "+var(total)" divided by "+var(count)"
When('I math {string} = {string} divided by {string}', async ({ vars }, name, aRaw, bRaw) => {
  const a = toNumber(resolveVars(aRaw, vars), aRaw);
  const b = toNumber(resolveVars(bRaw, vars), bRaw);
  if (b === 0) { throw new Error(`I math: division by zero ("${name}" = "${aRaw}" divided by "${bRaw}")`); }
  vars.set(name, String(a / b));
});
