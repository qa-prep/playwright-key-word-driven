// location: tests_keyword_driven/generic/steps/curl.steps.ts
//
// Steps that call a raw .curl template directly (see curlTemplateLoader.ts /
// callTemplate()), as opposed to the fixed test-automation-endpoint wrappers
// in data.steps.ts/database.steps.ts. Named "curl", not "api", because everything
// in this framework ultimately hits an API - what's specific to this file is
// that it's driven by .curl template files, not the test-automation API.
//
// Every step below is a thin adapter: resolve the Gherkin strings, call the
// plain exported function declared directly under it, store the result.
// The function is what's reusable from another step file (a custom one-off
// step, etc) - call it directly instead of re-deriving the context/dispose
// dance.

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { getUnauthenticatedCurlContext, getAutomationUserCurlContext, getAsUserCurlContext, callTemplate } from '../support/apiClient';
import type { CurlVars } from '../support/curlTemplateLoader';
import type { APIResponse } from '@playwright/test';

const { When } = createBdd(test);

// When I curl template "auth/register" into variable "registerResponse"
//
// No credentials at all - for a public endpoint (registration, etc) that
// needs none. Every variable currently set in the test is available to the
// template as +var(name). Stores the response body in <varName> and the
// HTTP status in "<varName>.status". Use "... as auto" for the automation
// account, or "... as user ... and pass ..." for a specific one.
When(
  'I curl template {string} into variable {string}',
  async ({ vars }, templateName, varName) => {
    const response = await curlUnauthenticated(resolveVars(templateName, vars), Object.fromEntries(vars));
    vars.set(varName, await response.text());
    vars.set(`${varName}.status`, String(response.status()));
  },
);

export async function curlUnauthenticated(templateName: string, vars: CurlVars): Promise<APIResponse> {
  const api = await getUnauthenticatedCurlContext();
  return callTemplate(api, templateName, vars);
}

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
    const response = await curlAsAuto(resolveVars(templateName, vars), Object.fromEntries(vars));
    vars.set(varName, await response.text());
    vars.set(`${varName}.status`, String(response.status()));
  },
);

export async function curlAsAuto(templateName: string, vars: CurlVars): Promise<APIResponse> {
  const api = await getAutomationUserCurlContext();
  return callTemplate(api, templateName, vars);
}

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
    const result = await curlAsUser(
      resolveVars(templateName, vars), resolveVars(loginToken, vars), resolveVars(passToken, vars), Object.fromEntries(vars),
    );
    vars.set(varName, result.text);
    vars.set(`${varName}.status`, String(result.status));
  },
);

// Returns { text, status } rather than the raw APIResponse - unlike
// curlUnauthenticated()/curlAsAuto() above (shared, never-disposed
// contexts), this context is one-shot and gets disposed before returning,
// so the response body has to be read here, before that happens, not left
// for the caller to read lazily (APIResponse.text()/.json() throw once
// their context is disposed).
export async function curlAsUser(
  templateName: string,
  login: string,
  password: string,
  vars: CurlVars,
): Promise<{ text: string; status: number }> {
  const api = await getAsUserCurlContext(login, password);
  try {
    const response = await callTemplate(api, templateName, vars);
    return { text: await response.text(), status: response.status() };
  } finally {
    await api.dispose();
  }
}


