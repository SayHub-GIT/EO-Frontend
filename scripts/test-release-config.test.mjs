import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

import { validateReleaseConfig } from './validate-release-config.mjs'

const good = {
  NEXT_PUBLIC_API_URL: 'https://api.events.example.id/api',
  NEXT_PUBLIC_APP_URL: 'https://events.example.id',
  CF_ACCESS_CLIENT_ID: 'id-value',
  CF_ACCESS_CLIENT_SECRET: 'private-value'
}

test('valid public HTTPS FE/BE origins and paired server-side Access credentials pass', () => {
  assert.deepEqual(validateReleaseConfig(good), [])
  assert.deepEqual(validateReleaseConfig({
    ...good,
    NEXT_PUBLIC_API_URL: 'https://api.events.example.id/api/',
    NEXT_PUBLIC_APP_URL: 'https://events.example.id/'
  }), [])
  assert.deepEqual(validateReleaseConfig({
    NEXT_PUBLIC_API_URL: good.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: good.NEXT_PUBLIC_APP_URL
  }), [])
})

test('CI placeholder cannot be released even though it builds', () => {
  assert.match(validateReleaseConfig({
    ...good,
    NEXT_PUBLIC_API_URL: 'https://api.example.invalid/api'
  }).join(' '), /domain contoh/)
  for (const hostname of ['localhost', '127.0.0.1', '192.168.1.5', '10.0.0.8', 'example.com', 'service.test']) {
    assert.ok(validateReleaseConfig({ ...good, NEXT_PUBLIC_API_URL: `https://${hostname}/api` }).length, hostname)
  }
})

test('invalid API URLs and FE origins are denied', () => {
  for (const [key, value] of [
    ['NEXT_PUBLIC_API_URL', ''],
    ['NEXT_PUBLIC_API_URL', 'not-a-url'],
    ['NEXT_PUBLIC_API_URL', 'http://api.events.example.id/api'],
    ['NEXT_PUBLIC_API_URL', 'https://api.events.example.id'],
    ['NEXT_PUBLIC_API_URL', 'https://api.events.example.id/api/v2'],
    ['NEXT_PUBLIC_API_URL', 'https://me:secret@api.events.example.id/api'],
    ['NEXT_PUBLIC_API_URL', 'https://api.events.example.id/api?key=secret'],
    ['NEXT_PUBLIC_APP_URL', ''],
    ['NEXT_PUBLIC_APP_URL', 'http://events.example.id'],
    ['NEXT_PUBLIC_APP_URL', 'https://events.example.id/admin'],
    ['NEXT_PUBLIC_APP_URL', 'https://events.example.id/#token']
  ]) {
    assert.ok(validateReleaseConfig({ ...good, [key]: value }).length, `${key}=${value}`)
  }
})

test('incomplete Cloudflare Access service-token configuration fails without exposing secret values', () => {
  const errors = validateReleaseConfig({ ...good, CF_ACCESS_CLIENT_ID: '' })
  assert.match(errors.join(' '), /bersama/)
  assert.doesNotMatch(errors.join(' '), /private-value/)
  assert.ok(validateReleaseConfig({ ...good, CF_ACCESS_CLIENT_SECRET: '' }).length)
})

test('server secrets cannot be accidentally marked as NEXT_PUBLIC', () => {
  const errors = validateReleaseConfig({ ...good, NEXT_PUBLIC_CF_ACCESS_CLIENT_SECRET: 'do-not-expose-me' })
  assert.match(errors.join(' '), /NEXT_PUBLIC_CF_ACCESS_CLIENT_SECRET/)
  assert.doesNotMatch(errors.join(' '), /do-not-expose-me/)
})

test('CLI fails safely, prints field names only, and does not expose provided secrets', () => {
  const result = spawnSync(process.execPath, ['scripts/validate-release-config.mjs'], {
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: 'https://api.example.invalid/api?secret=hidden-value',
      NEXT_PUBLIC_APP_URL: good.NEXT_PUBLIC_APP_URL,
      CF_ACCESS_CLIENT_ID: 'test-id',
      CF_ACCESS_CLIENT_SECRET: 'do-not-log-me'
    },
    encoding: 'utf8'
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Release preflight gagal/)
  assert.doesNotMatch(result.stderr, /do-not-log-me|hidden-value/)
})

test('deploy command runs strict preflight BEFORE build or Cloudflare deploy', () => {
  const script = readFileSync('deploy/cloudflare/deploy-worker.sh', 'utf8')
  const validateAt = script.indexOf('node scripts/validate-release-config.mjs')
  const buildAt = script.indexOf('bash deploy/cloudflare/build-worker.sh')
  const deployAt = script.indexOf('npx opennextjs-cloudflare deploy')
  assert.ok(validateAt >= 0 && buildAt > validateAt && deployAt > buildAt)
})

test('release preflight tests are required by Linux and Cloudflare CI', () => {
  const linux = readFileSync('.github/workflows/build.yml', 'utf8')
  const cloudflare = readFileSync('.github/workflows/cloudflare-compat.yml', 'utf8')
  assert.match(linux, /node --test scripts\/test-release-config\.test\.mjs/)
  assert.match(cloudflare, /node --test scripts\/test-release-config\.test\.mjs/)
})
