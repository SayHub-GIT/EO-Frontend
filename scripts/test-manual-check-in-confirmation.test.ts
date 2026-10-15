import assert from 'node:assert/strict'
import test from 'node:test'

import { isConfirmedManualCheckInResponse, ManualCheckInConflictError } from '../src/lib/manual-check-in-confirmation'
import type { CheckInResponse } from '../src/lib/check-ins'

const confirmed: CheckInResponse = {
  registrationId: 'registration-1',
  eventId: 'event-a',
  bookingCode: 'BOOK-123',
  fullName: 'Peserta Uji',
  eventName: 'Event A',
  eventPackageId: null,
  eventPackageName: null,
  checkedInAtUtc: '2026-10-15T03:00:00Z'
}

test('accepts complete server-confirmed attendance for exactly the selected registration and event', () => {
  assert.equal(isConfirmedManualCheckInResponse(confirmed, 'registration-1', 'event-a'), true)
})

test('never shows success when server returns another registration or event', () => {
  assert.equal(isConfirmedManualCheckInResponse(confirmed, 'registration-other', 'event-a'), false)
  assert.equal(isConfirmedManualCheckInResponse(confirmed, 'registration-1', 'event-b'), false)
  assert.equal(isConfirmedManualCheckInResponse(confirmed, '', 'event-a'), false)
  assert.equal(isConfirmedManualCheckInResponse(confirmed, 'registration-1', ''), false)
})

test('rejects empty, malformed, or incomplete server responses', () => {
  for (const payload of [undefined, null, 5, [], {}, { ...confirmed, fullName: '' }, { ...confirmed, bookingCode: '' }, { ...confirmed, eventName: '' }]) {
    assert.equal(isConfirmedManualCheckInResponse(payload, 'registration-1', 'event-a'), false)
  }
})

test('requires valid checked-in timestamp from server', () => {
  assert.equal(isConfirmedManualCheckInResponse({ ...confirmed, checkedInAtUtc: '' }, 'registration-1', 'event-a'), false)
  assert.equal(isConfirmedManualCheckInResponse({ ...confirmed, checkedInAtUtc: 'not-a-date' }, 'registration-1', 'event-a'), false)
  assert.equal(isConfirmedManualCheckInResponse({ ...confirmed, checkedInAtUtc: null }, 'registration-1', 'event-a'), false)
})

test('conflict error remains distinguishable from other failures and never implies success', () => {
  const error = new ManualCheckInConflictError('Participant was already checked in.')
  assert.equal(error instanceof Error, true)
  assert.equal(error instanceof ManualCheckInConflictError, true)
  assert.equal(error.name, 'ManualCheckInConflictError')
  assert.equal(error.message.includes('already checked in'), true)
})
