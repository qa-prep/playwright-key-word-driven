// location: /README.md

# Playwright Key-Word Driven

A keyword-driven Playwright + BDD (Gherkin/Cucumber) + Slack test automation framework for E2E, API, and database-backed system testing — built for multi-project reuse.


## What a test looks like

```gherkin
Scenario: Interacting with and asserting against page elements
  Given I am on "http://localhost/testpage"
  Then I should see element "css:#heading"
  And I should see viewport text "Test Fixture Page"

  When I set field "css:#text-field" to "hello world"
  Then I should see field "css:#text-field" is "hello world"

  When I click "css:#checkbox-field"
  Then I should see element "css:#checkbox-field" is "checked"
```

## Why this exists

Playwright handles a lot out of the box, but real system/integration testing — as opposed to unit testing — still needs a layer on top: database helpers, API helpers, environment config, test data generation, reporting, and a way for multiple teams/projects to share a common set of step definitions while overriding the ones that don't fit.

This framework is built around a few opinions:

- **Keyword-driven, Gherkin-based** steps so tests read like plain English and are approachable to non-technical QA folks, not just engineers.
- **Shared generic steps by default, with per-project overrides** — a project can supply its own version of any generic step file, and it wins automatically (same filename = override), no manual config needed.
- **Real database access for test setup/teardown**, not just mocking — because full system testing sometimes means asserting against real data, not a stub.
- **One connection per worker**, not per test — keeps parallel runs fast.
- **Debug logging by category** (`sql`, `steps`, etc.) that's off by default and switched on via a single `debug-mode=` flag.
- **Timestamped, non-overwritten HTML reports per project**, so you always know what ran and when.
- **All local config lives under `config/` and is entirely yours** — the installer lays down starter copies once and never overwrites them again; the whole folder is gitignored, so credentials and personal settings never end up in git.
- **Optional Slack notifications** — post a message when a run starts and another when it finishes, with pass/fail counts and duration, without requiring Slack at all if you don't want it.

## Requirements

- Node.js (LTS recommended)
- npm
- (Optional) A reachable test database (MySQL, via `mysql2`) if you're using the DB helpers
- (Optional) A Slack app with a bot token, only if you want Slack notifications (see below) — entirely optional

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
- Lay down `config/default-settings.config`, `config/local.env`, and `config/slack-users.json` from the framework's canonical templates, each only if you don't already have one
- Install required dependencies (`dotenv`, `mysql2`, `playwright-bdd`, `@cucumber/cucumber`)
- Make `run-tests.sh` executable

All three files under `config/` are yours from that point on — the installer never overwrites any of them on a later run, and the whole `config/` folder is gitignored, so edit them freely with your own DB credentials, Slack details, and preferred defaults.

Open `config/local.env` and fill in the things you will need (if you are running tests that require database check you can optionaly set that up):

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-pass

APP_URL=http://localhost:5173
API_URL=http://localhost/api
```

`env=<name>` on `run-tests.sh` loads `config/<name>.env` (defaults to `local`), so you can keep a separate file per environment (`config/staging.env`, `config/ci.env`, etc.), each pointing at its own database and app URLs — just make sure `SETTINGS_FILE=config/default-settings.config` is set in each one.

## Settings (`config/default-settings.config`)

Behaviour toggles laid down by the installer, overridable per run via CLI flags of the same name (e.g. `browsers=firefox`) or by editing the file directly:

| Setting | Options | Default |
|---|---|---|
| `BROWSERS` | `chrome` \| `firefox` \| `safari` \| `mixed` \| comma-separated list | `chrome` |
| `WORKERS` | `default` \| `max` \| a positive whole number | `default` |
| `HEADED` | `true` \| `false` | `false` |
| `REPORT_MODE` | `none` \| `never` \| `on-failure` \| `always` | `never` |
| `DEBUG_MODE` | `off` \| `all` \| `sql` \| `steps` | `off` |
| `SPEED` | `fast` \| `medium` \| `slow` \| `vslow` | `fast` |
| `SCREENSHOT_ON_FAIL` | `true` \| `false` | `true` |
| `SLACK_ENABLED` | `true` \| `false` | `false` |
| `SLACK_NOTIFY_MODE` | `never` \| `on-failure` \| `always` | `on-failure` |
| `SLACK_NEVER_IN_DEBUG` | `true` \| `false` | `true` |

## Slack notifications

Set `SLACK_ENABLED=true` in your settings file and provide `SLACK_BOT_TOKEN` / `SLACK_CHANNEL` in `config/local.env` to get a message when a run starts and another when it finishes (pass/fail counts, duration, and the exact command used).

To set up a Slack app:
1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **Blank app**
2. **OAuth & Permissions** → add the `chat:write` bot scope → **Install to Workspace**
3. Copy the **Bot User OAuth Token** (starts `xoxb-`) into `SLACK_BOT_TOKEN`
4. Invite the bot to your target channel: `/invite @YourBotName`
5. Copy the channel ID (not