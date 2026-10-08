// location: tests_keyword_driven/generic/support/apiClient.ts
import { request as playwrightRequest, APIRequestContext, APIResponse } from '@playwright/test';
import { loadCurlTemplate, curlTemplateExists, CurlVars } from './curlTemplateLoader';

const ENV = process.env.TEST_ENV ?? 'local';

let cachedContext: APIRequestContext | null = null;
let cachedUnauthContext: APIRequestContext | null = null;

// Every request in this file goes through a template. The template owns the
// full URL (typically starting with _API_URL, but any URL works), so there is
// deliberately no baseURL on the context below.
export async function callTemplate(
  context: APIRequestContext,
  templateName: string,
  vars: CurlVars,
): Promise<APIResponse> {
  const parsed = loadCurlTemplate(templateName, vars);
  try {
    return await context.fetch(parsed.url, { method: parsed.method, headers: parsed.headers, data: parsed.body });
  } catch (err) {
    const leftover = parsed.url.match(/(?<![A-Za-z0-9_])_[A-Za-z][A-Za-z0-9_]*/);
    const hint = leftover
      ? `\n"${leftover[0]}" was not replaced: it is not defined in config/${ENV}.env (or the env file was not loaded).`
      : '';
    throw new Error(
      `curl template "${templateName}" failed: ${parsed.method} ${parsed.url}\n${(err as Error).message}${hint}`,
    );
  }
}

// One context per worker, no login attempt at all - for calling a public
// endpoint (eg. registration) that needs no credentials and shouldn't be
// coupled to whether an automation account is even configured for this
// project. "I curl template ... into variable ..." (no "as auto"/"as
// user ...") uses this.
export async function getUnauthenticatedCurlContext(): Promise<APIRequestContext> {
  if (cachedUnauthContext) return cachedUnauthContext;
  cachedUnauthContext = await playwrightRequest.newContext();
  return cachedUnauthContext;
}

// One context per worker. If curl-templates/auth/login.curl exists it is
// called once; the context keeps any cookies the response sets, so later
// templates are authenticated automatically. No login template, OR a login
// attempt that fails (eg. _AUTOMATION_API_USERNAME1/_AUTOMATION_API_PASSWORD1
// not filled in yet), both mean the same thing from here: no automatic auth
// available, so just continue with an unauthenticated context rather than
// failing outright - that's fine for public APIs (eg. registration), which
// is also the common case for a project that hasn't set up an automation
// account yet at all. Whatever actually needs the automation account (eg.
// test-automation/* endpoints) will fail on its own, from its own real
// permission check, the moment it's actually called unauthenticated -
// that's a clearer signal than failing here, before the caller even tried
// to do anything that needed it.
//
// auth/login.curl takes +var(login)/+var(password) rather than hardcoding
// an account, same as auth/register.curl takes +var(username) etc - this
// just happens to always log in as the automation account, since that's
// the one every other test-automation template needs an authenticated
// context for. Call the template directly with different credentials for
// anything else (eg. a super admin session).
export async function getAutomationUserCurlContext(): Promise<APIRequestContext> {
  if (cachedContext) return cachedContext;

  const context = await playwrightRequest.newContext();

  if (curlTemplateExists('auth/login')) {
    const loginResponse = await callTemplate(context, 'auth/login', {
      login: process.env._AUTOMATION_API_USERNAME1 ?? '',
      password: process.env._AUTOMATION_API_PASSWORD1 ?? '',
    });
    if (!loginResponse.ok()) {
      const body = await loginResponse.text();
      console.warn(
        `getAutomationUserCurlContext: automation-account login failed (${loginResponse.status()}) ${body} - ` +
        `continuing with an UNAUTHENTICATED context. Fine for public endpoints; fill in ` +
        `_AUTOMATION_API_USERNAME1/_AUTOMATION_API_PASSWORD1 in your env file if something you call actually needs it.`,
      );
    }
  }

  cachedContext = context;
  return cachedContext;
}

// Ad-hoc, ONE-SHOT context authenticated as whichever user actually has the
// permission a call needs (a moderator, a team owner, etc), instead of
// getAutomationUserCurlContext()'s single cached automation-account session.
// This is the alternative to adding another test-only backend endpoint
// every time a different permission is needed - the real endpoint already
// exists, it just needs to be called as a user who's actually allowed to
// call it. Not cached: the caller must dispose() it when done, same as any
// context it created itself.
export async function getAsUserCurlContext(login: string, password: string): Promise<APIRequestContext> {
  const context = await playwrightRequest.newContext();
  const loginResponse = await callTemplate(context, 'auth/login', { login, password });
  if (!loginResponse.ok()) {
    const body = await loginResponse.text();
    await context.dispose();
    throw new Error(`getAsUserCurlContext: login failed for "${login}": ${loginResponse.status()} ${body}`);
  }
  return context;
}