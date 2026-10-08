// location: tests_keyword_driven/generic/steps/curl.steps.ts
//
// Steps that call a raw .curl template directly (see curlTemplateLoader.ts /
// callTemplate()), as opposed to the fixed test-automation-endpoint wrappers
// in data.steps.ts/database.steps.ts. Named "curl", not "api", because everything
// in this framework ultimately hits an API - what's specific to this file is
// that it's driven by .curl template files, not the test-automation API.

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { getUnauthenticatedCurlContext, getAutomationUserCurlContext, getAsUserCurlContext, callTemplate } from '../support/apiClient';

const { When } = createBdd(test);

// When I curl template "auth/register" into variable "registerResponse"
//
// Runs curl-templates/<name>.curl (project-specific first, generic as
// fallback - see curlTemplateLoader.ts) with NO credentials at all - for a
// public endpoint (registration, etc) that needs none. Every variable
// currently set in the test is available to the template as +var(name).
// Stores the response body in <varName> and the HTTP status in
// "<varName>.status". Use "... as auto" for the automation account, or
// "... as user ... and pass ..." for a specific one.
When(
  'I curl template {string} into variable {string}',
  async ({ vars }, templateName, varName) => {
    const api = await getUnauthenticatedCurlContext();
    const response = await callTemplate(api, resolveVars(templateName, vars), Object.fromEntries(vars));
    vars.set(varName, await response.text());
    vars.set(`${varName}.status`, String(response.status()));
  },
);

// When I curl template "test-automation/delete-user-by-email" into variable "deleteResponse" as auto
//
// Same as the plain form above, but authenticates the shared, cached,
// per-worker context as the automation account first (see
// getAutomationUserCurlContext()) - use this for anything that actually
// needs to be a recognized caller (eg. test-automation/* endpoints, which
// reject anyone else server-side). The plain form needs no credentials at
// all, which is wrong for these.
When(
  'I curl template {string} into variable {string} as auto',
  async ({ vars }, templateName, varName) => {
    const api = await getAutomationUserCurlContext();
    const response = await callTemplate(api, resolveVars(templateName, vars), Object.fromEntries(vars));
    vars.set(varName, await response.text());
    vars.set(`${varName}.status`, String(response.status()));
  },
);

// When I curl template "team/approve-draft" as user "_SUPER_ADMIN_USERNAME1" and pass "_SUPER_ADMIN_PASSWORD1" into variable "approveResponse"
//
// Same as "I curl template ... into variable ...", but authenticates a
// fresh, one-shot context as the given user instead of using the shared
// automation-account context - call the REAL endpoint as whichever real
// user already has the permission it needs (a moderator, a team owner),
// rather than adding another test-only backend endpoint for every
// permission a test happens to need.
When(
  'I curl template {string} as user {string} and pass {string} into variable {string}',
  async ({ vars }, templateName, loginToken, passToken, varName) => {
    const login = resolveVars(loginToken, vars);
    const password = resolveVars(passToken, vars);
    const api = await getAsUserCurlContext(login, password);
    try {
      const response = await callTemplate(api, resolveVars(templateName, vars), Object.fromEntries(vars));
      vars.set(varName, await response.text());
      vars.set(`${varName}.status`, String(response.status()));
    } finally {
      await api.dispose();
    }
  },
);

// Before you can use this, you will need to add your own curl template ie:
// tests_keyword_driven/projects/<project_name>/curl-templates/auth/register.curl
// When I curl register "5" users using name prefix "_AUTO_USER_MIKES_NAME_PREFIX" email prefix "_AUTO_USER_MIKES_EMAIL_PREFIX" and pass "_AUTO_USER_MIKES_PASS"
When(
  'I curl register {string} users using name prefix {string} email prefix {string} and pass {string}',
  async ({ vars }, count, namePrefixToken, emailPrefixToken, passToken) => {
    const total = parseInt(resolveVars(count, vars), 10);
    const namePrefix = resolveVars(namePrefixToken, vars);
    const emailPrefix = resolveVars(emailPrefixToken, vars);
    const password = resolveVars(passToken, vars);
    const emailDomain = resolveVars('_AUTO_USER_EMAIL_DOMAIN', vars);

    const api = await getUnauthenticatedCurlContext();
    const results = await Promise.all(
      Array.from({ length: total }, async (_, i) => {
        const username = `${namePrefix}${i + 1}`;
        const response = await callTemplate(api, 'auth/register', { // this will find the project specific curl if there is one
          username,
          email: `${emailPrefix}${i + 1}@${emailDomain}`,
          password,
        });
        const json = await response.json().catch(() => null);
        const ok = response.ok() && json?.success !== false;
        return { username, ok, status: response.status(), body: json ?? (await response.text().catch(() => '')) };
      }),
    );

    const failures = results.filter((r) => !r.ok);
    if (failures.length > 0) {
      throw new Error(
        `auth/register failed for ${failures.length}/${total} user(s):\n` +
          failures.map((f) => `  ${f.username}: ${f.status} ${JSON.stringify(f.body)}`).join('\n'),
      );
    }
  },
);

