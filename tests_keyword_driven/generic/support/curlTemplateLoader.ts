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

const TEMPLATES_ROOT = path.resolve(__dirname, '../curl-templates');

function templateFile(templateName: string): string {
  return path.join(TEMPLATES_ROOT, `${templateName}.curl`);
}

export function curlTemplateExists(templateName: string): boolean {
  return existsSync(templateFile(templateName));
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
  const rawTemplate = readFileSync(templateFile(templateName), 'utf8');
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