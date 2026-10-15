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

/**
 * Validate a scanned QR without mutating attendance.
 * Never return the QR token in errors or persist it to storage.
 */
export async function previewCheckInParticipant(qrToken: string, signal?: AbortSignal): Promise<AttendanceParticipant> {
  const token = qrToken.trim()
  if (!token) throw new Error('QR tiket tidak valid.')

  const response = await authFetch('/check-ins/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrToken: token }),
    cache: 'no-store',
    signal
  })

  if (!response.ok) {
    throw new Error(await parseError(response, 'Tidak dapat memvalidasi QR tiket.'))
  }

  const payload: unknown = await response.json()

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof (payload as AttendanceParticipant).registrationId !== 'string' ||
    typeof (payload as AttendanceParticipant).eventId !== 'string' ||
    typeof (payload as AttendanceParticipant).fullName !== 'string' ||
    typeof (payload as AttendanceParticipant).bookingCode !== 'string' ||
    typeof (payload as AttendanceParticipant).canCheckIn !== 'boolean' ||
    typeof (payload as AttendanceParticipant).attendanceState !== 'string'
  ) {
    throw new Error('Data validasi QR dari server tidak lengkap.')
  }

  return payload as AttendanceParticipant
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
  query: string,
  signal?: AbortSignal
): Promise<AttendanceParticipant[]> {
  if (!eventId) throw new Error('Select an event before searching.')
  const term = query.trim()
  if (term.length < 2) return []

  const params = new URLSearchParams({ eventId, q: term })
  const response = await authFetch(`/check-ins/search?${params}`, { cache: 'no-store', signal })
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

/** Never returns a public storage URL; upload only after confirmed check-in. */
export async function uploadCheckInPhoto(
  registrationId: string,
  jpeg: Blob,
  consentConfirmed: boolean
): Promise<void> {
  if (!consentConfirmed) throw new Error('Participant consent has not been confirmed.')
  if (jpeg.type !== 'image/jpeg' || jpeg.size > 400 * 1024 || jpeg.size < 4) {
    throw new Error('Photo must be JPEG smaller than 400 KB.')
  }

  const form = new FormData()
  form.append('file', jpeg, 'attendance-photo.jpg')
  form.append('consentConfirmed', 'true')

  const response = await authFetch(`/check-ins/${encodeURIComponent(registrationId)}/photo`, {
    method: 'POST',
    body: form
  })
  if (!response.ok) {
    throw new Error(await parseError(response, 'Photo was not saved. Verify the private storage bucket and permissions.'))
  }
}
