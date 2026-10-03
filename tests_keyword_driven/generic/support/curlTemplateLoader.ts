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

// A template body only ever uses +var(name) two ways: quoted, as a JSON
// STRING value (eg. "username":"+var(username)"), or bare, as an
// already-JSON-shaped value the author built themselves - an array, a
// number (eg. "team_ids":+var(teamIds), where teamIds is the string
// "[12]"). Which one applies is visible in the TEMPLATE text itself,
// before any real value is substituted - a quote immediately on each side
// of the call, or not. This resolves only the quoted case, JSON-escaping
// the value first (so a username containing a literal '"' can't break out
// of its own field), and leaves every bare call untouched for
// resolveTemplateVars() to substitute exactly as before - escaping those
// would corrupt the array/number the author deliberately placed there
// unquoted.
function substituteJsonStringVars(template: string, vars: CurlVars): string {
  return template.replace(/"\+var\(([A-Za-z0-9_]+)\)"/g, (_match, varName: string) => {
    if (!(varName in vars)) {
      throw new Error(`curl template references +var(${varName}) but no value was provided`);
    }
    // JSON.stringify(x) on a string always produces a double-quoted,
    // correctly-escaped JSON string literal - stripping the outer pair
    // leaves exactly the escaped inner content this quoted slot needs.
    const escaped = JSON.stringify(vars[varName]).slice(1, -1);
    return `"${escaped}"`;
  });
}

// Reads the small curl subset our templates use (--url, -X/--request, -H,
// --data-raw/--data/-d) as plain text, never executes it as shell.
// Structure (url/headers/body) is extracted BEFORE any +var()/_TOKEN gets
// substituted, so a value containing a literal `'` can never land in the
// text these regexes scan - only the template author's own literal syntax
// can, and template files are hand-written, not test data. See
// substituteJsonStringVars() above for how a literal `"` inside a quoted
// body value is handled too; this only protects the `'` that --data-raw
// '...' itself delimits with.
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
  const stripped = stripComments(rawTemplate);

  const urlMatch = stripped.match(/--url\s+'([^']*)'/);
  if (!urlMatch) {
    throw new Error(`curl template "${templateName}" has no --url 'value' line`);
  }
  const urlTemplate = urlMatch[1];

  const methodMatch = stripped.match(/(?:-X|--request)\s+'?(\w+)'?/);

  const headerTemplates = [...stripped.matchAll(/-H\s+'([^']*)'/g)].map((m) => m[1]);

  const bodyMatch = stripped.match(/(?:--data-raw|--data|-d)\s+'([^']*)'/);
  const bodyTemplate = bodyMatch ? bodyMatch[1] : undefined;

  const url = resolveTemplateVars(urlTemplate, vars);

  const headers: Record<string, string> = {};
  for (const headerTemplate of headerTemplates) {
    const resolvedHeader = resolveTemplateVars(headerTemplate, vars);
    const [key, ...rest] = resolvedHeader.split(':');
    headers[key.trim()] = rest.join(':').trim();
  }

  const body =
    bodyTemplate !== undefined
      ? resolveTemplateVars(substituteJsonStringVars(bodyTemplate, vars), vars)
      : undefined;

  // Same inference real curl does: presence of a body implies POST.
  const method = methodMatch ? methodMatch[1].toUpperCase() : body ? 'POST' : 'GET';

  return { method, url, headers, body };
}