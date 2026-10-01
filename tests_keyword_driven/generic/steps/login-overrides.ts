// location: tests_keyword_driven/steps/generic/login-overrides.ts
//
// Intentionally empty in the core framework - login flows (fields, selectors,
// even what "logged in" means) are different enough per project that there's
// no sensible generic default to ship here.
//
// A project defines its own custom login shortcut (eg. "Given I am logged in with
// ... and pass ...") by creating a file with this exact basename at
// tests_keyword_driven/projects/<project>/steps/login-overrides.ts.
// buildSteps.ts overrides by basename: a project file named login-overrides.ts
// replaces this file entirely, while every other generic step file (clicks,
// fields, assertions, etc) stays untouched - so a project only ever has to
// write the steps it's actually overriding, never copy the whole framework.
//
// See dash-sites-tests's projects/dash-sites/steps/login-overrides.ts for a
// real example.
