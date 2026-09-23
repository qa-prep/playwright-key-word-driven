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
SETTINGS_FILE="${SETTINGS_FILE:-config/default-settings.config}"
if [ ! -f "$SETTINGS_FILE" ]; then
  echo "SETTINGS_FILE=${SETTINGS_FILE} (from ${ENV_FILE}) not found" >&2
  exit 1
fi
set -a
source "$SETTINGS_FILE"
set +a

TESTS_TYPE="${TESTS_TYPE:-all}"
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
    app_url) export APP_URL="$value" ;;
    api_url) export API_URL="$value" ;;
    slack-enabled) SLACK_ENABLED="$value" ;;
    slack-notify-mode) SLACK_NOTIFY_MODE="$value" ;;
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
export DEBUG_MODE
export BROWSERS="$BROWSERS_RESOLVED"
export WORKERS
export SPEED

if [ "$DEBUG_MODE" != "off" ]; then
  ORANGE='\033[38;5;208m'
  NC='\033[0m'
  MSG="[debug-mode=${DEBUG_MODE}] forcing a single worker — tests will run serially, not in parallel"
  ENVMSG="[env: $ENV | browser: $BROWSERS_RESOLVED | speed: $SPEED | headed: $HEADED | report: $REPORT_MODE"
  APPMSG="[app_url: $APP_URL | api_url: $API_URL]"
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

run_feature() {
  mkdir -p "${REPORT_BASE}/feature"
  export REPORT_DIR="${REPORT_BASE}/feature"
  OPEN_REPORT_DIR="${REPORT_BASE}/feature"
  local bddgen_args=()
  if [ -n "$TAGS_CLEAN" ]; then
    bddgen_args+=("--tags=$(echo "$TAGS_CLEAN" | sed 's/,/ or /g')")
  fi
  npx bddgen "${bddgen_args[@]}"

  local test_args=(test)
  for b in "${BROWSER_LIST[@]}"; do
    test_args+=("--project=feature-${PROJECT}-${b}")
  done
  if [ "$HEADED" = "true" ]; then
    test_args+=("--headed")
  fi
  npx playwright "${test_args[@]}" || TEST_EXIT_CODE=$?
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

RESULTS_FILES=()
if [ "$TESTS_TYPE" = "spec" ] || [ "$TESTS_TYPE" = "all" ]; then
  RESULTS_FILES+=("${REPORT_BASE}/spec/results.json")
fi
if [ "$TESTS_TYPE" = "feature" ] || [ "$TESTS_TYPE" = "all" ]; then
  RESULTS_FILES+=("${REPORT_BASE}/feature/results.json")
fi
RESULTS_JOINED=$(IFS=,; echo "${RESULTS_FILES[*]}")

if [ "$SLACK_ENABLED" = "true" ]; then
  node scripts/notify-slack.mjs \
    --results="$RESULTS_JOINED" \
    --env="$ENV" \
    --project="$PROJECT" \
    --tags="$TAGS_CLEAN" \
    --browsers="$BROWSERS_RESOLVED" || echo "Slack notification failed, continuing" >&2
fi

if [ "$OPEN_NOW" = true ] && [ -n "$OPEN_REPORT_DIR" ]; then
  echo ""
  echo "Opening report... (Ctrl+C to stop the local report server when done)"
  npx playwright show-report "$OPEN_REPORT_DIR"
fi

exit $TEST_EXIT_CODE