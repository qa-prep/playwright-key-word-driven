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
if [ -f "playwright.config.ts" ]; then
  echo "-> playwright.config.ts already exists, skipping 'npm init playwright@latest'"
else
  echo "-> Running npm init playwright@latest"
  npm init playwright@latest
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

# ---------------------------------------------------------------------------
# 4. Make run script executable
# ---------------------------------------------------------------------------
if [ -f "run-tests.sh" ]; then
  chmod +x run-tests.sh
  echo "-> run-tests.sh made executable"
fi

echo ""
echo "== Install complete =="