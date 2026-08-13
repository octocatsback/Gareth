#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

SITE_DIR="$(find_gareth_site)"
echo "[install] Checking that secret-like files are not tracked..."
if git ls-files | grep -E '(^|/)\.env$|(^|/)\.env\.[^/]+$|\.pem$|(^|/)id_rsa$|(^|/)id_ed25519$|(^|/)id_ecdsa$'; then
  echo "[install] error: refusing to continue; secret-like files are tracked in git" >&2
  exit 1
fi
echo "[install] Installing Mona Astro site dependencies in ${SITE_DIR}"
npm ci --prefix "${SITE_DIR}"

SOCKET_PATH="${CURSOR_AGENT_SOCKET:-/run/cursor/api.sock}"
if [[ -S "${SOCKET_PATH}" ]]; then
  echo "[install] Checking Cloud Agent OIDC identity socket..."
  python3 "${SCRIPT_DIR}/oidc_token.py" --check
else
  echo "[install] Skipping OIDC check (no identity socket at ${SOCKET_PATH})"
fi

echo "[install] Done."
