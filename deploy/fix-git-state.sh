#!/bin/bash
# Run in cPanel Terminal from your repository folder when deploy says
# "uncommitted changes exist on the checked-out branch".
#
# Usage:  cd ~/roomly && bash deploy/fix-git-state.sh
set -euo pipefail

echo "Fetching latest from origin..."
git fetch origin main

echo "Resetting tracked files to match GitHub (keeps untracked files like config.php)..."
git reset --hard origin/main

echo "Done. Working tree:"
git status

echo ""
echo "Now in cPanel: Git Version Control -> Manage -> Deploy HEAD Commit"
