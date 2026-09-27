# Running tests in CI/CD

This covers wiring a private test repo, built from this framework, into GitHub
Actions so tests run automatically on push, with optional Slack notifications.
It's a normal CI setup, nothing framework-specific about the pattern itself,
just the exact steps for this framework's layout.

## Why a separate repo

This framework is meant to be reused across projects, so it stays generic
upstream (the bundled `myProjectA`/`myProjectB` examples are the only tests
committed here). Your own project's tests don't belong in this repo, they
belong in your own repo, built by cloning this one as a starting point.

## Steps

1. **Create a new private repo** for your tests.
   ```bash
   gh repo create <you>/<your-tests-repo> --private
   ```

2. **Clone this framework into it**, then repoint the remote and push.
   ```bash
   git clone https://github.com/qa-prep/playwright-key-word-driven.git <your-tests-repo>
   cd <your-tests-repo>
   git remote set-url origin https://github.com/<you>/<your-tests-repo>.git
   git push -u origin main
   ```

3. **Run the installer locally**, same as any fresh install.
   ```bash
   chmod +x installer/install.sh
   ./installer/install.sh
   ```

4. **Add your own tests** under `tests_keyword_driven/projects/<yourProject>/features/`.
   For your first CI run, skip this and just use the bundled `myProjectA`
   examples, they need no database or app under test, so they're the fastest
   way to prove the whole pipeline (repo, secrets, workflow) actually works
   before adding anything project-specific.

5. **Add a GitHub Actions workflow** at `.github/workflows/tests.yml`. See the
   full example below.

6. **Add any real credentials the workflow needs as repository secrets**, at
   `https://github.com/<you>/<your-tests-repo>/settings/secrets/actions`.
   Never put real credentials in a committed file.

7. **Push.** The workflow fires on the `on: push:` trigger, pass/fail shows up
   as a check on GitHub, and Slack gets notified if you wired it up.

## Secrets vs config files

Two different things end up looking similar, worth being clear on which is
which:

- **`config/*.env` files** are gitignored, real credentials on your own
  machine, never committed, never seen by CI.
- **`config/*.config` files** (e.g. `config/default-settings.config`,
  `config/ci-settings.config`) are the one exception: no credentials belong
  in them, ever, only deterministic non-secret values - fixed URLs/ports for
  a throwaway CI stack, browser/Slack behavior settings, even
  `PRE_TEST_N`/`POST_TEST_N` phase paths. Safe to commit for real - `.gitignore`
  carves out `*.config` under `config/` on purpose so these aren't excluded
  the way `*.env` files are.
- **`installer/canonical/*`** are the safe placeholder templates (fake DB
  passwords, `xoxb-your-bot-token-here`, etc.), committed on purpose, fine
  for anyone to see.
- **GitHub repository secrets** (Settings -> Secrets and variables -> Actions)
  are the real values CI actually needs. They're encrypted at rest, never
  written to any file in the repo, and only decrypted into environment
  variables inside a running job. Once set, GitHub never shows the value
  again, not even to the repo owner, only overwrite or delete.

### One JSON secret, not one secret per credential

Adding a new named GitHub secret for every credential means a matching
workflow-file change every time, too. Instead, this framework's CI pattern
uses a **single** secret - conventionally named `CI_SECRETS_JSON` - whose
value is a JSON object. Its keys are exactly the `_TOKEN` names your tests
already use:

```json
{
  "_SLACK_BOT_TOKEN": "xoxb-...",
  "_SLACK_CHANNEL": "C0...",
  "_DB_USER": "...",
  "_DB_PASSWORD": "..."
}
```

The installer lays down `config/ci-secrets.json` for you (from
`installer/canonical/ci-secrets.json`, placeholder values, never touched again
after the first install) as somewhere to actually build this JSON - edit it
with your real values, then feed the file straight in:

```bash
gh secret set CI_SECRETS_JSON --repo <you>/<your-repo-that-will-trigger-tests> < config/ci-secrets.json
```

Run this yourself, in your own terminal - same reasoning as the PAT further
down, pasting real credential values into a chat puts them in that
conversation's history. Feeding a file in with `<` matters too, not just
convenience: pasting multi-line JSON into `gh secret set`'s interactive
prompt is an easy way to end up with a corrupted value (a terminal's
bracketed-paste markers, or a stray line break landing inside a long token,
both silently break the JSON) - `< config/ci-secrets.json` sends the file's
exact bytes with no terminal prompt involved at all, so there's nothing for
that kind of artifact to sneak into.

The workflow's "Set up CI config" step (see the example below) parses that
one secret generically and writes every key it finds into a freshly
generated `config/ci.env` - it has no fixed list of names to keep in sync,
so a brand-new credential later never needs a workflow-file change, just add
the key to that one secret's value in GitHub's UI.

Why one secret is still safe: GitHub only auto-redacts the *exact* registered
secret string from logs, and the whole JSON blob is what's registered - so
that's what gets masked if it appears verbatim. Never `echo`/`cat`/log the
parsed-out individual values or the assembled `config/ci.env` anywhere in
the workflow: a value extracted out of the blob isn't separately registered,
so it wouldn't get masked the way a normal named secret would.

Everything **non-secret** the tests need belongs in a plain, committed
`config/ci-settings.config` instead (see `installer/canonical/ci-settings.config`
for the template) - the generated `config/ci.env` only ever needs a
`_SETTINGS_FILE` line pointing at it, plus whatever came out of
`CI_SECRETS_JSON`.

## Example workflow

```yaml
name: Tests

on:
  push:
    branches: [ main, master ]

jobs:
  test:
    timeout-minutes: 15
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      # playwright.config.ts is gitignored (installer/install.sh creates it
      # locally from this same canonical template), so a fresh checkout has
      # none, this recreates it.
      - name: Set up playwright.config.ts
        run: cp installer/canonical/playwright.config.ts.bak playwright.config.ts

      # config/ci-settings.config is already committed (see "Secrets vs
      # config files" above) - this step only has to inject the real
      # credentials, generically, from the one CI_SECRETS_JSON secret.
      - name: Set up CI config
        env:
          CI_SECRETS_JSON: ${{ secrets.CI_SECRETS_JSON }}
        run: |
          mkdir -p config
          echo "_SETTINGS_FILE=config/ci-settings.config" > config/ci.env
          node <<'NODE_SCRIPT'
          const fs = require('fs');
          const secrets = JSON.parse(process.env.CI_SECRETS_JSON);
          const esc = (v) => "'" + String(v).replace(/'/g, "'\\''") + "'";
          const lines = Object.entries(secrets).map(([k, v]) => `${k}=${esc(v)}`);
          fs.appendFileSync('config/ci.env', lines.join('\n') + '\n');
          NODE_SCRIPT

      - name: Run tests
        run: ./run-tests.sh project=myProjectA tags=@exampleTests env=ci

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

Swap the `Run tests` step for your own `project=`/`tags=`. Skip Slack entirely
if you don't want notifications - just leave `_SLACK_ENABLED` out of
`config/ci-settings.config` (or set it `false`) and leave `_SLACK_BOT_TOKEN`/
`_SLACK_CHANNEL` out of `CI_SECRETS_JSON`.

## Testing against a real app/database in CI

The example above only proves the pipeline itself works, since the bundled
examples need no database or app under test. Actually testing your real
project means the app and its database need to exist somewhere the CI runner
can reach, `localhost` inside a GitHub-hosted runner means the runner itself,
not your laptop. Three ways to get there:

- **Start your app's own `docker-compose.yml` directly in the job**, if it
  has one: `docker compose up -d --build`, a short wait-loop polling the
  app's URL (and the DB, if an install/setup flow needs it) before running
  tests, and `docker compose down -v` at the end (`if: always()`, so it
  cleans up even on failure). This is the closest match to your own local
  testing, since it's the exact same containers on the exact same ports. If
  the app needs a one-time install/setup flow before anything else can log
  in, that's exactly what `PRE_TEST_N` is for: put the install feature under
  its own folder (e.g. `pre-tests-1/`), point `PRE_TEST_1` at it from
  `config/ci-settings.config`, and it runs before the main suite every time,
  stopping the whole run if it fails.
- **A GitHub Actions service container**, e.g. a `services: db: image: mysql:8.0.x`
  block in the workflow, matching whatever version your app's own
  `docker-compose.yml` uses, if your app has no compose file of its own to
  stand up directly.
- **A real reachable staging/test deployment**, with its credentials in
  `CI_SECRETS_JSON` same as everything else.

Either way, the same pattern applies: non-secret values in
`config/ci-settings.config`, real credentials in the one `CI_SECRETS_JSON`
secret, assembled into `config/ci.env` fresh each run, never committed.

## Triggering tests from a different private repo

A common shape: your actual product lives in one repo (call it the app repo),
your tests live in this separate test repo, and you want a push to the app
repo to trigger a run of the tests. That means the app repo's workflow needs
to check out the test repo too, and if the test repo is private, the app
repo's default `GITHUB_TOKEN` can't read it, that token only has access to
the repo it belongs to.

The fix is a **Personal Access Token (PAT)**: a credential you generate once,
scoped to read just the one test repo, stored as a secret on the app repo.

**This is the one genuinely manual step in this entire setup.** Everything
else here, secrets, workflow files, config assembly, can be scripted or done
by an assistant. Minting a new PAT cannot be, on purpose, GitHub requires it
go through the browser, logged in as you, with no API path around it. If
you're working through this with an AI assistant, this is the part you do
yourself:

1. Go to **[github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens)**
   (this is the "fine-grained" token page, not the older "classic" one) and
   click **Generate new token**.
2. Give it a name that says what it's for, e.g. `dash-sites-tests-checkout`,
   you'll thank yourself later when you have several of these.
3. Under **Resource owner**, pick the account/org that owns the test repo.
4. Under **Repository access**, choose **Only select repositories**, then
   pick just the one test repo. Not "All repositories", scope it down.
5. Under **Permissions -> Repository permissions**, find **Contents** and set
   it to **Read-only**. That's the only permission a checkout needs, nothing
   else should be granted.
6. Pick an **expiration**. Avoid "No expiration": read-only + single-repo
   already limits the damage if this ever leaks, but a token that never
   expires has no ceiling on *how long* a leak stays dangerous if nobody
   notices. A year is a reasonable middle ground, long enough to not be
   annoying, short enough to bound the risk.
7. Click **Generate token**. GitHub shows you the value **exactly once**,
   copy it now.
8. Store it as a secret on the **app repo** - the one whose workflow will
   actually run (not the test repo, which just gets read):
   ```bash
   echo -n 'paste-the-pat-value-here' > /tmp/pat.txt
   gh secret set DASH_SITES_TESTS_PAT --repo <you>/<app-repo> < /tmp/pat.txt
   rm /tmp/pat.txt
   ```
   Run this yourself, in your own terminal. If you paste the raw token value
   into a chat with an AI assistant to have it run this for you, that value
   is now sitting in that conversation's history, which defeats a good chunk
   of the point of scoping the token down carefully in the first place.
   Feeding a file in with `<` rather than pasting into `gh secret set`'s
   interactive prompt matters too, same reasoning as `CI_SECRETS_JSON`
   above: a terminal's bracketed-paste markers or a stray line break can
   silently corrupt a pasted value, and a file sent via `<` has no
   terminal prompt involved at all for that to happen to. `echo -n` avoids
   a trailing newline sneaking into the token value.

Once it's stored, reference it from the app repo's workflow like any other
secret, passed to the `token:` input of the checkout step for the *other*
repo (your own repo's checkout, first in the job, doesn't need it, the
default token already covers that one):

```yaml
steps:
  - uses: actions/checkout@v4          # this repo, default token is fine

  - uses: actions/checkout@v4          # the private test repo, needs the PAT
    with:
      repository: <you>/<your-tests-repo>
      token: ${{ secrets.DASH_SITES_TESTS_PAT }}
      path: dash-sites-tests
```

Everything after that, installing dependencies, assembling config, running
`run-tests.sh`, works exactly the same as the single-repo example earlier,
just run with `working-directory:` (or a `cd`) pointed at the checked-out
test repo's folder instead of the workflow's own repo root.

## Skipping a run

Every commit triggers the workflow by default, including one that only fixes
a typo in a comment. GitHub Actions has a built-in escape hatch for this,
nothing to build: if the commit message contains `[skip ci]` (or `[ci skip]`,
`[no ci]`, `[skip actions]`, `[actions skip]`, case-insensitive), GitHub never
even queues a workflow run for that push, not "run and cancel", it genuinely
never starts, so it costs nothing.

```bash
git commit -m "fix typo in comment [skip ci]"
git push
```

Same convention works on GitLab CI, Azure Pipelines, and most other CI
systems too.

For something more automatic than remembering to type `[skip ci]` every
time, a `paths-ignore` filter on the workflow's `on: push:` trigger skips the
whole workflow whenever a push touches only certain files (e.g. docs), no
commit message tag needed:

```yaml
on:
  push:
    branches: [ main, master ]
    paths-ignore:
      - '**.md'
```

## Cost

Public repos get unlimited free GitHub Actions minutes. Private repos get a
monthly free-minutes allowance depending on plan (2,000/month on GitHub
Free, more on paid plans), Linux runners counted at the cheapest rate. A
service container (like the database above) doesn't cost extra on its own,
it just runs within the same job's total time. Check your actual current
allowance at `https://github.com/settings/billing`.

---

See [README.md](./README.md) for everything else, and [CONTRIBUTING.md](./CONTRIBUTING.md) for the framework's internal conventions.
