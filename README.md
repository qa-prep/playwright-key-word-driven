# location: /README.md

# Playwright Key-Word Driven Pitch

Write a test from a figma diagram / picture, before the product even exists. 
Let it double as the manual test case. Drop to plain scripts whenever you want the full language instead. 
And get it installed in about four commands.

# Playwright Key-Word Driven

A keyword-driven Playwright + BDD (Gherkin/Cucumber) test automation framework for E2E, API, and database-backed system testing — built for multi-project reuse.
Want to run these tests automatically in CI/CD (GitHub Actions)? See [CI-CD.md](./CI-CD.md).

## What a test looks like

```gherkin
  Scenario: A new user successfully registers for an account
    When I go to "http://localhost/register"
    And I set field "Username" to "myNameIsBob"
    And I set field "Email" to "bobsemail@example.com"
    And I set field "Password" to "bobsInsecurePassword"
    And I click any "Accept all cookies"
    And I click "Register"
    Then I should see viewport text "Welcome"
```

No step definitions to write for common interactions like this — `click`, `set field`, `see element`, `see viewport text`, and dozens more ship as a generic step library. You write `.feature` files in plain Gherkin; the framework's stock steps do the rest, and you only write custom step code when a project needs something the generic library doesn't cover.

Because the generic step library already covers most of what a UI does, you can write this scenario straight from a design/Figma mock before a single line of the registration page exists — it's a real acceptance criteria doc a non-technical reviewer can read, not throwaway scaffolding. Once dev builds the page, you don't translate or rewrite anything: the exact same file just starts passing.

## Why this exists

Playwright handles a lot out of the box, but real system/integration testing — as opposed to unit testing — still needs a layer on top: database helpers, API helpers, environment config, test data generation, reporting, and a way for multiple teams/projects to share a common set of step definitions while overriding the ones that don't fit.

This framework is built around a few opinions:

- **Keyword-driven, Gherkin-based** steps so tests read like plain English and are approachable to non-technical QA folks, not just engineers — and because they're plain English, they can be written from a spec or a design mock before the feature is built, not just after.
- **Shared generic steps by default, with per-project overrides** — a project can supply its own version of any generic step file, and it wins automatically (same filename = override), no manual config needed.
- **Real database access for test setup/teardown**, not just mocking — because full system testing sometimes means asserting against real data, not a stub.
- **One connection per worker**, not per test — keeps parallel runs fast.
- **Debug logging by category** (`sql`, `steps`, etc.) that's off by default and switched on via a single `debug-mode=` flag.
- **Timestamped, non-overwritten HTML reports per project**, so you always know what ran and when.
- **All local config lives under `config/` and is entirely yours** — the installer lays down starter copies once and never overwrites them again; `*.env` files are gitignored, so credentials never end up in git (`*.config` files are the one deliberate exception — no credentials belong there either, just safe-to-share settings).
- **Optional Slack notifications** — post a message when a run starts and another when it finishes, with pass/fail counts and duration, without requiring Slack at all if you don't want it.

## Requirements

- Node.js (LTS recommended)
- npm
- A reachable test database (MySQL, via `mysql2`) if you're using the DB helpers
- A Slack app with a bot token, only if you want Slack notifications (see below) — entirely optional

## Install

```bash
git clone https://github.com/qa-prep/playwright-key-word-driven.git
cd playwright-key-word-driven
chmod +x installer/install.sh
./installer/install.sh
```

Run the test example (no database setup needed — the bundled examples don't use it):

```bash
./run-tests.sh tests-type=feature project=myProjectA tags=@exampleTests
```
or

```bash
./run-tests.sh tests-type=feature project=myProjectA tags=@exampleFailTests debug-mode=all headed=true speed=slow
```

That's it!

The installer will:
- Run `npm init playwright@latest` if no Playwright project exists yet
- Apply this framework's `playwright.config.ts` (warns before overwriting if you've made local changes)
- Lay down `config/default-settings.config`, `config/local.env`, `config/slack-users.json`, `config/ci-secrets.json`, `config/ci.env`, `config/demo-settings.config`, and `config/demo.env` from the framework's canonical templates, each only if you don't already have one (`ci-*` is only needed for CI, see [CI-CD.md](./CI-CD.md); `demo-*` points the bundled `demo` project at `localhost:8082`)
- Install required dependencies (`dotenv`, `mysql2`, `playwright-bdd`, `@cucumber/cucumber`, plus `typescript` and `@types/node` as dev dependencies)
- Make `run-tests.sh` executable

Every file under `config/` is yours from that point on — the installer never overwrites any of them on a later run. `config/local.env` is gitignored, so edit it freely with your own DB credentials and Slack token; `config/default-settings.config` is deliberately *not* gitignored (no credentials belong there either) so your preferred defaults can be committed and shared.

Open `config/local.env` and fill in your database details if you're using the DB helpers — otherwise the defaults are enough to get started:

```dotenv
_DB_HOST=localhost
_DB_PORT=3306
_DB_NAME=your-db-name
_DB_USER=your-db-user
_DB_PASSWORD=your-db-pass
```

`_APP_URL`/`_API_URL` and everything else non-secret live in `config/default-settings.config` instead (see the Settings table below) — not credentials, so they don't belong in the gitignored env file.

`env=<name>` on `run-tests.sh` loads `config/<name>.env` (defaults to `local`), so you can keep a separate file per environment (`config/staging.env`, `config/ci.env`, etc.), each pointing at its own database — just make sure `_SETTINGS_FILE=config/default-settings.config` (or your own settings file) is set in each one.

## Settings (`config/default-settings.config`)

Behaviour toggles laid down by the installer, overridable per run via CLI flags of the same name minus the underscore (e.g. `browsers=firefox` sets `_BROWSERS`) or by editing the file directly. Every key is `_`-prefixed and, like any `_TOKEN`, directly readable from a feature file too — `When I spit "_DEBUG_MODE"` works with no extra setup, since settings files and env files both get `set -a`-sourced the same way:

| Setting | Options | Default |
|---|---|---|
| `_BROWSERS` | `chrome` \| `firefox` \| `safari` \| `mixed` \| comma-separated list | `chrome` |
| `_WORKERS` | `default` \| `max` \| a positive whole number | `default` |
| `_HEADED` | `true` \| `false` | `false` |
| `_REPORT_MODE` | `none` \| `never` \| `on-failure` \| `always` | `never` |
| `_DEBUG_MODE` | `off` \| `all` \| `sql` \| `steps` | `off` |
| `_SPEED` | `fast` \| `medium` \| `slow` \| `vslow` | `fast` |
| `_SCREENSHOT_ON_FAIL` | `true` \| `false` | `true` |
| `_SLACK_ENABLED` | `true` \| `false` | `false` |
| `_SLACK_NOTIFY_MODE` | `never` \| `on-failure` \| `always` | `always` |
| `_SLACK_NEVER_IN_DEBUG` | `true` \| `false` | `true` |
| `_SILENT` | `true` \| `false` — suppress run-tests.sh's own informational output | `false` |
| `_INSPECTOR` | `true` \| `false` — open Playwright's step-by-step Inspector (forces headed) | `false` |
| `_APP_URL` / `_API_URL` | any URL | `http://localhost:5173` / `http://localhost/api` |

## Slack notifications

Set `_SLACK_ENABLED=true` in your settings file and provide `_SLACK_BOT_TOKEN` / `_SLACK_CHANNEL` in `config/local.env` to get a message when a run starts and another when it finishes (pass/fail counts, duration, and the exact command used). On failure, the finish message also lists up to 5 failing tests — Feature, Scenario, the exact step and `.feature` file/line, and the assertion's expected-vs-actual detail.

To set up a Slack app:
1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **Blank app**
2. **OAuth & Permissions** → add the `chat:write` bot scope → **Install to Workspace**
3. Copy the **Bot User OAuth Token** (starts `xoxb-`) into `SLACK_BOT_TOKEN`
4. Invite the bot to your target channel: `/invite @YourBotName`
5. Copy the channel ID (not the `#name`) into `SLACK_CHANNEL`

`SLACK_NOTIFY_MODE` controls when the finish message actually sends (`SLACK_NEVER_IN_DEBUG` always suppresses both messages during a `debug-mode` run, regardless of notify mode). `config/slack-users.json` maps names to Slack user IDs so you can `@`-mention people in `@Name` form — entirely optional; edit or leave it as-is.

## Running tests

```bash
./run-tests.sh tests-type=feature project=default tags=@smoke
```

| Param         | Values                          | Default   |
|---------------|----------------------------------|-----------|
| `tests-type`  | `spec` \| `feature` \| `all`     | `all`     |
| `project`     | any folder under `tests_keyword_driven/projects/` | `default` |
| `tags`        | Gherkin tags, e.g. `@login,@smoke` | (none)  |
| `env`         | any name matching a `config/<name>.env` file | `local` |
| `report`      | `none` \| `never` \| `on-failure` \| `always` | `never` (built, not opened) |
| `debug-mode`  | `off` \| `all`/`on`/`true`/`1` \| a single category e.g. `sql` | `off` |

Reports are written to `playwright-report/<project>/<date>/<time>/`, never overwritten.

## Adding your own project

1. Create `tests_keyword_driven/projects/<yourProject>/features/` and drop `.feature` files in.
2. If you need custom step behaviour, create `tests_keyword_driven/projects/<yourProject>/steps/<name>.steps.ts` with the **same filename** as the generic file you want to override — it replaces the generic one automatically for your project only.
3. No changes to `playwright.config.ts` needed — projects are auto-discovered from folder names.

See `CONTRIBUTING.md` for more detail.

## License

MIT — see [LICENSE](./LICENSE).