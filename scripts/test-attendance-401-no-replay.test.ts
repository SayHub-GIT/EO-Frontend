import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { sendWithUnauthorizedReplayPolicy } from '../src/lib/auth-request-replay'
import { checkInQrWithPhoto } from '../src/lib/qr-photo-check-in'

const eventId = 'b159db3a-8c08-4ed6-a2c1-7d3914749747'
const participant = {
  eventId,
  registrationId: 'a419c1cc-649f-49ef-96c7-51ac5801afe3',
  bookingCode: 'QR-EXAMPLE'
}
const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' })

test('a non-replayable attendance mutation returns 401 after one HTTP request', async () => {
  let sends = 0
  let refreshes = 0
  const response = await sendWithUnauthorizedReplayPolicy(
    async () => { sends++; return new Response(null, { status: 401 }) },
    async () => { refreshes++ },
    false
  )
  assert.equal(response.status, 401)
  assert.equal(sends, 1)
  assert.equal(refreshes, 0)
})

test('existing retryable read flows still refresh once and retry once on 401', async () => {
  let sends = 0
  let refreshes = 0
  const response = await sendWithUnauthorizedReplayPolicy(
    async () => new Response(null, { status: ++sends === 1 ? 401 : 200 }),
    async () => { refreshes++ },
    true
  )
  assert.equal(response.status, 200)
  assert.equal(sends, 2)
  assert.equal(refreshes, 1)
})

test('repeated unauthorized response never triggers a third send', async () => {
  let sends = 0
  const result = await sendWithUnauthorizedReplayPolicy(
    async () => { sends++; return new Response(null, { status: 401 }) },
    async () => undefined,
    true
  )
  assert.equal(result.status, 401)
  assert.equal(sends, 2)
})

test('successful or 5xx responses are never automatically replayed', async () => {
  for (const status of [200, 409, 503]) {
    let sends = 0
    let refreshes = 0
    const result = await sendWithUnauthorizedReplayPolicy(
      async () => { sends++; return new Response(null, { status }) },
      async () => { refreshes++ },
      true
    )
    assert.equal(result.status, status)
    assert.equal(sends, 1)
    assert.equal(refreshes, 0)
  }
})

test('network failure and refresh failure do not silently replay', async () => {
  let sends = 0
  await assert.rejects(sendWithUnauthorizedReplayPolicy(
    async () => { sends++; throw new Error('connection lost') },
    async () => undefined,
    false
  ), /connection lost/)
  assert.equal(sends, 1)

  sends = 0
  await assert.rejects(sendWithUnauthorizedReplayPolicy(
    async () => { sends++; return new Response(null, { status: 401 }) },
    async () => { throw new Error('refresh failed') },
    true
  ), /refresh failed/)
  assert.equal(sends, 1)
})

test('QR-with-photo submits multipart once and explicitly opts out of unauthorized replay', async () => {
  let sends = 0
  await assert.rejects(checkInQrWithPhoto('qr-token', participant, jpeg, true,
    async (path, options, policy) => {
      sends++
      assert.equal(path, '/check-ins/qr-with-photo')
      assert.equal(options?.method, 'POST')
      assert.ok(options?.body instanceof FormData)
      assert.deepEqual(policy, { retryOn401: false })
      return new Response(JSON.stringify({ detail: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      })
    }), /Unauthorized/)
  assert.equal(sends, 1)
})

test('all attendance mutation paths opt out; read-only QR preview keeps normal retry policy', () => {
  const client = readFileSync('src/lib/check-ins.ts', 'utf8')
  const qr = readFileSync('src/lib/qr-photo-check-in.ts', 'utf8')
  const auth = readFileSync('src/lib/auth.ts', 'utf8')

  assert.match(auth, /policy\.retryOn401 !== false/)
  assert.match(auth, /sendWithUnauthorizedReplayPolicy\(request,/)
  assert.match(qr, /sendRequest\('\/check-ins\/qr-with-photo', \{[\s\S]*?\}, \{ retryOn401: false \}\)/)

  for (const route of [
    /authFetch\('\/check-ins', \{[\s\S]*?\}, \{ retryOn401: false \}\)/,
    /authFetch\('\/check-ins\/manual', \{[\s\S]*?\}, \{ retryOn401: false \}\)/,
    /authFetch\(\x60\/check-ins\/\$\{encodeURIComponent\(registrationId\)\}\/checkout\x60, \{[\s\S]*?\}, \{ retryOn401: false \}\)/,
    /authFetch\(\x60\/check-ins\/\$\{encodeURIComponent\(registrationId\)\}\/photo\x60, \{[\s\S]*?\}, \{ retryOn401: false \}\)/
  ]) assert.match(client, route)

  assert.match(client, /authFetch\('\/check-ins\/preview', \{/)
  assert.doesNotMatch(qr, /localStorage|sessionStorage/)
})

test('the QR screen still blocks new scans after an unconfirmed mutation', () => {
  const page = readFileSync('src/app/(dashboard)/admin/check-ins/page.tsx', 'utf8')
  assert.match(page, /setQrAttemptBlocked\(true\)/)
  assert.match(page, /qrAttemptBlocked \|\| !eventId/)
  assert.match(page, /Periksa status kehadiran sebelum memindai atau mengirim ulang/)
})
