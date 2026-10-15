import type { AttendanceParticipant, CheckOutResponse } from './check-ins'

/**
 * UI-only guard. The Backend must still verify current attendance state and
 * the operator's event-scoped attendance.checkout permission at mutation time.
 */
export const isEligibleManualCheckOut = (participant: AttendanceParticipant, selectedEventId: string): boolean =>
  Boolean(selectedEventId) &&
  participant.eventId === selectedEventId &&
  participant.canCheckOut === true &&
  typeof participant.checkedInAtUtc === 'string' &&
  participant.checkedInAtUtc.trim().length > 0 &&
  participant.checkedOutAtUtc === null

export const eligibleManualCheckOutMatches = (
  matches: AttendanceParticipant[],
  eventId: string
): AttendanceParticipant[] => matches.filter(participant => isEligibleManualCheckOut(participant, eventId))

export const isConfirmedManualCheckOutResponse = (
  value: unknown,
  registrationId: string,
  eventId: string
): value is CheckOutResponse => {
  if (!value || typeof value !== 'object') return false

  const response = value as Partial<CheckOutResponse>
  if (
    !registrationId ||
    !eventId ||
    response.registrationId !== registrationId ||
    response.eventId !== eventId ||
    typeof response.fullName !== 'string' ||
    !response.fullName.trim() ||
    typeof response.bookingCode !== 'string' ||
    !response.bookingCode.trim() ||
    typeof response.eventName !== 'string' ||
    !response.eventName.trim() ||
    typeof response.checkedInAtUtc !== 'string' ||
    typeof response.checkedOutAtUtc !== 'string'
  ) return false

  const checkedInAt = Date.parse(response.checkedInAtUtc)
  const checkedOutAt = Date.parse(response.checkedOutAtUtc)

  return Number.isFinite(checkedInAt) && Number.isFinite(checkedOutAt) && checkedOutAt >= checkedInAt
}

export class ManualCheckOutConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ManualCheckOutConflictError'
  }
}
