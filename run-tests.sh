#!/usr/bin/env bash

#usage:  ./run-tests.sh tests-type=feature project=myProjectA tags=@keywordTest debug-mode=all headed=true"
#usage:  ./run-tests.sh project=myProjectA tags=@keywordTest"

set -euo pipefail

# --- figure out which environment we're targeting, before anything else,
# since it decides which settings file (and DB/app URLs) get loaded below.
# This is only a first pass looking for env=; the full argument parse still
# happens further down, so env= can appear anywhere on the command line
# same as any other flag.
ENV="local"
for arg in "$@"; do
  case "$arg" in
    env=*) ENV="${arg#env=}" ;;
  esac
done

# --- load the environment file (DB creds, app/api URLs, and which settings
# file to use), lowest precedence first ---
ENV_FILE="config/${ENV}.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "No environment file found at ${ENV_FILE} (env=${ENV})" >&2
  exit 1
fi
set -a
source "$ENV_FILE"
set +a

# --- load the settings file the env file points at (falls back to the
# canonical defaults if the env file didn't set SETTINGS_FILE) ---
SETTINGS_FILE="${_SETTINGS_FILE:-config/default-settings.config}"
if [ ! -f "$SETTINGS_FILE" ]; then
  echo "_SETTINGS_FILE=${SETTINGS_FILE} (from ${ENV_FILE}) not found" >&2
  exit 1
fi
set -a
source "$SETTINGS_FILE"
set +a

TESTS_TYPE="${TESTS_TYPE:-feature}"
TAGS="${TAGS:-}"
PROJECT="${PROJECT:-default}"
HEADED="${HEADED:-false}"
REPORT_MODE="${REPORT_MODE:-never}"
DEBUG_MODE="${DEBUG_MODE:-off}"
BROWSERS="${BROWSERS:-chrome}"
WORKERS="${WORKERS:-default}"
TEST_EXIT_CODE=0
OPEN_REPORT_DIR=""
SPEED="${SPEED:-fast}"
SCREENSHOT_ON_FAIL="${SCREENSHOT_ON_FAIL:-true}"
SLACK_ENABLED="${SLACK_ENABLED:-false}"
SLACK_NOTIFY_MODE="${SLACK_NOTIFY_MODE:-on-failure}"
SLACK_NEVER_IN_DEBUG="${SLACK_NEVER_IN_DEBUG:-true}"

for arg in "$@"; do
  key="${arg%%=*}"
  value="${arg#*=}"
  case "$key" in
    tests-type) TESTS_TYPE="$value" ;;
    tags) TAGS="$value" ;;
    project) PROJECT="$value" ;;
    report) REPORT_MODE="$value" ;;
    debug-mode) DEBUG_MODE="$value" ;;
    headed) HEADED="$value" ;;
    browsers) BROWSERS="$value" ;;
    workers) WORKERS="$value" ;;
    speed) SPEED="$value" ;;
    env) ENV="$value" ;;  # already resolved above; kept here so it's a recognised flag, not "Unknown argument"
    app_url) export _APP_URL="$value" ;;
    api_url) export _API_URL="$value" ;;
    slack-enabled) SLACK_ENABLED="$value" ;;
    slack-notify-mode) SLACK_NOTIFY_MODE="$value" ;;
    slack-never-in-debug) SLACK_NEVER_IN_DEBUG="$value" ;;
    screenshot-on-fail) SCREENSHOT_ON_FAIL="$value" ;;
    *) echo "Unknown argument: $key" >&2; exit 1 ;;
  esac
done

case "$SLACK_ENABLED" in
  true|false) ;;
  *) echo "slack must be true or false" >&2; exit 1 ;;
esac

case "$SLACK_NOTIFY_MODE" in
  never|on-failure|always) ;;
  *) echo "slack-mode must be never, on-failure, or always" >&2; exit 1 ;;
esac

case "$REPORT_MODE" in
  none|never|on-failure|always) ;;
  *) echo "report must be none (dont even build), never (build but don't open), on-failure (build and open only if there are failures), or always (build and open regardless of pass/fail)" >&2; exit 1 ;;
esac

case "$DEBUG_MODE" in
  off|sql|steps|all|1|0|on) ;;
  *) echo "debug-mode must be all, sql, steps or off" >&2; exit 1 ;;
esac

case "$SCREENSHOT_ON_FAIL" in
  true|false) ;;
  *) echo "screenshot-on-fail must be true or false" >&2; exit 1 ;;
esac

case "$WORKERS" in
  default|max) ;;
  ''|*[!0-9]*) echo "workers must be 'default', 'max', or a positive whole number" >&2; exit 1 ;;
  *) ;;
esac

case "$SLACK_NEVER_IN_DEBUG" in
  true|false) ;;
  *) echo "slack-never-in-debug must be true or false" >&2; exit 1 ;;
esac

SLACK_SUPPRESSED_BY_DEBUG=false
if [ "$SLACK_NEVER_IN_DEBUG" = "true" ] && [ "$DEBUG_MODE" != "off" ]; then
  SLACK_SUPPRESSED_BY_DEBUG=true
fi

case "$SPEED" in
  fast|medium|slow|vslow) ;;
  *) echo "speed must be fast, medium, slow, or vslow" >&2; exit 1 ;;
esac

# Resolve "mixed" to the actual browser list here, rather than pushing that
# keyword down into playwright.config.ts, so the config only ever has to
# understand a plain comma-separated list.
case "$BROWSERS" in
  mixed) BROWSERS_RESOLVED="chrome,firefox,safari" ;;
  chrome|firefox|safari) BROWSERS_RESOLVED="$BROWSERS" ;;
  chrome,firefox|chrome,safari|firefox,safari|chrome,firefox,safari) BROWSERS_RESOLVED="$BROWSERS" ;;
  *) echo "browsers must be chrome, firefox, safari, mixed, or a comma-separated list of chrome/firefox/safari" >&2; exit 1 ;;
esac

export SLACK_ENABLED
export SLACK_NOTIFY_MODE
export SLACK_NEVER_IN_DEBUG
export DEBUG_MODE
export BROWSERS="$BROWSERS_RESOLVED"
export WORKERS
export SPEED
export ENV
export PROJECT

if [ "$DEBUG_MODE" != "off" ]; then
  ORANGE='\033[38;5;208m'
  NC='\033[0m'
  MSG="[debug-mode=${DEBUG_MODE}] forcing a single worker — tests will run serially, not in parallel"
  ENVMSG="[env: $ENV | browser: $BROWSERS_RESOLVED | speed: $SPEED | headed: $HEADED | report: $REPORT_MODE"
  APPMSG="[app_url: ${_APP_URL:-unset} | api_url: ${_API_URL:-unset}]"
  BORDER=$(printf '%*s' "$((${#MSG} + 4))" '' | tr ' ' '*')
  echo -e "${ORANGE}${BORDER}${NC}"
  echo -e "${ORANGE}* ${MSG} *${NC}"
  echo -e "${ORANGE}* ${ENVMSG} *${NC}"
  echo -e "${ORANGE}* ${APPMSG} *${NC}"
  echo -e "${ORANGE}${BORDER}${NC}"
  export PW_DEBUG_WARNED=1
fi

TAGS_CLEAN=$(echo "$TAGS" | tr -d ' ')

REPORT_DATE="$(date +%Y-%m-%d)"
REPORT_TIME="$(date +%H%M%S)"
REPORT_BASE="playwright-report/${PROJECT}/${REPORT_DATE}/${REPORT_TIME}"

IFS=',' read -ra BROWSER_LIST <<< "$BROWSERS_RESOLVED"

RUN_COMMAND="./run-tests.sh tests-type=${TESTS_TYPE} project=${PROJECT} env=${ENV} browsers=${BROWSERS_RESOLVED} headed=${HEADED} debug-mode=${DEBUG_MODE} speed=${SPEED} report=${REPORT_MODE} workers=${WORKERS}"
if [ -n "$TAGS_CLEAN" ]; then
  RUN_COMMAND="${RUN_COMMAND} tags=${TAGS_CLEAN}"
fi


RUN_START_EPOCH=$(date +%s)
RUN_START_HUMAN=$(date "+%Y-%m-%d %H:%M:%S")

if [ "$SLACK_ENABLED" = "true" ] && [ "$SLACK_SUPPRESSED_BY_DEBUG" = "false" ]; then
  node scripts/notify-slack.mjs \
    --phase=start \
    --env="$ENV" \
    --project="$PROJECT" \
    --tags="$TAGS_CLEAN" \
    --browsers="$BROWSERS_RESOLVED" \
    --run-command="$RUN_COMMAND" \
    --start-human="$RUN_START_HUMAN" || echo "Slack start notification failed, continuing" >&2
fi

run_spec() {
  mkdir -p "${REPORT_BASE}/spec"
  export REPORT_DIR="${REPORT_BASE}/spec"
  OPEN_REPORT_DIR="${REPORT_BASE}/spec"
  local args=(test)
  for b in "${BROWSER_LIST[@]}"; do
    args+=("--project=spec-${b}")
  done
  if [ -n "$TAGS_CLEAN" ]; then
    args+=("--grep=$(echo "$TAGS_CLEAN" | tr ',' '|')")
  fi
  if [ "$HEADED" = "true" ]; then
    args+=("--headed")
  fi
  npx playwright "${args[@]}" || TEST_EXIT_CODE=$?
}

# --- PRE_TEST_N / POST_TEST_N phases (see config/default-settings.config) ---
# Numbers, not the full var name, e.g. "1" "2" for PRE_TEST_1/PRE_TEST_2.
# compgen -v only checks that the variable NAME exists, not its value - the
# canonical settings template declares PRE_TEST_1/PRE_TEST_2/POST_TEST_1/
# POST_TEST_2 with empty values by default, so without the emptiness check
# below, every fresh install would "discover" phases that don't actually
# exist as Playwright projects (playwright.config.ts's own discovery does
# filter empty values, this has to match it or the two sides disagree).
discover_phase_numbers() {
  local prefix="$1" var
  for var in $(compgen -v "$prefix" 2>/dev/null | grep -E "^${prefix}[0-9]+$"); do
    if [ -n "${!var:-}" ]; then
      echo "${var#$prefix}"
    fi
  done | sort -n
}

# Runs one phase's already-generated project. Tag-unfiltered on purpose,
# a phase runs everything in its folder, it's not part of the tagged main
# suite selection.
run_phase() {
  local kind="$1" num="$2"  # kind: pre-test | post-test
  mkdir -p "${REPORT_BASE}/${kind}-${num}"
  export REPORT_DIR="${REPORT_BASE}/${kind}-${num}"
  local args=(test "--project=${kind}-${num}-${PROJECT}")
  if [ "$HEADED" = "true" ]; then
    args+=("--headed")
  fi
  npx playwright "${args[@]}"
}

run_feature() {
  # Generates specs for every registered project (main + all phases) in one
  # pass, tag-unfiltered - tags are applied later, only to the main suite's
  # own `playwright test` invocation (like run_spec() already does via
  # --grep), so a PRE_TEST/POST_TEST phase is never accidentally skipped
  # just because its scenarios don't happen to match the main suite's tags.
  npx bddgen

  local phase_failed=false
  for num in $(discover_phase_numbers "PRE_TEST_"); do
    echo ""
    echo "=== Running PRE_TEST_${num} ==="
    if ! run_phase "pre-test" "$num"; then
      echo "PRE_TEST_${num} failed, stopping before the main suite runs." >&2
      TEST_EXIT_CODE=1
      phase_failed=true
      break
    fi
  done

  if [ "$phase_failed" = "false" ]; then
    mkdir -p "${REPORT_BASE}/feature"
    export REPORT_DIR="${REPORT_BASE}/feature"
    OPEN_REPORT_DIR="${REPORT_BASE}/feature"
    local test_args=(test)
    for b in "${BROWSER_LIST[@]}"; do
      test_args+=("--project=feature-${PROJECT}-${b}")
    done
    if [ -n "$TAGS_CLEAN" ]; then
      test_args+=("--grep=$(echo "$TAGS_CLEAN" | tr ',' '|')")
    fi
    if [ "$HEADED" = "true" ]; then
      test_args+=("--headed")
    fi
    npx playwright "${test_args[@]}" || TEST_EXIT_CODE=$?
  fi

  # Always run, teardown-style, even if a PRE_TEST or the main suite failed.
  for num in $(discover_phase_numbers "POST_TEST_"); do
    echo ""
    echo "=== Running POST_TEST_${num} ==="
    if ! run_phase "post-test" "$num"; then
      echo "POST_TEST_${num} failed." >&2
      TEST_EXIT_CODE=1
    fi
  done
}

case "$TESTS_TYPE" in
  spec) run_spec ;;
  feature) run_feature ;;
  all) run_spec; run_feature ;;
  *) echo "tests-type must be spec, feature, or all" >&2; exit 1 ;;
esac

# --- everything below now always runs, pass or fail ---

if [ "$REPORT_MODE" != "none" ]; then
  echo "Report(s) written under: ${REPORT_BASE}"
fi

if [ "$DEBUG_MODE" != "all" ] || [ "$HEADED" != "true" ]; then
  RERUN_CMD="./run-tests.sh tests-type=${TESTS_TYPE} project=${PROJECT}"
  if [ -n "$TAGS_CLEAN" ]; then
    RERUN_CMD="${RERUN_CMD} tags=${TAGS_CLEAN}"
  fi
  RERUN_CMD="${RERUN_CMD} debug-mode=all headed=true speed=slow"

  CYAN='\033[0;36m'
  NC='\033[0m'
  echo ""
  echo -e "${CYAN}Want to see this run step-by-step, use the following command:${NC}"
  echo -e "${CYAN}  ${RERUN_CMD}${NC}"
fi

OPEN_NOW=false
case "$REPORT_MODE" in
  always) OPEN_NOW=true ;;
  on-failure) [ "$TEST_EXIT_CODE" -ne 0 ] && OPEN_NOW=true ;;
esac

# Discovered rather than hardcoded to spec/feature, so PRE_TEST_N/POST_TEST_N
# phase results (each written to their own report subfolder by run_phase())
# are automatically included in the combined Slack summary too.
RESULTS_FILES=()
for f in "${REPORT_BASE}"/*/results.json; do
  [ -e "$f" ] && RESULTS_FILES+=("$f")
done
RESULTS_JOINED=$(IFS=,; echo "${RESULTS_FILES[*]:-}")

RUN_END_EPOCH=$(date +%s)
RUN_END_HUMAN=$(date "+%Y-%m-%d %H:%M:%S")
DURATION_SECONDS=$((RUN_END_EPOCH - RUN_START_EPOCH))

if [ "$SLACK_ENABLED" = "true" ] && [ "$SLACK_SUPPRESSED_BY_DEBUG" = "false" ]; then
  node scripts/notify-slack.mjs \
    --phase=finish \
    --results="$RESULTS_JOINED" \
    --env="$ENV" \
    --project="$PROJECT" \
    --tags="$TAGS_CLEAN" \
    --run-command="$RUN_COMMAND" \
    --browsers="$BROWSERS_RESOLVED" \
    --start-human="$RUN_START_HUMAN" \
    --end-human="$RUN_END_HUMAN" \
    --duration-seconds="$DURATION_SECONDS" || echo "Slack notification failed, continuing" >&2
fi

if [ "$OPEN_NOW" = true ] && [ -n "$OPEN_REPORT_DIR" ]; then
  echo ""
  echo "Opening report... (Ctrl+C to stop the local report server when done)"
  npx playwright show-report "$OPEN_REPORT_DIR"
fi

exit $TEST_EXIT_CODE