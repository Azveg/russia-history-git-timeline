#!/usr/bin/env bash
set -euo pipefail

lock_backup=$(mktemp "${TMPDIR:-/tmp}/chronograph-lock.XXXXXX")
cp package-lock.json "$lock_backup"

# Restore the checkout before the handoff check, including on install or audit failure.
trap 'cp "$lock_backup" package-lock.json && rm -f "$lock_backup"' EXIT

npm run sync:lock-integrity
npm run sync:lock-integrity -- --check
npm ci
npm audit --audit-level=high
