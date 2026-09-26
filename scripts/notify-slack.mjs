#!/usr/bin/env node
// location: scripts/notify-slack.mjs
//
// Posts run notifications to Slack. Called from run-tests.sh:
//   --phase=start  -> fired immediately when a run begins
//   --phase=finish -> fired after the run completes (default)
// _SLACK_ENABLED / _SLACK_NOTIFY_MODE / _SLACK_NEVER_IN_DEBUG come from
// config/default-settings.config. _SLACK_BOT_TOKEN / _SLACK_CHANNEL come
// from the env file (config/<env>.env). Requires Node 18+ for global fetch.

import { readFileSync, existsSync } from 'fs';
import path from 'path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, '').split('=');
    return [k, rest.join('=')];
  })
);

const SLACK_ENABLED = (process.env._SLACK_ENABLED ?? 'false').trim().toLowerCase() === 'true';
if (!SLACK_ENABLED) process.exit(0);

// Belt-and-braces: run-tests.sh already skips calling this script when
// SLACK_SUPPRESSED_BY_DEBUG is true, but guard here too in case this is
// ever invoked another way.
const SLACK_NEVER_IN_DEBUG = (process.env._SLACK_NEVER_IN_DEBUG ?? 'true').trim().toLowerCase() === 'true';
const DEBUG_MODE = (process.env._DEBUG_MODE ?? 'off').trim().toLowerCase();
if (SLACK_NEVER_IN_DEBUG && DEBUG_MODE !== 'off') process.exit(0);

const SLACK_NOTIFY_MODE = (process.env._SLACK_NOTIFY_MODE ?? 'on-failure').trim().toLowerCase();
if (SLACK_NOTIFY_MODE === 'never') process.exit(0);

const SLACK_BOT_TOKEN = process.env._SLACK_BOT_TOKEN;
const SLACK_CHANNEL = process.env._SLACK_CHANNEL;

if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL) {
  console.error('[slack] _SLACK_ENABLED=true but _SLACK_BOT_TOKEN / _SLACK_CHANNEL are not set, skipping');
  process.exit(0);
}

function resolveMentions(text) {
  const usersPath = path.join(process.cwd(), 'config', 'slack-users.json');
  if (!existsSync(usersPath)) return text;
  const users = JSON.parse(readFileSync(usersPath, 'utf8'));
  return text.replace(/@([A-Za-z0-9_]+)/g, (match, name) => (users[name] ? `<@${users[name]}>` : match));
}

function formatDuration(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (h || m) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(' ');
}

async function postToSlack(text) {
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text: resolveMentions(text), username: 'auto-bot' }),
  });
  const body = await res.json();
  if (!body.ok) {
    console.error('[slack] Slack API rejected the message:', body.error);
    process.exit(1);
  }
}

const phase = args.phase ?? 'finish';

if (phase === 'start') {
  const header = `Env: ${args.env ?? '?'} | Project: ${args.project ?? '?'} | Tags: ${args.tags || 'none'} | Browsers: ${args.browsers ?? '?'}`;
  const message =
    `:rocket: *Playwright run starting*\n${header}\n` +
    '`' + (args['run-command'] ?? '?') + '`\n' +
    `Started: ${args['start-human'] ?? '?'}`;
  await postToSlack(message);
  process.exit(0);
}

const MAX_FAILURES_SHOWN = 5;

function stripAnsi(str) {
  return (str ?? '').replace(/\u001b\[[0-9;]*m/g, '');
}

// Assertion errors put the useful part - "Expected X" / "Received Y" (what we
// were looking for vs what was actually there) - right after the generic
// "Error: expect(received)..." preamble, and before the (often long, mostly
// noise) "Call Log:" section. Keep just that middle part; if there's no
// Expected/Received shape (e.g. a plain timeout with no Call Log at all),
// fall back to the first few lines of whatever's left.
function summarizeError(rawMessage) {
  const lines = stripAnsi(rawMessage).trim().split('\n').map((l) => l.trim()).filter(Boolean);
  const callLogIndex = lines.findIndex((l) => l.startsWith('Call Log:'));
  const body = callLogIndex === -1 ? lines : lines.slice(0, callLogIndex);
  const relevant = body.filter((l) => !/^Error: expect/.test(l));
  return (relevant.length ? relevant : lines).slice(0, 4).join('\n');
}

// Playwright's JSON report only knows the *compiled* .features-gen/**/*.spec.js
// location, not the original .feature file's line number - bddgen doesn't emit
// a source map. Recover it by reading the generated file's own
// "// Generated from: <feature path>" header comment, then counting Gherkin
// step lines within that Scenario block until we reach the Nth step (N = how
// many steps of this test actually ran, i.e. the failing one).
function resolveFeatureLocation(specJsPath, scenarioTitle, stepCount) {
  try {
    if (!existsSync(specJsPath)) return null;
    const genMatch = readFileSync(specJsPath, 'utf8').split('\n', 1)[0].match(/^\/\/ Generated from: (.+)$/);
    if (!genMatch) return null;
    const featurePath = genMatch[1].trim();
    if (!existsSync(featurePath)) return null;
    const featureLines = readFileSync(featurePath, 'utf8').split('\n');

    const scenarioLineIdx = featureLines.findIndex(
      (l) => /^\s*(Scenario|Scenario Outline):/.test(l) && l.includes(scenarioTitle),
    );
    if (scenarioLineIdx === -1) return null;

    let seen = 0;
    for (let i = scenarioLineIdx + 1; i < featureLines.length; i++) {
      if (/^\s*(Scenario|Scenario Outline):/.test(featureLines[i])) break; // ran off into the next scenario
      if (/^\s*(Given|When|Then|And|But)\s/.test(featureLines[i])) {
        seen++;
        if (seen === stepCount) return { file: featurePath, line: i + 1 };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Walks every suite/spec in one results.json, collecting one entry per failed
// test: which Feature/Scenario, the exact step text that failed (as written
// in the .feature file, tokens unresolved), and its error - the same shape
// regardless of whether this came from a PRE_TEST/POST_TEST phase or the main
// suite, since they're all just results.json files to this function.
function collectFailuresFromReport(jsonPath, rootDir) {
  const failures = [];
  let data;
  try {
    data = JSON.parse(readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    console.error(`[slack] Could not parse ${jsonPath}: ${e.message}`);
    return failures;
  }

  function walk(suite, feature) {
    for (const spec of suite.specs ?? []) {
      if (spec.ok) continue;
      for (const t of spec.tests ?? []) {
        for (const r of t.results ?? []) {
          if (r.status !== 'failed' && r.status !== 'timedOut') continue;
          const steps = r.steps ?? [];
          const failingStep = steps.find((s) => s.error);
          const error = failingStep?.error ?? r.error;
          const stepCount = steps.filter((s) => /^(Given|When|Then|And|But)\s/.test(s.title)).length;
          const specJsPath = path.isAbsolute(suite.file) ? suite.file : path.join(rootDir, suite.file);
          const location = resolveFeatureLocation(specJsPath, spec.title, stepCount);
          failures.push({
            feature: feature ?? '(unknown feature)',
            scenario: spec.title,
            stepText: failingStep?.title ?? null,
            errorSummary: summarizeError(error?.message ?? 'Unknown error'),
            location: location ? `${path.relative(rootDir, location.file)}:${location.line}` : null,
          });
        }
      }
    }
    for (const sub of suite.suites ?? []) walk(sub, sub.title ?? feature);
  }

  for (const top of data.suites ?? []) walk(top, top.title);
  return failures;
}

function formatFailuresBlock(failures) {
  if (!failures.length) return '';
  const shown = failures.slice(0, MAX_FAILURES_SHOWN);
  const items = shown.map((f, i) => {
    const header = `*${i + 1}. ${f.feature}* › ${f.scenario}`;
    const locationLine = f.location ?? '';
    const stepLine = f.stepText ? `Step: ${f.stepText}\n\n${f.errorSummary}` : f.errorSummary;
    return [header, locationLine, '```' + stepLine + '```'].filter(Boolean).join('\n');
  });
  const more = failures.length - shown.length;
  const footer = more > 0 ? `\n\n_...and ${more} more failure${more === 1 ? '' : 's'}_` : '';
  return `\n\n*Failures (showing ${shown.length} of ${failures.length}):*\n\n${items.join('\n\n')}${footer}`;
}

// --- phase === 'finish': combine stats from every results.json this run produced ---
const jsonPaths = (args.results ?? '').split(',').filter(Boolean);
const totals = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 };
const allFailures = [];

for (const p of jsonPaths) {
  if (!existsSync(p)) continue;
  try {
    const stats = JSON.parse(readFileSync(p, 'utf8')).stats ?? {};
    totals.expected += stats.expected ?? 0;
    totals.unexpected += stats.unexpected ?? 0;
    totals.flaky += stats.flaky ?? 0;
    totals.skipped += stats.skipped ?? 0;
  } catch (e) {
    console.error(`[slack] Could not parse ${p}: ${e.message}`);
  }
  allFailures.push(...collectFailuresFromReport(p, process.cwd()));
}

const hasFailure = totals.unexpected > 0;
if (SLACK_NOTIFY_MODE === 'on-failure' && !hasFailure) process.exit(0);

const icon = hasFailure ? ':x:' : ':white_check_mark:';
const status = hasFailure ? 'FAILED' : 'PASSED';
const timingLine = `Started: ${args['start-human'] ?? '?'}  Finished: ${args['end-human'] ?? '?'}  Duration: ${formatDuration(args['duration-seconds'])}`;

let message =
  `${icon} *Playwright run ${status}*\n` +
  `Passed: ${totals.expected + totals.flaky}  Failed: ${totals.unexpected}  Skipped: ${totals.skipped}\n` +
  timingLine;

if (hasFailure) {
  message += formatFailuresBlock(allFailures);
  if (args.mentions) message += `\n${args.mentions}`;
}

await postToSlack(message);