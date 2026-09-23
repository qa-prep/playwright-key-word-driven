// location: tests_keyword_driven/generic/support/stepLogger.ts

import { createBdd } from 'playwright-bdd';
import { test } from './vars';
import { isDebug } from './debug';

const { Before, After, BeforeStep, AfterStep } = createBdd(test);

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';    // Given-style: setup / navigation
const YELLOW = '\x1b[93m'; // When-style: actions
const GREEN = '\x1b[32m';   // Then-style: assertions
const RED = '\x1b[31m';     // failed step / failed scenario
const MAGENTA = '\x1b[35m'; // quoted parameters
const BLUE = '\x1b[34m';    // feature header

function colorForStep(text: string): string {
  if (/^I should/.test(text)) return GREEN;
  if (/^I (am on|go to)/.test(text)) return CYAN;
  return YELLOW;
}

// Step/feature/scenario logging assumes tests run one at a time in a single
// process (see lastFeatureTitle below). With more than one worker, output
// from different workers interleaves and the grouping breaks even though
// each worker's own logic is correct, so this checks the *actual* worker
// count at runtime rather than trusting DEBUG_MODE alone, in case someone
// overrides --workers on the CLI.
function shouldLog(): boolean {
  if (!isDebug('steps')) return false;
  return test.info().config.workers === 1;
}

// Tracks the last feature we printed a header for, so we only print it once
// per feature, not once per scenario.
let lastFeatureTitle: string | null = null;

Before(async () => {
  if (!shouldLog()) return;

  const testInfo = test.info();

  // One-time check: uncomment to confirm titlePath() matches the feature/
  // scenario split assumed below for your installed playwright-bdd version.
  // console.log('titlePath:', testInfo.titlePath());

  const titlePath = testInfo.titlePath;
  const scenarioTitle = testInfo.title;
  const featureTitle = titlePath[titlePath.length - 2] ?? '(unknown feature)';

  if (featureTitle !== lastFeatureTitle) {
    lastFeatureTitle = featureTitle;
    console.log('');
    console.log(`${BOLD}${BLUE}${'═'.repeat(70)}${RESET}`);
    console.log(`${BOLD}${BLUE}FEATURE: ${featureTitle}${RESET}`);
    console.log(`${BOLD}${BLUE}${'═'.repeat(70)}${RESET}`);
  }

  console.log('');
  console.log(`${BOLD}${'─'.repeat(60)}${RESET}`);
  console.log(`${BOLD}SCENARIO: ${scenarioTitle}${RESET}`);
  console.log(`${BOLD}${'─'.repeat(60)}${RESET}`);
});

BeforeStep(async ({ $step }) => {
  if (!shouldLog()) return;

  const color = colorForStep($step.title);
  const withHighlightedParams = $step.title.replace(
    /"([^"]*)"/g,
    `${RESET}${MAGENTA}"$1"${RESET}${color}`,
  );

  console.log(`  ${color}${withHighlightedParams}${RESET}`);
});

AfterStep(async ({ $step }) => {
  if (!shouldLog()) return;

  const error = ($step as any)?.error as Error | undefined;
  if (error) {
    console.log(`  ${RED}✘ FAILED: ${$step.title}${RESET}`);
    console.log(`  ${RED}${error.message.split('\n')[0]}${RESET}`);
  }
});

After(async () => {
  if (!shouldLog()) return;

  const testInfo = test.info();
  const passed = testInfo.status === testInfo.expectedStatus;
  const label = passed ? `${GREEN}PASSED${RESET}` : `${RED}FAILED${RESET}`;
  const duration = testInfo.duration ?? 0;

  console.log(`${BOLD}${'─'.repeat(60)}${RESET}`);
  console.log(`${BOLD}RESULT: ${label} (${duration}ms)${RESET}`);
});