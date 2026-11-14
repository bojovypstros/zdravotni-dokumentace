#!/usr/bin/env bash
# Pull latest main into the deploy working tree on combat-server.
set -euo pipefail
DEPLOY_DIR="${DEPLOY_DIR:-/var/webserver/health.combatostrich.dev}"
cd "$DEPLOY_DIR"
git fetch origin main
git checkout main
git pull --ff-only origin main
echo "Updated to $(git rev-parse --short HEAD) ($(git log -1 --pretty=%s))"
