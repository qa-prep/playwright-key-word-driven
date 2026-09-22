// location: keyword_driven/generic/support/debug.ts

// DEBUG_MODE is a single string value:
//   "true" | "on" | "1" | "all"  -> everything on
//   "sql"                        -> only "sql" category
//   "steps"                      -> only "steps" category
//   "" | "0" | "false" | "off"   -> everything off
//   (unset)                      -> everything off

const raw = (process.env.DEBUG_MODE ?? '').trim().toLowerCase();

const ON_ALL = new Set(['true', 'on', '1', 'all']);
const OFF = new Set(['', '0', 'false', 'off']);

const isAll = ON_ALL.has(raw);
const isOff = OFF.has(raw);

export function isDebug(category: string): boolean {
  if (isOff) {return false;}
  if (isAll) {return true;}
  return raw === category.toLowerCase();
}

export function debugLog(category: string, ...args: unknown[]): void {
  if (isDebug(category)) {
    console.log(`[debug:${category}]`, ...args);
  }
}