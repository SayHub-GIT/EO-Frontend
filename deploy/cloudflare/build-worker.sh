#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

OPENNEXT_VERSION="1.20.6"
WRANGLER_VERSION="4.135.0"

log() {
  printf '\n\033[1;34m[cloudflare-build]\033[0m %s\n' "$*"
}

die() {
  printf '\n\033[1;31m[cloudflare-build:error]\033[0m %s\n' "$*" >&2
  exit 1
}

: "${NEXT_PUBLIC_API_URL:?NEXT_PUBLIC_API_URL is required}"

node - "${NEXT_PUBLIC_API_URL}" <<'NODE'
const value = process.argv[2]?.trim().replace(/\/$/, '')
let parsed

try {
  parsed = new URL(value)
} catch {
  process.stderr.write('NEXT_PUBLIC_API_URL must be an absolute URL.\n')
  process.exit(1)
}

if (parsed.protocol !== 'https:') {
  process.stderr.write('NEXT_PUBLIC_API_URL must use HTTPS.\n')
  process.exit(1)
}

if (!parsed.pathname.endsWith('/api')) {
  process.stderr.write('NEXT_PUBLIC_API_URL must end in /api.\n')
  process.exit(1)
}
NODE

if [[ -n "${WORKERS_CI_COMMIT_SHA:-}" ]]; then
  export NEXT_PUBLIC_RELEASE_COMMIT_SHA="${WORKERS_CI_COMMIT_SHA}"
elif [[ -z "${NEXT_PUBLIC_RELEASE_COMMIT_SHA:-}" ]] && command -v git >/dev/null 2>&1; then
  export NEXT_PUBLIC_RELEASE_COMMIT_SHA="$(git rev-parse HEAD 2>/dev/null || printf unknown)"
fi

log "Restoring application dependencies from the committed lockfile."
npm ci --no-audit --no-fund

log "Installing pinned Cloudflare build tooling without changing package-lock.json."
npm install --no-save --package-lock=false   "@opennextjs/cloudflare@${OPENNEXT_VERSION}"   "wrangler@${WRANGLER_VERSION}"

log "Building Next.js for Cloudflare Workers via OpenNext."
npx opennextjs-cloudflare build

[[ -f ".open-next/worker.js" ]] || die "OpenNext worker output was not created."
[[ -d ".open-next/assets" ]] || die "OpenNext assets output was not created."

log "Worker build completed."
