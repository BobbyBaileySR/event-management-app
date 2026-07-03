#!/usr/bin/env bash
# Faster loop while coding — skips production build.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Frontend quick check (lint → test)"
npm run lint
npm test
echo "==> Frontend quick check passed"
