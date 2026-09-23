#!/usr/bin/env node
// location: scripts/notify-slack.mjs
//
// Posts a pass/fail summary to Slack after a run. Called from run-tests.sh.
// SLACK_ENABLED / SLACK_NOTIFY_MODE come from config/default-settings.config.
// SLACK_BOT_TOKEN / SLACK_CHANNEL come from the env file (config/<env>.env).
// Requires Node 18+ for global fetch.

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

const SLACK_NOTIFY_MODE = (process.env.SLACK_NOTIFY_MODE ?? 'on-failure').trim().toLowerCase();
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL;

if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL) {
  console.error('[slack] SLACK_ENABLED=true but SLACK_BOT_TOKEN / SLACK_CHANNEL are not set, skipping');
  process.exit(0);
}

// --- combine stats from every results.json this run produced (spec and/or feature) ---
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

if (SLACK_NOTIFY_MODE === 'never') process.exit(0);
if (SLACK_NOTIFY_MODE === 'on-failure' && !hasFailure) process.exit(0);

// --- @name -> <@SLACKID>, same idea as your old comment block ---
function resolveMentions(text) {
  const usersPath = path.join(process.cwd(), 'config', 'slack-users.json');
  if (!existsSync(usersPath)) return text;
  const users = JSON.parse(readFileSync(usersPath, 'utf8'));
  return text.replace(/@([A-Za-z0-9_]+)/g, (match, name) => (users[name] ? `<@${users[name]}>` : match));
}

const icon = hasFailure ? ':x:' : ':white_check_mark:';
const status = hasFailure ? 'FAILED' : 'PASSED';

let message =
  `${icon} *Playwright run ${status}*\n` +
  `Env: ${args.env ?? '?'} | Project: ${args.project ?? '?'} | Tags: ${args.tags || 'none'} | Browsers: ${args.browsers ?? '?'}\n` +
  `Passed: ${totals.expected + totals.flaky}  Failed: ${totals.unexpected}  Skipped: ${totals.skipped}`;

if (hasFailure && args.mentions) {
  message += `\n${args.mentions}`;
}

message = resolveMentions(message);

const res = await fetch('https://slack.com/api/chat.postMessage', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    'Content-Type': 'application/json; charset=utf-8',
  },
  body: JSON.stringify({ channel: SLACK_CHANNEL, text: message, username: 'auto-bot' }),
});

const body = await res.json();
if (!body.ok) {
  console.error('[slack] Slack API rejected the message:', body.error);
  process.exit(1);
}