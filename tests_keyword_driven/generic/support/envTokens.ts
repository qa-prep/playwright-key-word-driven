// location: tests_keyword_driven/generic/support/envTokens.ts
import { existsSync } from 'fs';
import path from 'path';
import { evaluateDataFunctions, resolveBareUuid } from './dataFunctions';

// A "token key" is an env var whose name starts with a single underscore
// followed by a letter (so bash's own "_" and macOS's "__CF_..." are ignored).
const TOKEN_KEY = /^_[A-Za-z][A-Za-z0-9_]*$/;

let loadAttempted = false;

function tokenKeys(): string[] {
  return Object.keys(process.env).filter((k) => TOKEN_KEY.test(k));
}

// run-tests.sh already exports everything from config/<env>.env. This only
// kicks in for direct `npx playwright test` runs where nothing was exported.
function ensureEnvLoaded(): void {
  if (loadAttempted) return;
  loadAttempted = true;
  if (tokenKeys().length > 0) return;

  const envFile = path.resolve(__dirname, '../../../config', `${process.env.TEST_ENV ?? 'local'}.env`);
  if (!existsSync(envFile)) return;
  try {
    (process as any).loadEnvFile(envFile); // never overrides vars that are already set
  } catch {
    // older Node or unparsable file: run through run-tests.sh instead
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Replaces bare _ENV_TOKEN occurrences (only for _ vars that actually
// exist) with their process.env value. Runs before the +func(...) pass
// below, so an env token can be used as a plain-text argument to a
// function, e.g. +lower(_SOME_TOKEN). Unknown _TOKENS are left as written.
function resolveEnvTokens(input: string): string {
  const keys = tokenKeys()
    .sort((a, b) => b.length - a.length) // longest first so _API_URL_V2 beats _API_URL
    .map(escapeRegExp);
  if (keys.length === 0) return input;
  const pattern = new RegExp(`(?<![A-Za-z0-9_])(${keys.join('|')})(?![A-Za-z0-9_])`, 'g');
  return input.replace(pattern, (_match, envName: string) => process.env[envName] as string);
}

// Replaces, in order:
//   1. _ENV_TOKEN            -> process.env._ENV_TOKEN
//   2. bare +uuid            -> a random UUID (see dataFunctions.ts)
//   3. +var(name), +lower(...), +randalpha(n), etc, innermost-first so they
//      compose, e.g. +lower(+randalpha(8)) - see dataFunctions.ts
export function resolveTokens(input: string, lookupVar: (name: string) => string): string {
  ensureEnvLoaded();
  const afterEnvTokens = resolveEnvTokens(input);
  const afterBareUuid = resolveBareUuid(afterEnvTokens);
  return evaluateDataFunctions(afterBareUuid, lookupVar);
}