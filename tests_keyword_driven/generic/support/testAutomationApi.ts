// location: tests_keyword_driven/generic/support/testAutomationApi.ts
import { getAutomationApiContext, callTemplate } from './apiClient';

async function post(
  endpoint: 'index' | 'create' | 'update' | 'destroy' | 'delete-user-by-email' | 'delete-users-by-email-contains',
  body: Record<string, unknown>,
) {
  const api = await getAutomationApiContext();
  const response = await callTemplate(api, `test-automation/${endpoint}`, { body: JSON.stringify(body) });
  const json = await response.json();
  if (!response.ok() || json?.success === false) {
    throw new Error(`test-automation/${endpoint} failed (${response.status()}): ${JSON.stringify(json)}`);
  }
  return json;
}

export const testAutomationApi = {
  index: (body: Record<string, unknown>) => post('index', body),
  create: (body: Record<string, unknown>) => post('create', body),
  update: (body: Record<string, unknown>) => post('update', body),
  destroy: (body: Record<string, unknown>) => post('destroy', body),
  // better than deleteUserByEmail() in db/entities/users.ts: this goes through the
  // backend's tiered cleanup (moderation queue, team ownership, personal tables, etc)
  // instead of a single direct DELETE on ds_core_users.
  deleteUserByEmail: (email: string) => post('delete-user-by-email', { email }),
  // bulk sweep: cleans up every user whose email contains this substring in one
  // call, at a fixed query cost regardless of how many match. Use this for a
  // suite-level/global cleanup instead of calling deleteUserByEmail per test -
  // that adds up fast when many tests run in parallel.
  deleteUsersByEmailContains: (emailContains: string) =>
    post('delete-users-by-email-contains', { email_contains: emailContains }),
};