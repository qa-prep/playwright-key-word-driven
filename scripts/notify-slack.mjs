#!/usr/bin/env node
// location: scripts/notify-slack.mjs
//
// Posts run notifications to Slack. Called from run-tests.sh:
//   --phase=start  -> fired immediately when a run begins
//   --phase=finish -> fired after the run completes (default)
// SLACK_ENABLED / SLACK_NOTIFY_MODE / SLACK_NEVER_IN_DEBUG come from
// config/default-settings.config. SLACK_BOT_TOKEN / SLACK_CHANNEL come
// from the env file (config/<env>.env). Requires Node 18+ for global fetch.

import { readFileSync, existsSync } from 'fs';
import path from 'path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, '').split('=');
    return [k, rest.join('=')];
  })
);

const SLACK_ENABLED = (process.env.SLACK_ENABLED ?? 'false').trim().toLowerCase() === 'true';
if (!SLACK_ENABLED) process.exit(0);

// Belt-and-braces: run-tests.sh already skips calling this script when
// SLACK_SUPPRESSED_BY_DEBUG is true, but guard here too in case this is
// ever invoked another way.
const SLACK_NEVER_IN_DEBUG = (process.env.SLACK_NEVER_IN_DEBUG ?? 'true').trim().toLowerCase() === 'true';
const DEBUG_MODE = (process.env.DEBUG_MODE ?? 'off').trim().toLowerCase();
if (SLACK_NEVER_IN_DEBUG && DEBUG_MODE !== 'off') process.exit(0);

const SLACK_NOTIFY_MODE = (process.env.SLACK_NOTIFY_MODE ?? 'on-failure').trim().toLowerCase();
if (SLACK_NOTIFY_MODE === 'never') process.exit(0);

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL;

if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL) {
  console.error('[slack] SLACK_ENABLED=true but SLACK_BOT_TOKEN / SLACK_CHANNEL are not set, skipping');
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

// --- phase === 'finish': combine stats from every results.json this run produced ---
const jsonPaths = (args.results ?? '').split(',').filter(Boolean);
const totals = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 };

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

if (hasFailure && args.mentions) {
  message += `\n${args.mentions}`;
}

await postToSlack(message);