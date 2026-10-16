import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  buildAttendancePageQuery,
  parseAttendancePageFilters,
  toAttendanceRecordsFilters
} from '../src/lib/attendance-records-url'

test('attendance URL defaults to supported backend sort and no empty status/method', () => {
  const filters = parseAttendancePageFilters(new URLSearchParams())
  const query = buildAttendancePageQuery(filters)
  assert.equal(filters.page, 1)
  assert.equal(filters.pageSize, 20)
  assert.equal(query.get('sort'), 'registeredAt')
  assert.equal(query.has('status'), false)
  assert.equal(query.has('method'), false)
  assert.equal(toAttendanceRecordsFilters(filters).status, undefined)
})

test('preserves selected server filters across shareable URLs', () => {
  const params = new URLSearchParams({
    page: '3',
    pageSize: '50',
    search: 'Tari & Budi',
    participantType: 'EXTERNAL',
    eventPackageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    status: 'CHECKEDIN',
    method: 'QR',
    sort: 'checkedInAt',
    direction: 'asc'
  })
  const filters = parseAttendancePageFilters(params)
  const query = buildAttendancePageQuery(filters)
  assert.equal(query.get('status'), 'CheckedIn')
  assert.equal(query.get('method'), 'QR')
  assert.equal(query.get('participantType'), 'External')
  assert.equal(query.get('search'), 'Tari & Budi')
  assert.equal(query.get('page'), '3')
  assert.deepEqual(parseAttendancePageFilters(query), filters)
})

test('legacy bookingCode and unexpected URL values cannot reach new endpoint', () => {
  const filters = parseAttendancePageFilters(new URLSearchParams(
    'sort=bookingCode&status=Completed&method=face&page=-1&pageSize=300&actorUserId=wrong'
  ))
  const query = buildAttendancePageQuery(filters)
  assert.equal(query.get('sort'), 'registeredAt')
  assert.equal(query.get('page'), '1')
  assert.equal(query.get('pageSize'), '20')
  assert.equal(query.has('status'), false)
  assert.equal(query.has('method'), false)
  assert.equal(query.has('actorUserId'), false)
})

test('validates UTC ranges and strips reversed or offset-only filters', () => {
  const params = new URLSearchParams({
    checkedInFromUtc: '2026-10-17T10:00:00Z',
    checkedInToUtc: '2026-10-17T09:00:00Z',
    checkedOutFromUtc: '2026-10-17T00:00:00+07:00',
    checkedOutToUtc: '2026-10-17T12:00:00Z'
  })
  const query = buildAttendancePageQuery(parseAttendancePageFilters(params))
  assert.equal(query.has('checkedInFromUtc'), false)
  assert.equal(query.has('checkedInToUtc'), false)
  assert.equal(query.has('checkedOutFromUtc'), false)
  assert.equal(query.get('checkedOutToUtc'), '2026-10-17T12:00:00Z')
})

test('changing a filter can reset paging while preserving valid server-side parameters', () => {
  const before = parseAttendancePageFilters(new URLSearchParams(
    'page=5&search=Anto&method=Manual&status=Registered&sort=fullName&direction=asc'
  ))
  const after = buildAttendancePageQuery({ ...before, status: 'CheckedOut', page: 1 })
  assert.equal(after.get('page'), '1')
  assert.equal(after.get('status'), 'CheckedOut')
  assert.equal(after.get('method'), 'Manual')
  assert.equal(after.get('sort'), 'fullName')
})

test('attendance screen uses scoped API and real checkout/operator data', () => {
  const src = readFileSync('src/app/(dashboard)/admin/events/[eventSlug]/attendance/page.tsx', 'utf8')
  assert.match(src, /usePermissionAccess\('attendance\.read'\)/)
  assert.match(src, /getEventAttendanceRecords\(eventId, toAttendanceRecordsFilters\(filters\)/)
  assert.match(src, /row\.checkedOutAtUtc/)
  assert.match(src, /row\.checkedOutByName/)
  assert.match(src, /row\.registrationId/)
  assert.doesNotMatch(src, /getAttendanceListPage|row\.id|usePermissionAccess\('registration\.read'\)/)
})

test('event dashboard does not request attendance metrics without attendance.read', () => {
  const src = readFileSync('src/app/(dashboard)/admin/events/[eventSlug]/dashboard/page.tsx', 'utf8')
  assert.match(src, /usePermissionAccess\('attendance\.read'\)/)
  assert.match(src, /!attendanceReadAccess\.allowed/)
  assert.match(src, /getEventAttendanceMetrics\(eventId, controller\.signal\)/)
})
