// location: same folder as waits.steps.ts, output.steps.ts

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';

const { When } = createBdd(test);

// When I spit "hello +var(name) from _API_URL"
When('I spit {string}', async ({ vars }, text) => {
  console.log(`[spit] ${resolveVars(text, vars)}`);
});