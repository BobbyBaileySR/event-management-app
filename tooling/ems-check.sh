#!/usr/bin/env bash
# Run the same checks as Frontend CI (lint, test, production build).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Frontend check (lint → test → build)"
npm run lint
npm test
npm run build
echo "==> Frontend check passed"
