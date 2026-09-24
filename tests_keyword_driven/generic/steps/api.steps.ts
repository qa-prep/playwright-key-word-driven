// location: tests_keyword_driven/steps/generic/api.steps.ts
  
import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { getAutomationApiContext, callTemplate } from '../support/apiClient';

const { When } = createBdd(test);

// When I call curl template "auth/login" into variable "loginResponse"
//
// Runs curl-templates/<name>.curl using the shared API context (which has
// already done auth/login if that template exists). Every variable currently
// set in the test is available to the template as +var(name).
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