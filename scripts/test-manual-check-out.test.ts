import assert from 'node:assert/strict'
import test from 'node:test'

import { eligibleManualCheckOutMatches, isConfirmedManualCheckOutResponse, isEligibleManualCheckOut, ManualCheckOutConflictError } from '../src/lib/manual-check-out'
import type { AttendanceParticipant, CheckOutResponse } from '../src/lib/check-ins'

const participant = (overrides: Partial<AttendanceParticipant> = {}): AttendanceParticipant => ({
  registrationId: 'registration-a',
  eventId: 'event-a',
  bookingCode: 'BOOK-01',
  fullName: 'Peserta Contoh',
  email: 'test@example.invalid',
  eventName: 'Event A',
  eventPackageId: null,
  eventPackageName: null,
  status: 3,
  checkedInAtUtc: '2026-10-15T03:00:00Z',
  checkedOutAtUtc: null,
  canCheckIn: false,
  canCheckOut: true,
  attendanceState: 'Checked in',
  ...overrides
})

const checkout: CheckOutResponse = {
  registrationId: 'registration-a',
  eventId: 'event-a',
  bookingCode: 'BOOK-01',
  fullName: 'Peserta Contoh',
  eventName: 'Event A',
  eventPackageId: null,
  eventPackageName: null,
  checkedInAtUtc: '2026-10-15T03:00:00Z',
  checkedOutAtUtc: '2026-10-15T04:00:00Z'
}

test('only checked-in attendees allowed by Backend are eligible for checkout', () => {
  assert.equal(isEligibleManualCheckOut(participant(), 'event-a'), true)
  assert.equal(isEligibleManualCheckOut(participant({ canCheckOut: false }), 'event-a'), false)
  assert.equal(isEligibleManualCheckOut(participant({ checkedInAtUtc: null }), 'event-a'), false)
  assert.equal(isEligibleManualCheckOut(participant({ checkedInAtUtc: '' }), 'event-a'), false)
  assert.equal(isEligibleManualCheckOut(participant({ checkedOutAtUtc: '2026-10-15T04:00:00Z' }), 'event-a'), false)
})

test('event isolation excludes foreign event and missing event scope', () => {
  assert.equal(isEligibleManualCheckOut(participant({ eventId: 'event-b' }), 'event-a'), false)
  assert.equal(isEligibleManualCheckOut(participant(), ''), false)
})

test('filter leaves search payload unchanged and preserves eligible order', () => {
  const source = [
    participant({ registrationId: 'ok-1' }),
    participant({ registrationId: 'already-out', checkedOutAtUtc: '2026-10-15T04:00:00Z' }),
    participant({ registrationId: 'not-in', checkedInAtUtc: null }),
    participant({ registrationId: 'wrong-event', eventId: 'event-b' }),
    participant({ registrationId: 'blocked', canCheckOut: false }),
    participant({ registrationId: 'ok-2' })
  ]
  assert.deepEqual(eligibleManualCheckOutMatches(source, 'event-a').map(x => x.registrationId), ['ok-1', 'ok-2'])
  assert.equal(source.length, 6)
})

test('only exact registration/event and valid server timestamps confirm checkout', () => {
  assert.equal(isConfirmedManualCheckOutResponse(checkout, 'registration-a', 'event-a'), true)
  assert.equal(isConfirmedManualCheckOutResponse(checkout, 'other', 'event-a'), false)
  assert.equal(isConfirmedManualCheckOutResponse(checkout, 'registration-a', 'event-b'), false)
  assert.equal(isConfirmedManualCheckOutResponse({ ...checkout, checkedInAtUtc: 'invalid' }, 'registration-a', 'event-a'), false)
  assert.equal(isConfirmedManualCheckOutResponse({ ...checkout, checkedOutAtUtc: '' }, 'registration-a', 'event-a'), false)
  assert.equal(isConfirmedManualCheckOutResponse({ ...checkout, checkedOutAtUtc: '2026-10-15T02:00:00Z' }, 'registration-a', 'event-a'), false)
  assert.equal(isConfirmedManualCheckOutResponse(null, 'registration-a', 'event-a'), false)
})

test('a stale checkout conflict stays distinguishable from ordinary network errors', () => {
  const error = new ManualCheckOutConflictError('Participant already checked out.')
  assert.ok(error instanceof Error)
  assert.ok(error instanceof ManualCheckOutConflictError)
  assert.equal(error.name, 'ManualCheckOutConflictError')
  assert.match(error.message, /already checked out/)
})
