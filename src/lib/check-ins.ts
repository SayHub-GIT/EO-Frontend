import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'
import { ManualCheckInConflictError } from '@/lib/manual-check-in-confirmation'
import { ManualCheckOutConflictError } from '@/lib/manual-check-out'

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
  }, { retryOn401: false })

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

export type AttendanceOperationSearchMode = 'CheckIn' | 'CheckOut'

export async function searchCheckInParticipants(
  eventId: string,
  query: string,
  mode: AttendanceOperationSearchMode,
  signal?: AbortSignal,
  sendRequest: typeof authFetch = authFetch
): Promise<AttendanceParticipant[]> {
  const selectedEventId = eventId.trim()
  if (!selectedEventId) throw new Error('Pilih event terlebih dahulu.')
  if (mode !== 'CheckIn' && mode !== 'CheckOut') {
    throw new Error('Mode pencarian peserta tidak valid.')
  }

  const term = query.trim()
  if (term.length < 2) return []

  const params = new URLSearchParams({ eventId: selectedEventId, q: term, mode })
  const response = await sendRequest(`/check-ins/search?${params}`, { cache: 'no-store', signal })
  if (!response.ok) throw new Error(await parseError(response, 'Pencarian peserta gagal.'))

  const payload: unknown = await response.json()
  if (!Array.isArray(payload)) throw new Error('Respons pencarian peserta tidak valid.')
  for (const row of payload) {
    if (!row || typeof row !== 'object' ||
      typeof row.eventId !== 'string' ||
      row.eventId.toLowerCase() !== selectedEventId.toLowerCase() ||
      typeof row.registrationId !== 'string') {
      throw new Error('Server mengembalikan peserta dari event yang tidak sesuai.')
    }
  }
  return payload as AttendanceParticipant[]
}

/** Confirm a selected registration ID, never a bare name (names can collide). */
export async function manualCheckIn(registrationId: string): Promise<CheckInResponse> {
  if (!registrationId) throw new Error('Select one registration.')
  const response = await authFetch('/check-ins/manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationId })
  }, { retryOn401: false })
  if (response.status === 409) {
    throw new ManualCheckInConflictError(await parseError(response, 'Status kehadiran peserta berubah.'))
  }
  if (!response.ok) throw new Error(await parseError(response, 'Manual check-in failed.'))
  return (await response.json()) as CheckInResponse
}

export type CheckOutResponse = CheckInResponse & {
  checkedOutAtUtc: string
}

/** Confirm checkout for one registration; Backend controls eligibility and permissions. */
export async function manualCheckOut(registrationId: string): Promise<CheckOutResponse> {
  if (!registrationId.trim()) throw new Error('Pilih peserta sebelum melakukan Check-Out.')

  const response = await authFetch(`/check-ins/${encodeURIComponent(registrationId)}/checkout`, {
    method: 'POST'
  }, { retryOn401: false })

  if (response.status === 409) {
    throw new ManualCheckOutConflictError(await parseError(response, 'Status kehadiran peserta berubah.'))
  }
  if (!response.ok) throw new Error(await parseError(response, 'Check-Out peserta gagal.'))

  return (await response.json()) as CheckOutResponse
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
  }, { retryOn401: false })
  if (!response.ok) {
    throw new Error(await parseError(response, 'Photo was not saved. Verify the private storage bucket and permissions.'))
  }
}
