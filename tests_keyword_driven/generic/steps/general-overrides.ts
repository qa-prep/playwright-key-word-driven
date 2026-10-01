// location: tests_keyword_driven/steps/generic/general-overrides.ts
//
// Intentionally empty in the core framework - a catch-all override slot for
// project-specific steps that don't warrant their own dedicated
// -overrides.ts file (see login-overrides.ts for the first, most likely
// candidate to actually need this pattern).
//
// Same override rule as login-overrides.ts: a project's
// tests_keyword_driven/projects/<project>/steps/general-overrides.ts, named
// with this exact basename, replaces this file entirely - see buildSteps.ts.
