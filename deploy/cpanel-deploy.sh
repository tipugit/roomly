#!/bin/bash
# cPanel Git deployment — copies built dist/ to $DEPLOYPATH
set -euo pipefail

if [ -z "${DEPLOYPATH:-}" ]; then
  echo "ERROR: DEPLOYPATH is not set. Configure deployment path in cPanel Git Version Control."
  exit 1
fi

echo "Deploying Roomly to: $DEPLOYPATH"

# Keep live database credentials
CONFIG_BACKUP=""
if [ -f "$DEPLOYPATH/api/config.php" ]; then
  CONFIG_BACKUP="$(mktemp)"
  cp "$DEPLOYPATH/api/config.php" "$CONFIG_BACKUP"
  echo "Backed up existing api/config.php"
fi

# Prefer pre-built dist/ committed by GitHub Actions
if [ ! -f "dist/index.html" ]; then
  echo "dist/ not found — building on server (requires Node.js)..."
  if ! command -v npm >/dev/null 2>&1; then
    echo "ERROR: dist/ is missing and npm is not available."
    echo "Pull latest from GitHub (includes built dist/) or enable Node.js in cPanel."
    exit 1
  fi
  npm install
  npm run build
fi

mkdir -p "$DEPLOYPATH"
cp -R dist/. "$DEPLOYPATH/"

if [ -n "$CONFIG_BACKUP" ] && [ -f "$CONFIG_BACKUP" ]; then
  mkdir -p "$DEPLOYPATH/api"
  cp "$CONFIG_BACKUP" "$DEPLOYPATH/api/config.php"
  rm -f "$CONFIG_BACKUP"
  echo "Restored api/config.php"
elif [ ! -f "$DEPLOYPATH/api/config.php" ] && [ -f "$DEPLOYPATH/api/config.example.php" ]; then
  cp "$DEPLOYPATH/api/config.example.php" "$DEPLOYPATH/api/config.php"
  echo "Created api/config.php from example — edit it with your database credentials."
fi

echo "Roomly deployed successfully."
