#!/usr/bin/env bash
# Run Backend + Frontend checks (sibling folders under Events Management App).
set -euo pipefail

FRONTEND_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE_ROOT="$(cd "$FRONTEND_ROOT/.." && pwd)"
BACKEND_CHECK="$WORKSPACE_ROOT/Backend/node/tooling/ems-check.sh"

if [[ ! -x "$BACKEND_CHECK" ]]; then
	echo "Backend check script not found: $BACKEND_CHECK" >&2
	exit 1
fi

echo "==> Checking Backend"
"$BACKEND_CHECK"
echo ""
echo "==> Checking Frontend"
"$FRONTEND_ROOT/tooling/ems-check.sh"
echo ""
echo "==> Both repos passed"
