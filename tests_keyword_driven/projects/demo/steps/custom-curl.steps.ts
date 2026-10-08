// location: tests_keyword_driven/projects/demo/steps/custom-curl.steps.ts


import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../../../generic/support/vars';
import { getUnauthenticatedCurlContext, callTemplate } from '../../../generic/support/apiClient';

const { When } = createBdd(test);


/* we are affectively copying this, but hard coding the template name and passing in the variables explicitly */
/*
When(
  'I curl template {string} into variable {string}',
  async ({ vars }, templateName, varName) => {
    const api = await getUnauthenticatedCurlContext();
    const response = await callTemplate(api, resolveVars(templateName, vars), Object.fromEntries(vars));
    vars.set(varName, await response.text());
    vars.set(`${varName}.status`, String(response.status()));
  },
);
*/


// When I curl register username "bob" email "bob@example.com" and pass "b0bsBadPass!"
When(
  'I curl register username {string} email {string} and pass {string}',
  async ({ vars }, usernameToken, emailToken, passToken) => {
    const templateName = "auth/register";
    const username = resolveVars(usernameToken, vars);
    const email = resolveVars(emailToken, vars);
    const password = resolveVars(passToken, vars);


    const api = await getUnauthenticatedCurlContext();
    const response = await callTemplate(api, resolveVars(templateName, vars), {
      username,
      email,
      password,
    });
    // and reponse should not contain error:
    const responseText = await response.text();
    if (responseText.includes('error')) {
      throw new Error(`Response contains error: ${responseText}`);
    }


  },
);
