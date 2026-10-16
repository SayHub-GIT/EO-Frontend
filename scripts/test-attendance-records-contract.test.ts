import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAttendanceRecordsQuery,
  normalizeAttendanceRecordsPage
} from '../src/lib/attendance-records-contract'

const eventId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const row = {
  registrationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  eventId,
  bookingCode: 'EO-001',
  fullName: 'Peserta Uji',
  email: 'peserta@example.invalid',
  participantType: 1,
  eventPackageId: null,
  eventPackageName: null,
  registrationStatus: 3,
  attendanceStatus: 'CHECK IN',
  checkInMethod: 1,
  registeredAtUtc: '2026-10-16T03:00:00Z',
  checkedInAtUtc: '2026-10-16T04:00:00Z',
  checkedInByUserId: null,
  checkedInByName: null,
  checkedOutAtUtc: null,
  checkedOutByUserId: null,
  checkedOutByName: null
}

const page = (items: unknown[] = [row]) => ({
  items,
  page: 1,
  pageSize: 20,
  totalCount: 47,
  totalPages: 3,
  hasNextPage: true,
  hasPreviousPage: false
})

test('reads Backend S8.1 totalCount and preserves the scoped attendance fields', () => {
  const result = normalizeAttendanceRecordsPage(page(), eventId)
  assert.equal(result.total, 47)
  assert.equal(result.items[0].registrationId, row.registrationId)
  assert.equal(result.items[0].attendanceStatus, 'CHECK IN')
  assert.equal(result.items[0].checkInMethod, 1)
  assert.equal(result.items[0].checkedOutAtUtc, null)
  assert.equal(result.items[0].checkedInByName, null)
  assert.equal(result.items[0].eventId, eventId)
  assert.equal('photoUrl' in result.items[0], false)
})

test('supports valid checkout data and server-provided operator names', () => {
  const result = normalizeAttendanceRecordsPage(page([{
    ...row,
    attendanceStatus: 'CHECK OUT',
    checkInMethod: 'Manual',
    checkedInByName: 'Petugas Satu',
    checkedOutAtUtc: '2026-10-16T06:30:00Z',
    checkedOutByName: 'Petugas Dua'
  }]), eventId)
  assert.equal(result.items[0].checkedOutByName, 'Petugas Dua')
  assert.equal(result.items[0].attendanceStatus, 'CHECK OUT')
})

test('handles empty pages and nullable optional actor and method fields', () => {
  assert.equal(normalizeAttendanceRecordsPage(page([]), eventId).items.length, 0)
  const result = normalizeAttendanceRecordsPage(page([{ ...row, checkInMethod: null, checkedInByName: undefined }]), eventId)
  assert.equal(result.items[0].checkInMethod, null)
  assert.equal(result.items[0].checkedInByName, null)
})

test('rejects wrong-event rows, missing totalCount and invalid attendance states', () => {
  const foreign = { ...row, eventId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }
  for (const bad of [
    { ...page(), totalCount: undefined },
    page([foreign]),
    page([{ ...row, attendanceStatus: 'Completed' }]),
    page([{ ...row, registrationId: '' }]),
    page([{ ...row, checkedOutAtUtc: 55 }]),
    page([{ ...row, registeredAtUtc: 'invalid' }])
  ]) {
    assert.throws(() => normalizeAttendanceRecordsPage(bad, eventId))
  }
})

test('builds only real event attendance filter keys before server pagination', () => {
  const query = buildAttendanceRecordsQuery({
    page: 3,
    pageSize: 50,
    search: 'Andi & Sari',
    participantType: 'Internal',
    eventPackageId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    sort: 'checkedInAt',
    direction: 'asc',
    status: 'CheckedIn',
    method: 'QR',
    actorUserId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    checkedInFromUtc: '2026-10-16T01:00:00Z',
    checkedInToUtc: '2026-10-16T09:00:00Z'
  })
  assert.equal(query.get('status'), 'CheckedIn')
  assert.equal(query.get('method'), 'QR')
  assert.equal(query.get('sort'), 'checkedInAt')
  assert.equal(query.get('page'), '3')
  assert.equal(query.get('checkedInFromUtc'), '2026-10-16T01:00:00Z')
  assert.equal(query.has('photoUrl'), false)
  assert.equal(query.has('registrationStatus'), false)
})

test('rejects unsupported registration-only sorting and malformed UTC ranges', () => {
  const base = { page: 1, pageSize: 20 }
  for (const bad of [
    { ...base, pageSize: 200 },
    { ...base, page: 0 },
    { ...base, sort: 'bookingCode' },
    { ...base, status: 'Completed' },
    { ...base, method: 'Selfie' },
    { ...base, checkedInFromUtc: '2026-10-16T08:00:00+07:00' },
    { ...base, checkedInFromUtc: '2026-10-16T09:00:00Z', checkedInToUtc: '2026-10-16T08:00:00Z' }
  ]) {
    assert.throws(() => buildAttendanceRecordsQuery(bad as Parameters<typeof buildAttendanceRecordsQuery>[0]))
  }
})
