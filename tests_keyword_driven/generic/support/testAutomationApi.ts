// location: tests_keyword_driven/generic/support/testAutomationApi.ts
import { getAutomationApiContext, callTemplate } from './apiClient';

async function post(endpoint: 'index' | 'create' | 'update' | 'destroy', body: Record<string, unknown>) {
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
};