// location: keyword_driven/generic/support/stepLogger.ts

import { createBdd } from 'playwright-bdd';
import { test } from './vars';
import { isDebug } from './debug';

const { BeforeStep } = createBdd(test);

const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';    // Given-style: setup / navigation
const YELLOW = '\x1b[93m'; // When-style: actions
const GREEN = '\x1b[32m';   // Then-style: assertions
const MAGENTA = '\x1b[35m'; // quoted parameters

function colorForStep(text: string): string {
  if (/^I should/.test(text)) return GREEN;
  if (/^I (am on|go to)/.test(text)) return CYAN;
  return YELLOW;
}

BeforeStep(async ({ $step }) => {
  if (!isDebug('steps')) return;

  const color = colorForStep($step.title);
  const withHighlightedParams = $step.title.replace(
    /"([^"]*)"/g,
    `${RESET}${MAGENTA}"$1"${RESET}${color}`,
  );

  console.log(`  ${color}${withHighlightedParams}${RESET}`);
});