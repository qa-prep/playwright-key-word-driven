# Contributing to Playwright Key-Word Driven

Thanks for looking at contributing. This doc covers how the framework is put together and the conventions to follow when adding to it, whether that's a new project, a new generic step, or a change to the core config.

## Project layout

keyword_driven/
├── generic/
│ ├── steps/ # shared step definitions, available to every project
│ └── support/ # buildSteps.ts, debug.ts, locator.ts, vars.ts
└── projects/
├── default/
│ └── features/ # .feature files with no project-specific overrides
├── myProjectA/
│ ├── features/
│ └── steps/ # optional, only needed to override a generic step
└── myProjectB/
├── features/
└── steps/
db/
├── connection.ts
├── schema.ts
└── entities/ # one file per table/domain, DB helper functions
installer/
├── install.sh
└── canonical/
└── playwright.config.ts # source of truth for playwright.config.ts


## Adding a new project

1. Create `keyword_driven/projects/<yourProject>/features/` and add `.feature` files.
2. Projects are **auto-discovered** from folder names under `keyword_driven/projects/`, `playwright.config.ts` picks up any new folder automatically. You don't need to edit the config to register a project.
3. Run it with:
```bash
   ./run-tests.sh tests-type=feature project=<yourProject> tags=@yourTag
```

That's the whole setup for a project that just wants to use the generic steps as-is.

## Overriding a generic step

Sometimes a project needs different behaviour for a step that already exists generically, e.g. a custom `I set field {string} to {string}` that does extra handling your project needs.

**The rule: same filename wins.**

If `keyword_driven/generic/steps/interaction.steps.ts` exists, and your project defines `keyword_driven/projects/<yourProject>/steps/interaction.steps.ts`, your project's version is used for `<yourProject>` and the generic one is left out automatically, no manual exclude list, no config change required.

This is filename-based, not path-based, matching is done on basename only. Keep filenames descriptive enough to avoid accidental collisions between generic files.

Practical notes:
- You don't have to override the whole file's worth of steps, but since the *entire generic file* is excluded once you supply a same-named override, your override file needs to redefine every step that other `.feature` files in your project rely on, not just the one you wanted to change. Copy the generic file as a starting point and change only what's different.
- If you get a "duplicate step definition" error from Cucumber at generation/run time, it almost always means an override file's name doesn't exactly match the generic file it's meant to replace, check the basename carefully.

## Step definition conventions

- Steps live under `steps/`, one file per logical group (`interaction`, `assertions-content`, `assertions-url`, `assertions-visibility`, `navigation`, `waits`, `data`).
- Use `resolveVars()` on any `{string}` parameter that might contain a `+var(...)` reference, and `resolveLocator()` for any selector string, don't bypass these, they're what make steps portable across projects.
- Prefer `debugLog('steps', ...)` over ad hoc `console.log` for anything you want visible under `debug-mode=steps`, see Debug logging below.

## The `vars` and `test` fixtures

`keyword_driven/generic/support/vars.ts` exports the custom `test` fixture (via `base.extend()`) that every step file imports from. If your project needs its own additional fixtures, extend from this `test`, don't create a second independent one, `playwright-bdd` needs a single, consistent `test` instance across all step files for a given project, referenced via the `steps` glob passed to `defineBddConfig()` in `playwright.config.ts`.

## Database helpers

- Connections are pooled/singleton per worker, see `db/connection.ts`. Don't open ad hoc connections inside step files or entity functions; always go through `getDb()`.
- Add new query functions under `db/entities/<table-or-domain>.ts`, following the existing pattern in `db/entities/users.ts` (schema-driven queries via `schema.ts`, `debugLog('sql', ...)` before every query).
- Know the schema before writing deletes/updates, a `DELETE` on `users` may need to cascade to other tables depending on your project's schema. Prefer a project-provided cleanup API endpoint over direct deletes where one exists.

## Debug logging

`keyword_driven/generic/support/debug.ts` exposes `debugLog(category, ...args)` and `isDebug(category)`.

`DEBUG_MODE` is set via the `debug-mode=` param on `run-tests.sh` and accepts:

| Value                          | Meaning        |
|---------------------------------|----------------|
| `true`, `on`, `1`, `all`         | every category on |
| a single category, e.g. `sql`   | only that category |
| `""`, `0`, `false`, `off`, unset | everything off |

Note it's a single value, not a list, you can't currently enable two specific categories (e.g. `sql` and `steps`) without going to `all`.

When adding a new category (e.g. `locator`), no changes to `debug.ts` are needed, just start calling `debugLog('locator', ...)` at the relevant call sites, and users can opt into it with `debug-mode=locator`.

## Reporting

Reports are written per-project, timestamped, and never overwritten:

playwright-report/<project>/<date>/<time>/{spec,feature}/index.html


Controlled by the `report=` param on `run-tests.sh` (`none` | `never` | `on-failure` | `always`), which maps to `REPORT_DIR`/`REPORT_OPEN` env vars read in `playwright.config.ts`. If you're changing reporter behaviour, keep the "always build, rarely auto-open" default intent, the point is a durable record of what ran.

## Changing `playwright.config.ts`

This file is treated as framework-owned, not per-project. If you need to change it:

1. Edit the working copy at the repo root as normal.
2. Once the change is correct, copy it to `installer/canonical/playwright.config.ts`, this is the file `installer/install.sh` restores from on a fresh install, and what it diffs against to decide whether to warn before overwriting someone's local copy.

If these two ever drift out of sync, a user running `install.sh` on top of an already-customized setup will get a confusing "differs from canonical" warning even when their file is actually up to date. Keep them in lockstep when you land a config change.

## Running the installer locally while developing

```bash
chmod +x installer/install.sh
./installer/install.sh
```

Safe to re-run, it checks before installing dependencies or overwriting `playwright.config.ts`, and only prompts if your local config actually differs from canonical.

## Before opening a PR

- Run the relevant project's tests locally (`./run-tests.sh tests-type=feature project=<yourProject> tags=@yourTag`) and confirm a report gets generated.
- If you touched `playwright.config.ts`, confirm `installer/canonical/playwright.config.ts` was updated to match.
- If you added a new env var, add it (with a placeholder value) to `config/local.env.example`.
- Never commit `config/local.env`, `config/staging.env`, or `config/test.env`, these are gitignored on purpose.

## Code style

- TypeScript throughout; keep step definitions thin, push logic into `support/` or `db/entities/` rather than inlining it in step files.
- No em-dashes in comments/docs (matches the maintainer's existing style, not enforced by tooling, just a convention here).