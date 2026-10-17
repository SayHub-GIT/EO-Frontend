#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

printf '\n[cloudflare-deploy] Checking release environment...\n'
node scripts/validate-release-config.mjs

bash deploy/cloudflare/build-worker.sh

printf '\n\033[1;34m[cloudflare-deploy]\033[0m Deploying Worker...\n'
npx opennextjs-cloudflare deploy
