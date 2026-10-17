import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  MAX_PRIVATE_ATTENDANCE_PHOTO_BYTES,
  readPrivateAttendanceJpeg
} from '../src/lib/private-attendance-photo-contract'

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
const response = (body: Uint8Array | null, type = 'image/jpeg', length?: string) =>
  new Response(body, {
    headers: {
      'content-type': type,
      ...(length === undefined ? {} : { 'content-length': length })
    }
  })

test('accepts a bounded JPEG and returns a private Blob without an external URL', async () => {
  const blob = await readPrivateAttendanceJpeg(response(jpeg, 'image/jpeg; charset=binary'))
  assert.equal(blob.type, 'image/jpeg')
  assert.equal(blob.size, 4)
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), jpeg)
})

test('rejects non-JPEG content even when the response is otherwise successful', async () => {
  await assert.rejects(readPrivateAttendanceJpeg(response(jpeg, 'text/html')))
  await assert.rejects(readPrivateAttendanceJpeg(response(jpeg, 'image/png')))
})

test('rejects forged JPEG mime and empty response body', async () => {
  await assert.rejects(readPrivateAttendanceJpeg(response(new Uint8Array([1, 2, 3, 4]))))
  await assert.rejects(readPrivateAttendanceJpeg(response(null)))
  await assert.rejects(readPrivateAttendanceJpeg(response(new Uint8Array([0xff, 0xd8, 1, 2]))))
})

test('rejects too large declared Content-Length before reading the payload', async () => {
  await assert.rejects(readPrivateAttendanceJpeg(response(jpeg, 'image/jpeg', String(MAX_PRIVATE_ATTENDANCE_PHOTO_BYTES + 1))))
  await assert.rejects(readPrivateAttendanceJpeg(response(jpeg, 'image/jpeg', 'invalid')))
})

test('enforces the 400 KiB limit even when Content-Length is absent or dishonest', async () => {
  const huge = new Uint8Array(MAX_PRIVATE_ATTENDANCE_PHOTO_BYTES + 1)
  huge[0] = 0xff
  huge[1] = 0xd8
  huge[huge.length - 2] = 0xff
  huge[huge.length - 1] = 0xd9
  await assert.rejects(readPrivateAttendanceJpeg(response(huge)))
  await assert.rejects(readPrivateAttendanceJpeg(response(huge, 'image/jpeg', '4')))
})

test('private photo is read only on demand and scoped to attendance.read', () => {
  const page = readFileSync('src/app/(dashboard)/admin/events/[eventSlug]/attendance/page.tsx', 'utf8')
  const dialog = readFileSync('src/components/attendance/PrivateAttendancePhotoDialog.tsx', 'utf8')
  const client = readFileSync('src/lib/private-attendance-photo.ts', 'utf8')

  assert.match(page, /usePermissionAccess\('attendance\.read'\)/)
  assert.match(page, /row\.checkedInAtUtc \? \(/)
  assert.match(page, /Foto belum tersedia/)
  assert.match(page, /aria-label=\{attendancePhotoActionLabel\(row\.fullName\)\}/)
  assert.match(page, /photoTarget\.eventId\.toLowerCase\(\) === eventId\.toLowerCase\(\)/)
  assert.match(dialog, /controller\.abort\(\)/)
  assert.match(dialog, /URL\.revokeObjectURL\(objectUrl\)/)
  assert.match(dialog, /URL\.createObjectURL\(blob\)/)
  assert.match(client, /authFetch\(/)
  assert.match(client, /\/check-ins\/\$\{encodeURIComponent\(registrationId\)\}\/photo/)
  assert.match(client, /response\.status === 403/)
  assert.match(client, /response\.status === 404/)
  assert.doesNotMatch(page + dialog + client, /localStorage|sessionStorage|window\.open\(/)
})
