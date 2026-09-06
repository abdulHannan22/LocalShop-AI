#!/usr/bin/env bash
# Legacy CI helper — no longer needed after migration to Neon Postgres.
# Kept as a passthrough so any external tooling that calls it still works.
set -euo pipefail
if [[ "${1:-}" == "--" ]]; then shift; fi
if [[ "$#" -eq 0 ]]; then
  echo "usage: scripts/sites-env.sh -- command [args...]" >&2
  exit 64
fi
exec "$@"
