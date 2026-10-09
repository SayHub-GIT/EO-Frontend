import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'

export type CheckInResponse = {
  registrationId: string
  eventId: string
  bookingCode: string
  fullName: string
  eventName: string
  eventPackageId: string | null
  eventPackageName: string | null
  checkedInAtUtc: string
}

export async function checkInParticipant(qrToken: string): Promise<CheckInResponse> {
  const token = qrToken.trim()

  if (!token) throw new Error('QR token is required.')

  const response = await authFetch('/check-ins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrToken: token })
  })

  if (!response.ok) {
    throw new Error(await parseError(response, 'Unable to check in participant.'))
  }

  return (await response.json()) as CheckInResponse
}

export type AttendanceParticipant = {
  registrationId: string
  eventId: string
  bookingCode: string
  fullName: string
  email: string
  eventName: string
  eventPackageId: string | null
  eventPackageName: string | null
  status: string | number
  checkedInAtUtc: string | null
  checkedOutAtUtc: string | null
  canCheckIn: boolean
  canCheckOut: boolean
  attendanceState: string
}

/** Search is scoped to exactly one event by the backend authorization service. */
export async function searchCheckInParticipants(
  eventId: string,
  query: string
): Promise<AttendanceParticipant[]> {
  if (!eventId) throw new Error('Select an event before searching.')
  const term = query.trim()
  if (term.length < 2) return []

  const params = new URLSearchParams({ eventId, q: term })
  const response = await authFetch(`/check-ins/search?${params}`, { cache: 'no-store' })
  if (!response.ok) throw new Error(await parseError(response, 'Unable to search participants.'))
  const payload: unknown = await response.json()
  if (!Array.isArray(payload)) throw new Error('The participant search response was invalid.')
  return payload as AttendanceParticipant[]
}

/** Confirm a selected registration ID, never a bare name (names can collide). */
export async function manualCheckIn(registrationId: string): Promise<CheckInResponse> {
  if (!registrationId) throw new Error('Select one registration.')
  const response = await authFetch('/check-ins/manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationId })
  })
  if (!response.ok) throw new Error(await parseError(response, 'Manual check-in failed.'))
  return (await response.json()) as CheckInResponse
}
