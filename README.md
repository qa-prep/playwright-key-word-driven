// location: /README.md

# Playwright Key-Word Driven

A keyword-driven Playwright + BDD (Gherkin/Cucumber) test automation framework for E2E, API, and database-backed system testing — built for multi-project reuse.

## Why this exists

Playwright handles a lot out of the box, but real system/integration testing — as opposed to unit testing — still needs a layer on top: database helpers, API helpers, environment config, test data generation, reporting, and a way for multiple teams/projects to share a common set of step definitions while overriding the ones that don't fit.

This framework is built around a few opinions:

- **Keyword-driven, Gherkin-based** steps so tests read like plain English and are approachable to non-technical QA folks, not just engineers.
- **Shared generic steps by default, with per-project overrides** — a project can supply its own version of any generic step file, and it wins automatically (same filename = override), no manual config needed.
- **Real database access for test setup/teardown**, not just mocking — because full system testing sometimes means asserting against real data, not a stub.
- **One connection per worker**, not per test — keeps parallel runs fast.
- **Debug logging by category** (`sql`, `steps`, etc.) that's off by default and switched on via a single `debug-mode=` flag.
- **Timestamped, non-overwritten HTML reports per project**, so you always know what ran and when.

## Requirements

- Node.js (LTS recommended)
- npm
- A reachable test database (MySQL, via `mysql2`) if you're using the DB helpers

## Install

```bash
git clone https://github.com/qa-prep/playwright-key-word-driven.git
cd playwright-key-word-driven
chmod +x installer/install.sh
./installer/install.sh
```

The installer will:
- Run `npm init playwright@latest` if no Playwright project exists yet
- Apply this framework's `playwright.config.ts` (warns before overwriting if you've made local changes)
- Install required dependencies (`dotenv`, `mysql2`, `playwright-bdd`, `@cucumber/cucumber`)
- Make `run-tests.sh` executable

Then copy the env template and fill in your own values:

```bash
cp config/local.env.example config/local.env
```

## Running tests

```bash
./run-tests.sh tests-type=feature project=default tags=@smoke
```

| Param         | Values                          | Default   |
|---------------|----------------------------------|-----------|
| `tests-type`  | `spec` \| `feature` \| `all`     | `all`     |
| `project`     | any folder under `keyword_driven/projects/` | `default` |
| `tags`        | Gherkin tags, e.g. `@login,@smoke` | (none)  |
| `report`      | `none` \| `never` \| `on-failure` \| `always` | `never` (built, not opened) |
| `debug-mode`  | `off` \| `all`/`on`/`true`/`1` \| a single category e.g. `sql` | `off` |

Reports are written to `playwright-report/<project>/<date>/<time>/`, never overwritten.

## Adding your own project

1. Create `keyword_driven/projects/<yourProject>/features/` and drop `.feature` files in.
2. If you need custom step behaviour, create `keyword_driven/projects/<yourProject>/steps/<name>.steps.ts` with the **same filename** as the generic file you want to override — it replaces the generic one automatically for your project only.
3. No changes to `playwright.config.ts` needed — projects are auto-discovered from folder names.

See `CONTRIBUTING.md` for more detail.

## License

MIT — see [LICENSE](./LICENSE).