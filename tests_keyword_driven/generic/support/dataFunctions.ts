// location: tests_keyword_driven/generic/support/dataFunctions.ts
//
// The +func(...) family: +var(name) plus a small set of composable data
// generators/transforms ported from an earlier framework - random test
// data (usernames, passwords, etc) without needing a dedicated step just to
// generate a string. Composable/nestable, e.g. +lower(+randalpha(8)).
//
// Evaluated innermost-first: for +outer(+inner(x)), +inner(x) resolves to a
// plain value before +outer ever sees it, so every function only ever
// receives a plain string, never another unresolved +call(...).

import { randomUUID } from 'crypto';

const ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMERIC = '0123456789';
const ALPHANUMERIC = ALPHA + NUMERIC;
const HEX = 'abcdef0123456789';
const DEFAULT_RANDOM_LENGTH = 10;

function randomString(chars: string, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if (trimmed.length >= 2 && (first === "'" || first === '"') && last === first) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function randomLength(rawArg: string): number {
  const trimmed = rawArg.trim();
  const parsed = trimmed === '' ? NaN : Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_RANDOM_LENGTH;
}

// name -> (resolved, already-unquoted argument, lookupVar) -> result
const FUNCTIONS: Record<string, (arg: string, lookupVar: (name: string) => string) => string> = {
  var: (arg, lookupVar) => lookupVar(arg),
  lower: (arg) => arg.toLowerCase(),
  upper: (arg) => arg.toUpperCase(),
  alpha: (arg) => arg.replace(/[^A-Za-z]/g, ''),
  numeric: (arg) => arg.replace(/[^0-9]/g, ''),
  alphanumeric: (arg) => arg.replace(/[^A-Za-z0-9]/g, ''),
  randalpha: (arg) => randomString(ALPHA, randomLength(arg)),
  randnumeric: (arg) => randomString(NUMERIC, randomLength(arg)),
  randalphanumeric: (arg) => randomString(ALPHANUMERIC, randomLength(arg)),
  randhex: (arg) => randomString(HEX, randomLength(arg)),
  uuid: () => randomUUID(),
};

// Finds the first "+name(" in input, then its matching ")" (tracking nested
// parens), so +outer(+inner(x)) doesn't stop at +inner's own closing paren.
function findFirstCall(
  input: string,
): { start: number; end: number; name: string; argStart: number; argEnd: number } | null {
  const opener = /\+([A-Za-z][A-Za-z0-9]*)\(/.exec(input);
  if (!opener) return null;
  const name = opener[1];
  const argStart = opener.index + opener[0].length;
  let depth = 1;
  for (let i = argStart; i < input.length; i++) {
    if (input[i] === '(') depth++;
    else if (input[i] === ')') {
      depth--;
      if (depth === 0) {
        return { start: opener.index, end: i + 1, name, argStart, argEnd: i };
      }
    }
  }
  return null; // unmatched paren - leave as-is, nothing sensible to resolve
}

// Single left-to-right pass: for each call found, resolve it (or leave it
// exactly as written if the name isn't recognised, e.g. incidental
// "+something(" in real test data) and always advance position past it -
// never re-scan the same span, whether it resolved or not. That matters:
// an earlier version re-scanned the whole string after each call, which
// infinite-looped the moment a name wasn't recognised, since "leave
// unchanged" produced the exact same string to scan again forever.
export function evaluateDataFunctions(input: string, lookupVar: (name: string) => string): string {
  let result = '';
  let pos = 0;
  while (pos < input.length) {
    const remaining = input.slice(pos);
    const call = findFirstCall(remaining);
    if (!call) {
      result += remaining;
      break;
    }
    const { start, end, name, argStart, argEnd } = call;
    result += remaining.slice(0, start);
    const rawArg = evaluateDataFunctions(remaining.slice(argStart, argEnd), lookupVar); // innermost first
    const fn = FUNCTIONS[name];
    result += fn ? fn(stripQuotes(rawArg), lookupVar) : remaining.slice(start, end);
    pos += end;
  }
  return result;
}

// Bare +uuid with no parens, matching the exact syntax this was ported from.
// Runs as its own pass before the general +func(...) parser above (which
// only recognises the func(...) shape), so +uuid works standalone AND as a
// plain-text argument to another function, e.g. +numeric(+uuid).
export function resolveBareUuid(input: string): string {
  return input.replace(/\+uuid(?!\()/g, () => randomUUID());
}
