# location: /installer/install.sh
#!/usr/bin/env bash

set -euo pipefail

# Run from repo root, regardless of where it's invoked from
cd "$(dirname "$0")/.."

CANONICAL_DIR="installer/canonical"

echo "== Playwright keyword-driven framework installer =="

# ---------------------------------------------------------------------------
# 1. Base Playwright project
# ---------------------------------------------------------------------------
FIRST_TIME_INSTALLED=false
if [ -f "playwright.config.ts" ]; then
  echo "-> playwright.config.ts already exists, skipping 'npm init playwright@latest'"
else
  echo "-> Running npm init playwright@latest"
  TMP_WORKFLOW=""
  if [ -f ".github/workflows/playwright.yml" ]; then
    TMP_WORKFLOW="$(mktemp)"
    mv .github/workflows/playwright.yml "$TMP_WORKFLOW"
  fi
  npm init playwright@latest -- --quiet
  if [ -n "$TMP_WORKFLOW" ]; then
    mkdir -p .github/workflows
    rm -f .github/workflows/playwright.yml
    mv "$TMP_WORKFLOW" .github/workflows/playwright.yml
  fi
  FIRST_TIME_INSTALLED=true
fi
# ---------------------------------------------------------------------------
# 2. Apply canonical playwright.config.ts (only warn/prompt if it would
#    actually overwrite something different)
# ---------------------------------------------------------------------------
if [ -f "$CANONICAL_DIR/playwright.config.ts.bak" ]; then
  if [ ! -f "playwright.config.ts" ]; then
    echo "-> Copying framework's playwright.config.ts into place"
    cp "$CANONICAL_DIR/playwright.config.ts.bak" playwright.config.ts

  elif diff -q "$CANONICAL_DIR/playwright.config.ts.bak" playwright.config.ts >/dev/null 2>&1; then
    echo "-> playwright.config.ts already matches canonical version, skipping"

  elif [ "$FIRST_TIME_INSTALLED" = true ]; then
    echo "-> Replacing npm init's generic scaffold with framework's playwright.config.ts"
    cp "$CANONICAL_DIR/playwright.config.ts.bak" playwright.config.ts

  else
    echo ""
    echo "WARNING: playwright.config.ts exists and differs from the framework's"
    echo "canonical version. Continuing will overwrite it and your local changes"
    echo "will be LOST (this script does not back it up for you)."
    echo ""
    read -p "Overwrite playwright.config.ts? [y/N] " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      cp "$CANONICAL_DIR/playwright.config.ts.bak" playwright.config.ts
      echo "-> playwright.config.ts overwritten"
    else
      echo "-> Skipped — keeping your existing playwright.config.ts"
    fi
  fi
else
  echo "!! No canonical playwright.config.ts found in $CANONICAL_DIR — nothing to apply"
fi

# ---------------------------------------------------------------------------
# 2.5. Lay down config/default-settings.config from canonical, but only if the
#      user doesn't already have one. Unlike playwright.config.ts above,
#      there's no overwrite prompt here: this file is meant to be edited
#      freely per-repo, and a developer's personal overrides belong in
#      config/default-settings.config exists we never touch it again.
# ---------------------------------------------------------------------------
if [ -f "$CANONICAL_DIR/default-settings.config" ]; then
  if [ -f "config/default-settings.config" ]; then
    echo "-> config/default-settings.config already exists, skipping"
  else
    echo "-> Copying framework's config/default-settings.config into place"
    mkdir -p config
    cp "$CANONICAL_DIR/default-settings.config" config/default-settings.config
  fi
else
  echo "!! No canonical default-settings.config found in $CANONICAL_DIR — nothing to apply"
fi


# ---------------------------------------------------------------------------
# 2.6. Lay down config/local.env from canonical, same rule as the settings
#      file above: only if the user doesn't already have one, never touched
#      again after that. This holds secrets/machine-specific values (DB
#      creds, Slack token), so unlike default-settings.config it should
#      already be gitignored — the user edits their own copy freely and it's
#      never at risk of being overwritten by a later install run.
# ---------------------------------------------------------------------------
if [ -f "$CANONICAL_DIR/local.env" ]; then
  if [ -f "config/local.env" ]; then
    echo "-> config/local.env already exists, skipping"
  else
    echo "-> Copying framework's config/local.env template into place"
    mkdir -p config
    cp "$CANONICAL_DIR/local.env" config/local.env
    echo "-> Edit config/local.env with your own DB credentials and (optionally) Slack details"
  fi
else
  echo "!! No canonical local.env found in $CANONICAL_DIR — nothing to apply"
fi

# ---------------------------------------------------------------------------
# 2.7. Lay down config/slack-users.json from canonical, same rule as the
#      other config files: only if missing, never touched again. This is
#      entirely optional — if it's absent, Slack notifications still work,
#      just without @name -> Slack ID mention resolution.
# ---------------------------------------------------------------------------
if [ -f "$CANONICAL_DIR/slack-users.json" ]; then
  if [ -f "config/slack-users.json" ]; then
    echo "-> config/slack-users.json already exists, skipping"
  else
    echo "-> Copying framework's config/slack-users.json template into place"
    mkdir -p config
    cp "$CANONICAL_DIR/slack-users.json" config/slack-users.json
  fi
else
  echo "!! No canonical slack-users.json found in $CANONICAL_DIR — nothing to apply"
fi

# ---------------------------------------------------------------------------
# 3. Core dependencies
# ---------------------------------------------------------------------------
install_if_missing() {
  local pkg="$1"
  local dev_flag="${2:-}"
  if npm list "$pkg" --depth=0 >/dev/null 2>&1; then
    echo "-> $pkg already installed, skipping"
  else
    echo "-> Installing $pkg"
    if [ "$dev_flag" = "dev" ]; then
      npm install -D "$pkg"
    else
      npm install "$pkg"
    fi
  fi
}

install_if_missing dotenv
install_if_missing mysql2
install_if_missing playwright-bdd dev
install_if_missing @cucumber/cucumber dev
install_if_missing @types/node dev

# ---------------------------------------------------------------------------
# 4. Make run script executable
# ---------------------------------------------------------------------------
if [ -f "run-tests.sh" ]; then
  chmod +x run-tests.sh
  echo "-> run-tests.sh made executable"
fi

echo ""
echo "== Install complete =="




# ---------------------------------------------------------------------------
# 5. Done
# ---------------------------------------------------------------------------
echo ""
GREEN='\033[0;32m'
NC='\033[0m'
echo ""
echo "-> ${GREEN}================================================================${NC}"
echo "-> ${GREEN}  Install complete! Run your first key word driven test:${NC}"
echo "-> ${GREEN}================================================================${NC}"
echo "-> ${GREEN}  ./run-tests.sh tests-type=feature project=myProjectA tags=@register debug-mode=all${NC}"
echo "-> ${GREEN}================================================================${NC}"
echo ""
echo "-> ${GREEN}  Watch tutorials and learn how to use this framework at qa-prep.com${NC}"
echo "-> ${GREEN}================================================================${NC}"
echo "" 
echo "-> examples :"
echo "->   ./run-tests.sh project=myProjectA tags=@keywordTest"
echo "->   ./run-tests.sh tests-type=feature project=myProjectA tags=@keywordTest headed=true"
echo "->   ./run-tests.sh tests-type=feature project=myProjectA tags=@keywordTest debug-mode=all headed=true speed=slow"
echo ""