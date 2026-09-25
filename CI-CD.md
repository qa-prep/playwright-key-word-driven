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

- **Config files under `config/`** are gitignored, real credentials on your
  own machine, never committed, never seen by CI.
- **`installer/canonical/*`** are the safe placeholder templates (fake DB
  passwords, `xoxb-your-bot-token-here`, etc.), committed on purpose, fine
  for anyone to see.
- **GitHub repository secrets** (Settings -> Secrets and variables -> Actions)
  are the real values CI actually needs. They're encrypted at rest, never
  written to any file in the repo, and only decrypted into environment
  variables inside a running job. Once set, GitHub never shows the value
  again, not even to the repo owner, only overwrite or delete.

A CI workflow step assembles a config file fresh, every run, on the runner's
disk: start from the safe placeholder template, then append the real secrets
on top. That assembled file is never committed and is discarded when the job
ends.

```bash
cp installer/canonical/local.env config/ci.env
printf '\n_SETTINGS_FILE=config/ci-default-settings.config\n_SLACK_BOT_TOKEN=%s\n_SLACK_CHANNEL=%s\n' \
  "$SLACK_BOT_TOKEN" "$SLACK_CHANNEL" >> config/ci.env
```

The leading `\n` in that `printf` matters: `installer/canonical/local.env`
has no trailing newline, so a plain `echo ... >> file` glues straight onto
its last line instead of starting a new one, and the "override" never gets
parsed as its own assignment.

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

      - name: Set up CI config
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          SLACK_CHANNEL: ${{ secrets.SLACK_CHANNEL }}
        run: |
          mkdir -p config
          cp installer/canonical/local.env config/ci.env
          printf '\n_SETTINGS_FILE=config/ci-default-settings.config\n_SLACK_BOT_TOKEN=%s\n_SLACK_CHANNEL=%s\n' \
            "$SLACK_BOT_TOKEN" "$SLACK_CHANNEL" >> config/ci.env

          cp installer/canonical/default-settings.config config/ci-default-settings.config
          printf '\nSLACK_ENABLED=true\n' >> config/ci-default-settings.config

      - name: Run tests
        run: ./run-tests.sh project=myProjectA tags=@exampleTests env=ci

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

Swap the `Run tests` step for your own `project=`/`tags=`, and skip the Slack
env/secrets entirely if you don't want notifications, `SLACK_ENABLED` just
stays `false` from the canonical template with no changes needed.

## Testing against a real app/database in CI

The example above only proves the pipeline itself works, since the bundled
examples need no database or app under test. Actually testing your real
project means the app and its database need to exist somewhere the CI runner
can reach, `localhost` inside a GitHub-hosted runner means the runner itself,
not your laptop. Two ways to get there:

- **A GitHub Actions service container**, e.g. a `services: db: image: mysql:8.0.x`
  block in the workflow, matching whatever version your app's own
  `docker-compose.yml` uses, then start your app in the same job before
  running tests against it.
- **A real reachable staging/test deployment**, with its credentials as
  repository secrets same as Slack's above.

Either way, the same config-assembly pattern applies: real values as
repository secrets, assembled into a config file fresh each run, never
committed.

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

1. Go to **[github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta)**
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
8. Store it as a secret on the **app repo** (not the test repo, the one whose
   workflow needs to read the other one):
   ```bash
   gh secret set DASH_SITES_TESTS_PAT --repo <you>/<app-repo>
   ```
   Run this yourself, in your own terminal. If you paste the raw token value
   into a chat with an AI assistant to have it run this for you, that value
   is now sitting in that conversation's history, which defeats a good chunk
   of the point of scoping the token down carefully in the first place. Let
   `gh secret set` prompt you for it instead, it reads the value without
   echoing it anywhere.

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
