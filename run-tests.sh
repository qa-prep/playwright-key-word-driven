#!/usr/bin/env bash

#usage: ./run-tests.sh tests-type=feature project=myProjectA tags=@register report=on-failure debug-mode=all
# we are not yet getting logs

set -euo pipefail

TESTS_TYPE="all"
TAGS=""
PROJECT="default"

# never is build but don't open the report; on-failure is build and open only if there are failures; always is build and open regardless of pass/fail
# none dont create a file at all
# on-failure is build and open only if there are failures
# always is build and open regardless of pass/fail 
REPORT_MODE="always"

DEBUG_MODE="off"

for arg in "$@"; do
  key="${arg%%=*}"
  value="${arg#*=}"
  case "$key" in
    tests-type) TESTS_TYPE="$value" ;;
    tags) TAGS="$value" ;;
    project) PROJECT="$value" ;;
    report) REPORT_MODE="$value" ;;
    debug-mode) DEBUG_MODE="$value" ;;
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

# normalise "@register, @login" -> "@register,@login" (strip spaces)
TAGS_CLEAN=$(echo "$TAGS" | tr -d ' ')

REPORT_DATE="$(date +%Y-%m-%d)"
REPORT_TIME="$(date +%H%M%S)"
REPORT_BASE="playwright-report/${PROJECT}/${REPORT_DATE}/${REPORT_TIME}"

export REPORT_OPEN="$REPORT_MODE"

run_spec() {
  mkdir -p "${REPORT_BASE}/spec"
  export REPORT_DIR="${REPORT_BASE}/spec"
  local args=(test --project=spec-chromium)
  if [ -n "$TAGS_CLEAN" ]; then
    args+=("--grep=$(echo "$TAGS_CLEAN" | tr ',' '|')")
  fi
  npx playwright "${args[@]}"
}

run_feature() {
  mkdir -p "${REPORT_BASE}/feature"
  export REPORT_DIR="${REPORT_BASE}/feature"
  local bddgen_args=()
  if [ -n "$TAGS_CLEAN" ]; then
    bddgen_args+=("--tags=$(echo "$TAGS_CLEAN" | sed 's/,/ or /g')")
  fi
  npx bddgen "${bddgen_args[@]}"
  npx playwright test --project="feature-${PROJECT}"
}

case "$TESTS_TYPE" in
  spec) run_spec ;;
  feature) run_feature ;;
  all) run_spec; run_feature ;;
  *) echo "tests-type must be spec, feature, or all" >&2; exit 1 ;;
esac

if [ "$REPORT_MODE" != "none" ]; then
  echo "Report(s) written under: ${REPORT_BASE}"
fi