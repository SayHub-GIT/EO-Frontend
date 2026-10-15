import type { CheckInResponse } from './check-ins'

/**
 * An attendance mutation may already be committed when the network fails.
 * Only a complete response for the exact registration and event counts as
 * confirmed success in the UI. The server remains the authority.
 */
export const isConfirmedManualCheckInResponse = (
  value: unknown,
  registrationId: string,
  eventId: string
): value is CheckInResponse => {
  if (!value || typeof value !== 'object') return false

  const response = value as Partial<CheckInResponse>

  return Boolean(registrationId) &&
    Boolean(eventId) &&
    response.registrationId === registrationId &&
    response.eventId === eventId &&
    typeof response.bookingCode === 'string' &&
    response.bookingCode.trim().length > 0 &&
    typeof response.fullName === 'string' &&
    response.fullName.trim().length > 0 &&
    typeof response.eventName === 'string' &&
    response.eventName.trim().length > 0 &&
    typeof response.checkedInAtUtc === 'string' &&
    response.checkedInAtUtc.trim().length > 0 &&
    Number.isFinite(Date.parse(response.checkedInAtUtc))
}

/** A 409 means the chosen candidate is stale; refresh before any new attempt. */
export class ManualCheckInConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ManualCheckInConflictError'
  }
}
