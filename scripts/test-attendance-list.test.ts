import assert from 'node:assert/strict'
import test from 'node:test'

import { attendanceStatusLabel, formatAttendanceUtc, normalizeAttendanceListPage } from '../src/lib/attendance-list'

const participant = {
  id: 'registration-1',
  fullName: 'Peserta Uji',
  bookingCode: 'BOOK-001',
  email: 'contoh@example.invalid',
  eventPackageName: 'Paket Reguler',
  status: 3,
  registeredAtUtc: '2026-10-15T02:00:00Z',
  checkedInAtUtc: '2026-10-15T03:00:00Z'
}

const page = (items: unknown[] = [participant]) => ({
  items,
  page: 1,
  pageSize: 20,
  total: 42
})

test('preserves server pagination rather than deriving totals from visible rows', () => {
  const response = normalizeAttendanceListPage(page())
  assert.equal(response.total, 42)
  assert.equal(response.items.length, 1)
  assert.equal(response.page, 1)
  assert.equal(response.pageSize, 20)
})

test('supports empty pages and nullable event package/Check-In fields', () => {
  const empty = normalizeAttendanceListPage({ items: [], page: 2, pageSize: 20, total: 20 })
  assert.equal(empty.items.length, 0)
  assert.equal(empty.total, 20)
  const value = normalizeAttendanceListPage(page([{ ...participant, eventPackageName: null, checkedInAtUtc: null }]))
  assert.equal(value.items[0].checkedInAtUtc, null)
})

test('rejects malformed paging, incomplete or inconsistent participant data', () => {
  for (const bad of [null, [], {}, { ...page(), total: undefined }, { ...page(), page: 0 },
    { ...page(), items: [null] }, page([{ ...participant, id: '' }]), page([{ ...participant, checkedInAtUtc: 5 }])]) {
    assert.throws(() => normalizeAttendanceListPage(bad))
  }
})

test('maps both numeric ASP.NET enum and textual status without inventing attendance state', () => {
  assert.equal(attendanceStatusLabel(1), 'Menunggu pembayaran')
  assert.equal(attendanceStatusLabel(2), 'Terdaftar')
  assert.equal(attendanceStatusLabel(3), 'Check-In')
  assert.equal(attendanceStatusLabel(7), 'Selesai')
  assert.equal(attendanceStatusLabel('CheckedIn'), 'Check-In')
  assert.equal(attendanceStatusLabel('Unexpected'), 'Status tidak diketahui')
})

test('uses server UTC time formatted in WIB, with clear absence and invalidity', () => {
  assert.match(formatAttendanceUtc('2026-10-15T03:00:00Z'), /10[.:]00/)
  assert.equal(formatAttendanceUtc(null), 'Belum tercatat')
  assert.equal(formatAttendanceUtc('invalid'), 'Waktu tidak valid')
})
