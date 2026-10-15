import assert from 'node:assert/strict'
import test from 'node:test'

import { eligibleManualCheckInMatches, isEligibleManualCheckIn } from '../src/lib/manual-check-in-eligibility'
import type { AttendanceParticipant } from '../src/lib/check-ins'

const participant = (overrides: Partial<AttendanceParticipant> = {}): AttendanceParticipant => ({
  registrationId: 'registration-a',
  eventId: 'event-a',
  bookingCode: 'TEST-01',
  fullName: 'Peserta Contoh',
  email: 'test@example.invalid',
  eventName: 'Event A',
  eventPackageId: null,
  eventPackageName: null,
  status: 2,
  checkedInAtUtc: null,
  checkedOutAtUtc: null,
  canCheckIn: true,
  canCheckOut: false,
  attendanceState: 'Ready for check-in',
  ...overrides
})

test('accepts Registered status encoded as enum integer or text only when server allows it', () => {
  for (const status of [2, '2', 'Registered', 'REGISTERED', ' registered ']) {
    assert.equal(isEligibleManualCheckIn(participant({ status }), 'event-a'), true)
  }
})

test('rejects non-Registered statuses even if canCheckIn is accidentally true', () => {
  for (const status of [1, 3, 4, 5, 6, 7, 'CheckedIn', 'PendingPayment', 'Completed', '']) {
    assert.equal(isEligibleManualCheckIn(participant({ status }), 'event-a'), false)
  }
})

test('rejects server-ineligible, checked-in and checked-out attendees', () => {
  assert.equal(isEligibleManualCheckIn(participant({ canCheckIn: false }), 'event-a'), false)
  assert.equal(isEligibleManualCheckIn(participant({ checkedInAtUtc: '2026-10-15T03:00:00Z' }), 'event-a'), false)
  assert.equal(isEligibleManualCheckIn(participant({ checkedOutAtUtc: '2026-10-15T04:00:00Z' }), 'event-a'), false)
})

test('does not leak participants from another event or when event is not selected', () => {
  assert.equal(isEligibleManualCheckIn(participant({ eventId: 'event-b' }), 'event-a'), false)
  assert.equal(isEligibleManualCheckIn(participant(), ''), false)
})

test('filters to only eligible registrations without mutating the search response', () => {
  const source = [
    participant({ registrationId: 'eligible-1' }),
    participant({ registrationId: 'already-checked-in', status: 3, checkedInAtUtc: '2026-10-15T03:00:00Z' }),
    participant({ registrationId: 'another-event', eventId: 'event-b' }),
    participant({ registrationId: 'blocked', canCheckIn: false }),
    participant({ registrationId: 'eligible-2', status: 'Registered' })
  ]
  const result = eligibleManualCheckInMatches(source, 'event-a')
  assert.deepEqual(result.map(row => row.registrationId), ['eligible-1', 'eligible-2'])
  assert.equal(source.length, 5)
})
