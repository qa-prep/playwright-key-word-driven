// location: tests_keyword_driven/steps/generic/curl.steps.ts
//
// Steps that call a raw .curl template directly (see curlTemplateLoader.ts /
// callTemplate()), as opposed to the fixed test-automation-endpoint wrappers
// in data.steps.ts/database.ts. Named "curl", not "api", because everything
// in this framework ultimately hits an API - what's specific to this file is
// that it's driven by .curl template files, not the test-automation API.

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { getAutomationApiContext, callTemplate } from '../support/apiClient';

const { When } = createBdd(test);

// When I call curl template "auth/login" into variable "loginResponse"
//
// Runs curl-templates/<name>.curl (project-specific first, generic as
// fallback - see curlTemplateLoader.ts) using the shared API context (which
// has already done auth/login if that template exists). Every variable
// currently set in the test is available to the template as +var(name).
// Stores the response body in <varName> and the HTTP status in "<varName>.status".
When(
  'I call curl template {string} into variable {string}',
  async ({ vars }, templateName, varName) => {
    const api = await getAutomationApiContext();
    const response = await callTemplate(api, resolveVars(templateName, vars), Object.fromEntries(vars));
    vars.set(varName, await response.text());
    vars.set(`${varName}.status`, String(response.status()));
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

    const api = await getAutomationApiContext();
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