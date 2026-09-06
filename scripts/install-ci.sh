#!/usr/bin/env bash
# Simplified install script — no longer requires Linux-only flock or sha256sum.
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
npm ci
