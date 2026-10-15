import type { AttendanceParticipant } from './check-ins'

const isRegisteredStatus = (status: AttendanceParticipant['status']) =>
  status === 2 || (typeof status === 'string' && ['2', 'registered'].includes(status.trim().toLowerCase()))

/**
 * UI eligibility guard only. Backend remains the authority on attendance,
 * event ownership and registration state at the moment of confirmation.
 */
export const isEligibleManualCheckIn = (participant: AttendanceParticipant, selectedEventId: string): boolean =>
  Boolean(selectedEventId) &&
  participant.eventId === selectedEventId &&
  isRegisteredStatus(participant.status) &&
  participant.canCheckIn === true &&
  participant.checkedInAtUtc === null &&
  participant.checkedOutAtUtc === null

export const eligibleManualCheckInMatches = (
  matches: AttendanceParticipant[],
  selectedEventId: string
): AttendanceParticipant[] => matches.filter(participant => isEligibleManualCheckIn(participant, selectedEventId))
