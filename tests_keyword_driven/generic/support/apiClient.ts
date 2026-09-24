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
export async function getAutomationApiContext(): Promise<APIRequestContext> {
  if (cachedContext) return cachedContext;

  const context = await playwrightRequest.newContext();

  if (curlTemplateExists('auth/login')) {
    const loginResponse = await callTemplate(context, 'auth/login', {});
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