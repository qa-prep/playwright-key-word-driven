// location: tests_keyword_driven/generic/support/apiClient.ts
import { request as playwrightRequest, APIRequestContext, APIResponse } from '@playwright/test';
import { loadCurlTemplate, curlTemplateExists, CurlVars } from './curlTemplateLoader';

const ENV = process.env.TEST_ENV ?? 'local';

let cachedContext: APIRequestContext | null = null;

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

// One context per worker. If curl-templates/auth/login.curl exists it is
// called once; the context keeps any cookies the response sets, so later
// templates are authenticated automatically. No login template means an
// unauthenticated context, which is fine for public APIs.
//
// auth/login.curl takes +var(login)/+var(password) rather than hardcoding
// an account, same as auth/register.curl takes +var(username) etc - this
// just happens to always log in as the automation account, since that's
// the one every other test-automation template needs an authenticated
// context for. Call the template directly with different credentials for
// anything else (eg. a super admin session).
export async function getAutomationApiContext(): Promise<APIRequestContext> {
  if (cachedContext) return cachedContext;

  const context = await playwrightRequest.newContext();

  if (curlTemplateExists('auth/login')) {
    const loginResponse = await callTemplate(context, 'auth/login', {
      login: process.env._AUTOMATION_API_USERNAME1 ?? '',
      password: process.env._AUTOMATION_API_PASSWORD1 ?? '',
    });
    if (!loginResponse.ok()) {
      const body = await loginResponse.text();
      await context.dispose();
      throw new Error(
        `API login failed: ${loginResponse.status()} ${body} ` +
        `(check the URL and credentials in curl-templates/auth/login.curl)`,
      );
    }
  }

  cachedContext = context;
  return cachedContext;
}