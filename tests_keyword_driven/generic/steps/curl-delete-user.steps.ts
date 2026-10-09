// location: tests_keyword_driven/generic/steps/curl-delete-user.steps.ts
//
// Split out of curl.steps.ts for the same reason as curl-register-user.steps.ts:
// common enough most projects will want a "clean up this user" step out of
// the box, but specific enough (your real delete endpoint(s), what
// "deleted" looks like in the response) that projects will often want to
// override it. A same-filename file under projects/<name>/steps/ replaces
// this file entirely for that project (see buildSteps.ts).

import { createBdd } from 'playwright-bdd';
import { test, resolveVars } from '../support/vars';
import { dbGetNewestRowLike } from './database.steps';
import { curlAsUser } from './curl.steps';

const { When } = createBdd(test);

// When I curl delete user data for email contains "bob@example.com"
//
// Mimics this sequence - "join together" db lookup + curlAsUser(), the two
// reusable functions database.steps.ts/curl.steps.ts already export, into
// one custom step, instead of spelling out every line in the .feature file:
//   When I db get newest row "ds_core_users" where column "email" like "bob41@_AUTO_USER_EMAIL_DOMAIN" into variable "row"
//   And I set variable "userId" to "+var(row.user_id)"
//   And I set variable "username" to "+var(row.username)"
//   When I curl template "member/delete" as user "_SUPER_ADMIN_USERNAME1" and pass "_SUPER_ADMIN_PASSWORD1" into variable "deleteResponse"
//   Then I should see variable "deleteResponse" contains "flagged for deletion"
//   # for my site, I also needed a hard delete:
//   When I curl template "member/hard-delete" as user "_SUPER_ADMIN_USERNAME1" and pass "_SUPER_ADMIN_PASSWORD1" into variable "deleteResponse"
//   Then I should see variable "deleteResponse" contains "deleted"
//
// "contains" can match many rows, not just one - loops until none are left,
// not just the single newest one. Each hard-delete rewrites that row's
// email to deleted_<user_id>@deleted.invalid (see UserHardDeleteService.php),
// which no longer matches the original LIKE pattern, so re-querying "newest
// row still matching" after each delete naturally converges to zero rather
// than looping forever or re-finding an already-deleted row. A no-op if no
// matching row exists at all - this is a cleanup step, not an assertion
// that a matching user exists.
const MAX_USERS_PER_DELETE_SWEEP = 200; // safety cap, not an expected real count

When(
  'I curl delete user data for email contains {string}',
  async ({ vars }, emailToken) => {
    const email = resolveVars(emailToken, vars);
    const superAdminLogin = resolveVars('_SUPER_ADMIN_USERNAME1', vars);
    const superAdminPassword = resolveVars('_SUPER_ADMIN_PASSWORD1', vars);

    for (let i = 0; i < MAX_USERS_PER_DELETE_SWEEP; i++) {
      let row: Record<string, unknown>;
      try {
        row = await dbGetNewestRowLike('ds_core_users', 'email', email);
      } catch {
        return; // no (more) matching users - nothing left to clean up
      }

      const userId = String(row.user_id);
      const username = String(row.username);

      const deleteResult = await curlAsUser('member/delete', superAdminLogin, superAdminPassword, { userId });
      if (deleteResult.text.includes('error')) { throw new Error(`member/delete did not flag for deletion: ${deleteResult.text}`); }

      const hardDeleteResult = await curlAsUser('member/hard-delete', superAdminLogin, superAdminPassword, { userId, username });
      if (hardDeleteResult.text.includes('error')) { throw new Error(`member/hard-delete did not flag for deletion: ${hardDeleteResult.text}`); }
    }

    throw new Error(
      `I curl delete user data for email contains "${email}": stopped after ${MAX_USERS_PER_DELETE_SWEEP} deletions - ` +
        `either that's a real, unexpectedly large match count, or a deleted row's email is somehow still matching the LIKE pattern.`,
    );
  },
);
