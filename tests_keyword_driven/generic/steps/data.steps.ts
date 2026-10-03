// location: tests_keyword_driven/generic/steps/data.steps.ts
import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { testAutomationApi } from '../support/testAutomationApi';

const { Given, When } = createBdd(test);

Given('I set variable {string} to {string}', async ({ vars }, name, value) => {
  vars.set(name, resolveVars(value, vars));
});

// Given I set variable "teamUrl" to URL
// Captures the CURRENT page url (eg. right after "Then I should see url
// contains..." confirms you've landed somewhere dynamic, like a newly
// created team's own page) so a later step can navigate back to it.
Given('I set variable {string} to URL', async ({ page, vars }, name) => {
  vars.set(name, page.url());
});

// Given I set variable "teamId" from field "data.team_id" of variable "teamSaveResponse"
// Pulls one value out of a captured JSON API response (eg. from "I call
// curl template ... into variable ...") via a dot-separated path, for when
// a LATER call only needs one field (an id) out of a bigger response, not
// the whole thing - chaining "create X" -> "approve X" -> "use X" across
// separate curl calls.
Given(
  'I set variable {string} from field {string} of variable {string}',
  async ({ vars }, name, fieldPath, sourceVarName) => {
    const raw = vars.get(sourceVarName);
    if (raw === undefined) {
      throw new Error(`I set variable ... from field: variable "${sourceVarName}" is not set`);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`I set variable ... from field: variable "${sourceVarName}" is not valid JSON: ${raw}`);
    }
    let value: unknown = parsed;
    for (const key of fieldPath.split('.')) {
      if (value === null || typeof value !== 'object') { value = undefined; break; }
      value = (value as Record<string, unknown>)[key];
    }
    if (value === undefined) {
      throw new Error(`I set variable ... from field: path "${fieldPath}" not found in variable "${sourceVarName}" (${raw})`);
    }
    vars.set(name, typeof value === 'string' ? value : JSON.stringify(value));
  },
);

// goes through the backend's own tiered cleanup (moderation queue, team
// ownership, personal tables, etc), not just a direct delete on ds_core_users.
// for a direct-query example instead of the api, see db/entities/users.ts
// (deleteUserByEmail/getUserIdByEmail) and tests/db_test.spec.ts.
Given('I clean up user data for email {string}', async ({ vars }, email) => {
  await testAutomationApi.deleteUserByEmail(resolveVars(email, vars));
});

// bulk sweep: use this once per suite/run (e.g. with your test-run's email
// prefix) instead of calling the single-email cleanup once per test - that's
// what keeps the query count flat when many tests run in parallel
Given('I clean up user data for email contains {string}', async ({ vars }, emailContains) => {
  await testAutomationApi.deleteUsersByEmailContains(resolveVars(emailContains, vars));
});

// Creates {count} users named {namePrefix}1.. {namePrefix}{count} with
// emails {emailPrefix}1@<AUTO_USER_EMAIL_DOMAIN>.. {emailPrefix}{count}@<AUTO_USER_EMAIL_DOMAIN>, all
// sharing {password}, in one batch-create call (see
// testAutomationApi.createUsers()). namePrefix/emailPrefix/password are
// resolved like any other value, so this is normally called with _TOKEN
// settings (e.g. _AUTO_USER_MIKES_NAME_PREFIX) rather than literals -
// that's what lets someone else pick their own prefix and never collide
// with yours.
When(
  'I create {string} users using name {string} email {string} and pass {string}',
  async ({ vars }, count, namePrefix, emailPrefix, password) => {
    await testAutomationApi.createUsers({
      count: parseInt(resolveVars(count, vars), 10),
      namePrefix: resolveVars(namePrefix, vars),
      emailPrefix: resolveVars(emailPrefix, vars),
      password: resolveVars(password, vars),
    });
  }
);

When('I script {string} to variable {string}', async ({ page, vars }, script, varName) => {
  const resolved = resolveVars(script, vars);
  const result = await page.evaluate(resolved);
  vars.set(varName, typeof result === 'string' ? result : JSON.stringify(result));
});