#!/usr/bin/env bash
# Pre-push ritual: run checks, show git status, optionally commit and push.
#
# Usage:
#   ./tooling/ems-ship.sh              # check + status + next-step hints
#   ./tooling/ems-ship.sh --quick      # lint + test only (no build)
#   ./tooling/ems-ship.sh --commit "message"
#   ./tooling/ems-ship.sh --commit "message" --push
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

QUICK=false
COMMIT_MSG=""
DO_PUSH=false

while [[ $# -gt 0 ]]; do
	case "$1" in
		--quick) QUICK=true; shift ;;
		--commit)
			COMMIT_MSG="${2:-}"
			shift 2
			;;
		--push) DO_PUSH=true; shift ;;
		-h | --help)
			echo "Usage: $0 [--quick] [--commit \"message\"] [--push]"
			exit 0
			;;
		*) echo "Unknown option: $1" >&2; exit 1 ;;
	esac
done

if [[ "$QUICK" == true ]]; then
	"$(dirname "$0")/ems-quick.sh"
else
	"$(dirname "$0")/ems-check.sh"
fi

echo ""
echo "==> Git status"
git status -sb

if [[ -n "$COMMIT_MSG" ]]; then
	if [[ -z "$(git status --porcelain)" ]]; then
		echo "Nothing to commit."
		exit 0
	fi
	git add -A
	git commit -m "$COMMIT_MSG"
	echo "==> Committed: $COMMIT_MSG"
fi

if [[ "$DO_PUSH" == true ]]; then
	if [[ -z "$COMMIT_MSG" ]]; then
		echo "--push requires --commit" >&2
		exit 1
	fi
	git push
	echo "==> Pushed. Check GitHub Actions for CI, then confirm GitHub Pages deploy."
else
	echo ""
	echo "Next steps (manual):"
	echo "  git add <paths>          # or: git add -A"
	echo "  git commit -m \"your message\""
	echo "  git push"
	echo ""
	echo "Or re-run with: $0 --commit \"your message\" --push"
fi
