/**
 * Recover Chart.js when a freshly pulled frontend still has stale node_modules.
 * The project's npm lockfile remains the single source of dependency versions.
 */
import { readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const expectedVersion = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  .dependencies['chart.js']

function chartIsInstalled() {
  try {
    const installed = JSON.parse(readFileSync(resolve(root, 'node_modules/chart.js/package.json'), 'utf8'))
    require.resolve('chart.js/auto')
    return installed.version === expectedVersion
  } catch {
    return false
  }
}

if (!expectedVersion) {
  console.error('[dependencies] chart.js is missing from package.json.')
  process.exit(1)
}

if (!chartIsInstalled()) {
  console.log('[dependencies] Chart.js is missing or outdated. Restoring all packages from package-lock.json with npm ci...')

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npm, ['ci', '--no-audit', '--no-fund'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })

  if (result.error || result.status !== 0) {
    console.error('[dependencies] npm ci failed. Close other dev servers and run npm ci manually.')
    if (result.error) console.error(result.error.message)
    process.exit(result.status || 1)
  }

  if (!chartIsInstalled()) {
    console.error('[dependencies] Chart.js could not be resolved after npm ci. Check your npm registry and package-lock.json.')
    process.exit(1)
  }

  // Invalidate the old Next.js cache only when dependencies actually changed.
  rmSync(resolve(root, '.next'), { recursive: true, force: true })
  console.log('[dependencies] Chart.js restored and stale Next.js build cache cleared.')
}
