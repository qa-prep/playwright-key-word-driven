// location: tests_keyword_driven/generic/support/envTokens.ts
import { existsSync } from 'fs';
import path from 'path';

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

// Replaces, in ONE pass:
//   +var(name)  -> lookupVar(name)
//   _ENV_TOKEN  -> process.env._ENV_TOKEN (only for _ vars that actually exist)
// Anything else, including unknown _TOKENS, is left exactly as written.
export function resolveTokens(input: string, lookupVar: (name: string) => string): string {
  ensureEnvLoaded();

  const keys = tokenKeys()
    .sort((a, b) => b.length - a.length) // longest first so _API_URL_V2 beats _API_URL
    .map(escapeRegExp);

  const envPart = keys.length
    ? `|(?<![A-Za-z0-9_])(${keys.join('|')})(?![A-Za-z0-9_])`
    : '';
  const pattern = new RegExp(`\\+var\\(([^)]+)\\)${envPart}`, 'g');

  return input.replace(pattern, (_match, varName?: string, envName?: string) =>
    varName !== undefined ? lookupVar(varName) : (process.env[envName as string] as string),
  );
}