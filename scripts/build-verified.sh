#!/usr/bin/env bash
# Simplified build script — no longer requires Linux-only GNU timeout or flock.
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node_modules/.bin/vinext build
