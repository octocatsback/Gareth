#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

SITE_DIR="$(find_gareth_site)"
echo "[install] Installing Mona Astro site dependencies in ${SITE_DIR}"
npm ci --prefix "${SITE_DIR}"
echo "[install] Done."
