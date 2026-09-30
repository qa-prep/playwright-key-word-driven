// location: tests_keyword_driven/generic/support/curlTemplateLoader.ts
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { resolveTokens } from './envTokens';

export interface CurlVars {
  [key: string]: string;
}

export interface ParsedCurlRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

const GENERIC_TEMPLATES_ROOT = path.resolve(__dirname, '../curl-templates');

// tests_keyword_driven/projects/<PROJECT>/curl-templates - same PROJECT
// run-tests.sh exports and playwright.config.ts reads. A project can
// override any generic template by name (e.g. its own auth/register.curl
// with fields the generic one doesn't need), or add project-only ones,
// without touching the generic set other projects share.
function projectTemplatesRoot(): string {
  const project = process.env.PROJECT ?? 'default';
  return path.resolve(__dirname, '../../projects', project, 'curl-templates');
}

// Project-specific first, generic as the fallback - first one that exists
// on disk wins. Returns null if neither does, so callers can throw a
// message naming both paths they checked, not just fail with ENOENT on
// whichever one they happened to try.
function resolveTemplateFile(templateName: string): string | null {
  const projectPath = path.join(projectTemplatesRoot(), `${templateName}.curl`);
  if (existsSync(projectPath)) return projectPath;

  const genericPath = path.join(GENERIC_TEMPLATES_ROOT, `${templateName}.curl`);
  if (existsSync(genericPath)) return genericPath;

  return null;
}

export function curlTemplateExists(templateName: string): boolean {
  return resolveTemplateFile(templateName) !== null;
}

// Comment lines (# or //) are dropped before anything else, so a comment can
// mention +var(x) or _TOKENS without them being resolved or required.
function stripComments(template: string): string {
  return template
    .split('\n')
    .filter((line) => !/^\s*(#|\/\/)/.test(line))
    .join('\n');
}

// Replaces +var(name) from the test's variables and _TOKENS from the env file
// in a single pass. Unknown _TOKENS are left exactly as written.
function resolveTemplateVars(template: string, vars: CurlVars): string {
  return resolveTokens(template, (key) => {
    if (!(key in vars)) {
      throw new Error(`curl template references +var(${key}) but no value was provided`);
    }
    return vars[key];
  });
}

// Reads the small curl subset our templates use (--url, -X/--request, -H,
// --data-raw/--data/-d) as plain text, never executes it as shell. That's
// the whole point: testers can put arbitrary characters in +var() values
// without shell-quoting risk, the only thing to watch for is a raw `'`
// landing inside a --data-raw body, which would prematurely close the match
// below (same as it would break real curl).
export function loadCurlTemplate(templateName: string, vars: CurlVars): ParsedCurlRequest {
  const file = resolveTemplateFile(templateName);
  if (!file) {
    const project = process.env.PROJECT ?? 'default';
    throw new Error(
      `curl template "${templateName}" not found. Checked:\n` +
        `  tests_keyword_driven/projects/${project}/curl-templates/${templateName}.curl\n` +
        `  tests_keyword_driven/generic/curl-templates/${templateName}.curl`,
    );
  }
  const rawTemplate = readFileSync(file, 'utf8');
  const command = resolveTemplateVars(stripComments(rawTemplate), vars);

  const urlMatch = command.match(/--url\s+'([^']*)'/);
  if (!urlMatch) {
    throw new Error(`curl template "${templateName}" has no --url 'value' line`);
  }
  const url = urlMatch[1];

  const methodMatch = command.match(/(?:-X|--request)\s+'?(\w+)'?/);

  const headers: Record<string, string> = {};
  for (const headerMatch of command.matchAll(/-H\s+'([^']*)'/g)) {
    const [key, ...rest] = headerMatch[1].split(':');
    headers[key.trim()] = rest.join(':').trim();
  }

  const bodyMatch = command.match(/(?:--data-raw|--data|-d)\s+'([^']*)'/);
  const body = bodyMatch ? bodyMatch[1] : undefined;

  // Same inference real curl does: presence of a body implies POST.
  const method = methodMatch ? methodMatch[1].toUpperCase() : body ? 'POST' : 'GET';

  return { method, url, headers, body };
}