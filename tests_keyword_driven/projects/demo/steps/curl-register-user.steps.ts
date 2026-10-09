// location: tests_keyword_driven/projects/demo/steps/curl-register-user.steps.ts
//
// Same filename as generic/steps/curl-register-user.steps.ts - this file
// replaces it entirely for this project (see buildSteps.ts). Currently an
// exact copy; the point is to customize THIS copy when the demo's real
// registration endpoint needs something the generic version doesn't.

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../../../generic/support/vars';
import { curlUnauthenticated } from '../../../generic/steps/curl.steps';

const { When } = createBdd(test);

// When I curl register username "bob" email "bob@example.com" and pass "b0bsBadPass!"
//
// Registration needs no credentials at all, so this just calls
// curlUnauthenticated() (curl.steps.ts) directly - no need to re-derive
// "get an unauthenticated context, call the template" here, that's exactly
// what it already does.
When(
  'I curl register username {string} email {string} and pass {string}',
  async ({ vars }, usernameToken, emailToken, passToken) => {
    const response = await curlUnauthenticated('auth/register', {
      username: resolveVars(usernameToken, vars),  email: resolveVars(emailToken, vars),
      password: resolveVars(passToken, vars),
    });
    const responseText = await response.text();
    if (responseText.includes('error')) { throw new Error(`Response contains error: ${responseText}`); }
  },
);

When(
  'I curl register username {string} email {string}',
  async ({ vars }, usernameToken, emailToken) => {
    let passToken = '_AUTO_USER_PASS';     // assumed pass is : _AUTO_USER_PASS
    let resolvedPassToken = resolveVars(passToken, vars);
    const response = await curlUnauthenticated('auth/register', {
      username: resolveVars(usernameToken, vars),
      email: resolveVars(emailToken, vars),
      password: resolvedPassToken,
    });
    const responseText = await response.text();
    if (responseText.includes('error')) { throw new Error(`Response contains error: ${responseText}`); }
  },
);

// Before you can use this, you will need to add your own curl template ie:
// tests_keyword_driven/projects/<project_name>/curl-templates/auth/register.curl
// When I curl register "5" users using name prefix "_AUTO_USER_MIKES_NAME_PREFIX" email prefix "_AUTO_USER_MIKES_EMAIL_PREFIX" and pass "_AUTO_USER_MIKES_PASS"
When(
  'I curl register {string} users using name prefix {string} email prefix {string} and pass {string}',
  async ({ vars }, count, namePrefixToken, emailPrefixToken, passToken) => {
    await curlRegisterUsers(
      parseInt(resolveVars(count, vars), 10), resolveVars(namePrefixToken, vars),
      resolveVars(emailPrefixToken, vars), resolveVars(passToken, vars),
      resolveVars('_AUTO_USER_EMAIL_DOMAIN', vars),
    );
  },
);


When(
  'I curl register {string} users using name prefix {string} email prefix {string}',
  async ({ vars }, count, namePrefixToken, emailPrefixToken) => {
    let passToken = '_AUTO_USER_PASS';     // assumed pass is : _AUTO_USER_PASS
    let resolvedPassToken = resolveVars(passToken, vars);
    await curlRegisterUsers(
      parseInt(resolveVars(count, vars), 10), resolveVars(namePrefixToken, vars),
      resolveVars(emailPrefixToken, vars), resolvedPassToken,
      resolveVars('_AUTO_USER_EMAIL_DOMAIN', vars),
    );
  },
);



// Same as the single-user step above, just looped - uses curlUnauthenticated()
// per call rather than managing its own context, same reasoning.
export async function curlRegisterUsers(total: number, namePrefix: string, emailPrefix: string, password: string, emailDomain: string,): Promise<void> {
  const results = await Promise.all(
    Array.from({ length: total }, async (_, i) => {
      const username = `${namePrefix}${i + 1}`;
      // this will find the project specific curl if there is one:
      const response = await curlUnauthenticated('auth/register', { username, email: `${emailPrefix}${i + 1}@${emailDomain}`, password,});
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
}