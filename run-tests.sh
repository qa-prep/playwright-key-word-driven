#!/usr/bin/env bash

#usage: ./run-tests.sh tests-type=feature project=myProjectA tags=@register report=on-failure debug-mode=all headed=true

set -euo pipefail

TESTS_TYPE="all"
TAGS=""
PROJECT="default"
HEADED="false"
REPORT_MODE="never"
DEBUG_MODE="off"
TEST_EXIT_CODE=0
OPEN_REPORT_DIR=""

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
    app_url) export APP_URL="$value" ;;
    api_url) export API_URL="$value" ;;
    *) echo "Unknown argument: $key" >&2; exit 1 ;;
  esac
done

case "$REPORT_MODE" in
  none|never|on-failure|always) ;;
  *) echo "report must be none (dont even build), never (build but don't open), on-failure (build and open only if there are failures), or always (build and open regardless of pass/fail)" >&2; exit 1 ;;
esac

case "$DEBUG_MODE" in
  off|sql|steps|all|1|0|on) ;;
  *) echo "debug-mode must be all, sql, steps or off" >&2; exit 1 ;;
esac

export DEBUG_MODE

TAGS_CLEAN=$(echo "$TAGS" | tr -d ' ')

REPORT_DATE="$(date +%Y-%m-%d)"
REPORT_TIME="$(date +%H%M%S)"
REPORT_BASE="playwright-report/${PROJECT}/${REPORT_DATE}/${REPORT_TIME}"

run_spec() {
  mkdir -p "${REPORT_BASE}/spec"
  export REPORT_DIR="${REPORT_BASE}/spec"
  OPEN_REPORT_DIR="${REPORT_BASE}/spec"
  local args=(test --project=spec-chromium)
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

  local test_args=(test --project="feature-${PROJECT}")
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
  RERUN_CMD="${RERUN_CMD} debug-mode=all headed=true"

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

if [ "$OPEN_NOW" = true ] && [ -n "$OPEN_REPORT_DIR" ]; then
  echo ""
  echo "Opening report... (Ctrl+C to stop the local report server when done)"
  npx playwright show-report "$OPEN_REPORT_DIR"
fi

exit $TEST_EXIT_CODE