import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAttendanceQuery, parseAttendanceFilters, type AttendanceListFilters } from '../src/lib/attendance-list-filters'

const defaults = parseAttendanceFilters(new URLSearchParams())

test('empty URL has stable server-compatible defaults', () => {
  assert.deepEqual(defaults, {
    page: 1,
    pageSize: 20,
    search: '',
    participantType: '',
    eventPackageId: '',
    sort: 'registeredAt',
    direction: 'desc'
  })
})

test('round-trips supported search, participant type, package and server paging', () => {
  const state: AttendanceListFilters = {
    page: 4,
    pageSize: 50,
    search: 'Andi+Sari & koperasi',
    participantType: 'Internal',
    eventPackageId: '36b33a0d-15f1-4c2f-9d14-83cef8762de5',
    sort: 'fullName',
    direction: 'asc'
  }
  const query = buildAttendanceQuery(state)
  assert.equal(query.get('search'), state.search)
  assert.equal(query.get('participantType'), 'Internal')
  assert.equal(query.get('page'), '4')
  assert.deepEqual(parseAttendanceFilters(query), state)
})

test('invalid or out-of-range URL input falls back safely', () => {
  const result = parseAttendanceFilters(new URLSearchParams({
    page: '-9',
    pageSize: '900',
    search: '  b  '.repeat(70),
    participantType: 'Admin',
    eventPackageId: '../../invalid',
    sort: 'checkedOutAt',
    direction: 'INVALID'
  }))
  assert.equal(result.page, 1)
  assert.equal(result.pageSize, 20)
  assert.equal(result.search.length, 200)
  assert.equal(result.participantType, '')
  assert.equal(result.eventPackageId, '')
  assert.equal(result.sort, 'registeredAt')
  assert.equal(result.direction, 'desc')
})

test('parses existing shared links with uppercase enum values and reverse sorting', () => {
  const result = parseAttendanceFilters(new URLSearchParams(
    'page=2&pageSize=10&participantType=EXTERNAL&sort=bookingCode&direction=DESC'
  ))
  assert.equal(result.page, 2)
  assert.equal(result.pageSize, 10)
  assert.equal(result.participantType, 'External')
  assert.equal(result.sort, 'bookingCode')
  assert.equal(result.direction, 'desc')
})

test('only supported Backend query arguments are sent, not status/method/date keys', () => {
  const original = new URLSearchParams('status=CheckedIn&method=QR&from=2026-10-01&page=2&search=Maya')
  const query = buildAttendanceQuery(parseAttendanceFilters(original))
  assert.equal(query.get('search'), 'Maya')
  assert.equal(query.get('page'), '2')
  assert.equal(query.has('status'), false)
  assert.equal(query.has('method'), false)
  assert.equal(query.has('from'), false)
})

test('changing a filter resets pagination without losing other authorized constraints', () => {
  const previous = parseAttendanceFilters(new URLSearchParams(
    'page=5&search=Aji&participantType=Internal&sort=fullName&direction=asc'
  ))
  const updated = buildAttendanceQuery({ ...previous, search: 'Nina', page: 1 })
  assert.equal(updated.get('page'), '1')
  assert.equal(updated.get('search'), 'Nina')
  assert.equal(updated.get('participantType'), 'Internal')
  assert.equal(updated.get('sort'), 'fullName')
})
