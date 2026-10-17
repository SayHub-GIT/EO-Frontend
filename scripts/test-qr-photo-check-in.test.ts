import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  checkInQrWithPhoto,
  isConfirmedQrPhotoCheckIn,
  isValidQrFaceJpeg,
  QrPhotoCheckInConflictError,
  QrPhotoCheckInUncertainError
} from '../src/lib/qr-photo-check-in'

const participant = {
  registrationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  eventId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  bookingCode: 'QR-EXAMPLE'
}

const validResponse = {
  ...participant,
  fullName: 'Peserta',
  eventName: 'Demo event',
  eventPackageId: null,
  eventPackageName: null,
  checkedInAtUtc: '2026-10-17T04:00:00Z'
}

const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' })
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

test('accepts only a JPEG with correct boundaries and size', async () => {
  assert.equal(await isValidQrFaceJpeg(jpeg), true)
  assert.equal(await isValidQrFaceJpeg(new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' })), false)
  assert.equal(await isValidQrFaceJpeg(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/png' })), false)
  assert.equal(await isValidQrFaceJpeg(new Blob([], { type: 'image/jpeg' })), false)
})

test('confirms only the matching registration, event, booking and UTC timestamp', () => {
  assert.ok(isConfirmedQrPhotoCheckIn(validResponse, participant))
  assert.equal(isConfirmedQrPhotoCheckIn({ ...validResponse, registrationId: 'different' }, participant), false)
  assert.equal(isConfirmedQrPhotoCheckIn({ ...validResponse, eventId: 'other' }, participant), false)
  assert.equal(isConfirmedQrPhotoCheckIn({ ...validResponse, bookingCode: 'wrong' }, participant), false)
  assert.equal(isConfirmedQrPhotoCheckIn({ ...validResponse, checkedInAtUtc: 'invalid' }, participant), false)
  assert.equal(isConfirmedQrPhotoCheckIn(null, participant), false)
})

test('submits exactly one authorized multipart QR + JPEG + consent request', async () => {
  let calls = 0
  const result = await checkInQrWithPhoto('  private-token  ', participant, jpeg, true,
    async (path, init) => {
      calls += 1
      assert.equal(path, '/check-ins/qr-with-photo')
      assert.ok(init)
      assert.equal(init.method, 'POST')
      assert.equal(init.cache, 'no-store')
      assert.ok(init.body instanceof FormData)
      const form = init.body as FormData
      assert.equal(form.get('qrToken'), 'private-token')
      assert.equal(form.get('consentConfirmed'), 'true')
      const image = form.get('file')
      assert.ok(image instanceof Blob)
      assert.equal(image.type, 'image/jpeg')
      assert.equal(image.size, jpeg.size)
      assert.equal(new Headers(init.headers).has('Content-Type'), false)
      return json(validResponse)
    })
  assert.equal(calls, 1)
  assert.equal(result.registrationId, participant.registrationId)
})

test('missing consent, QR, or valid face blocks all network requests', async () => {
  let calls = 0
  const fake = async () => { calls += 1; return json(validResponse) }
  await assert.rejects(checkInQrWithPhoto('', participant, jpeg, true, fake), /QR/)
  await assert.rejects(checkInQrWithPhoto('token', participant, jpeg, false, fake), /Persetujuan/)
  await assert.rejects(checkInQrWithPhoto('token', participant, new Blob([], { type: 'image/jpeg' }), true, fake), /Foto/)
  assert.equal(calls, 0)
})

test('HTTP 409 is a conflict and never interpreted as Check-In success', async () => {
  await assert.rejects(
    checkInQrWithPhoto('token', participant, jpeg, true, async () => json({ detail: 'Conflict' }, 409)),
    QrPhotoCheckInConflictError
  )
})

test('network failures and 5xx have an uncertain outcome, not automatic replay', async () => {
  let calls = 0
  await assert.rejects(checkInQrWithPhoto('token', participant, jpeg, true, async () => {
    calls += 1
    throw new Error('network dropped')
  }), QrPhotoCheckInUncertainError)
  assert.equal(calls, 1)
  await assert.rejects(
    checkInQrWithPhoto('token', participant, jpeg, true, async () => json({ detail: 'unavailable' }, 503)),
    QrPhotoCheckInUncertainError
  )
})

test('malformed successful responses remain uncertain until operator verifies server status', async () => {
  await assert.rejects(
    checkInQrWithPhoto('token', participant, jpeg, true, async () => json({ ...validResponse, eventId: 'wrong' })),
    QrPhotoCheckInUncertainError
  )
  await assert.rejects(
    checkInQrWithPhoto('token', participant, jpeg, true,
      async () => new Response('not JSON', { status: 200 })),
    QrPhotoCheckInUncertainError
  )
})

test('production QR screen contains no legacy QR commit or photo-after-checkin path', () => {
  const page = readFileSync('src/app/(dashboard)/admin/check-ins/page.tsx', 'utf8')
  const client = readFileSync('src/lib/qr-photo-check-in.ts', 'utf8')
  assert.match(page, /<QrFaceCapture/)
  assert.match(page, /checkInQrWithPhoto\(preview\.token, preview\.participant, photo\.jpeg, photoConsent\)/)
  assert.match(page, /qrPhoto\.registrationId !== preview\.participant\.registrationId/)
  assert.match(page, /qrAttemptBlocked/)
  assert.match(page, /!photoConsent \|\| !checkInAccess\.allowed/)
  assert.match(page, /!qrPhoto \|\| qrPhoto\.eventId/)
  assert.match(page, /publishAttendanceChange\(response\.eventId\)/)
  assert.doesNotMatch(page, /checkInParticipant\(|uploadCheckInPhoto\(|submitToken\(|photoVideoRef|photoStatus/)
  assert.match(client, /\/check-ins\/qr-with-photo/)
  assert.doesNotMatch(client, /\/check-ins'|localStorage|sessionStorage/)
})
