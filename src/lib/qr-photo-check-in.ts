import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'
import { MAX_FACE_PHOTO_BYTES } from '@/lib/qr-face-capture'
import type { AttendanceParticipant, CheckInResponse } from '@/lib/check-ins'

export class QrPhotoCheckInConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QrPhotoCheckInConflictError'
  }
}

export class QrPhotoCheckInUncertainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QrPhotoCheckInUncertainError'
  }
}

export const isConfirmedQrPhotoCheckIn = (
  value: unknown,
  participant: Pick<AttendanceParticipant, 'eventId' | 'registrationId' | 'bookingCode'>
): value is CheckInResponse => {
  if (!value || typeof value !== 'object') return false
  const result = value as Partial<CheckInResponse>
  return typeof result.registrationId === 'string' &&
    result.registrationId.toLowerCase() === participant.registrationId.toLowerCase() &&
    typeof result.eventId === 'string' &&
    result.eventId.toLowerCase() === participant.eventId.toLowerCase() &&
    typeof result.bookingCode === 'string' &&
    result.bookingCode === participant.bookingCode &&
    typeof result.checkedInAtUtc === 'string' &&
    Number.isFinite(Date.parse(result.checkedInAtUtc)) &&
    typeof result.fullName === 'string' &&
    result.fullName.trim().length > 0
}

export const isValidQrFaceJpeg = async (jpeg: Blob): Promise<boolean> => {
  if (jpeg.type !== 'image/jpeg' || jpeg.size < 4 || jpeg.size > MAX_FACE_PHOTO_BYTES) return false
  const start = new Uint8Array(await jpeg.slice(0, 2).arrayBuffer())
  const end = new Uint8Array(await jpeg.slice(-2).arrayBuffer())
  return start[0] === 0xff && start[1] === 0xd8 && end[0] === 0xff && end[1] === 0xd9
}

export async function checkInQrWithPhoto(
  qrToken: string,
  participant: Pick<AttendanceParticipant, 'eventId' | 'registrationId' | 'bookingCode'>,
  jpeg: Blob,
  consentConfirmed: boolean,
  sendRequest: typeof authFetch = authFetch
): Promise<CheckInResponse> {
  if (!qrToken.trim() || !participant.registrationId || !participant.eventId || !participant.bookingCode) {
    throw new Error('QR belum tervalidasi untuk peserta yang dipilih.')
  }
  if (!consentConfirmed) throw new Error('Persetujuan foto peserta wajib dikonfirmasi.')
  if (!(await isValidQrFaceJpeg(jpeg))) throw new Error('Foto wajah belum valid. Ambil foto ulang terlebih dahulu.')

  const form = new FormData()
  form.append('qrToken', qrToken.trim())
  form.append('file', jpeg, 'attendance-face.jpg')
  form.append('consentConfirmed', 'true')

  let response: Response
  try {
    response = await sendRequest('/check-ins/qr-with-photo', {
      method: 'POST',
      body: form,
      cache: 'no-store'
    })
  } catch {
    throw new QrPhotoCheckInUncertainError('Koneksi terputus saat finalisasi. Check-In mungkin sudah tercatat; periksa daftar kehadiran sebelum memulai transaksi lain.')
  }

  if (response.status === 409) {
    throw new QrPhotoCheckInConflictError('Status peserta sudah berubah. Periksa daftar kehadiran dan jangan kirim ulang QR ini tanpa verifikasi.')
  }

  if (!response.ok) {
    const details = await parseError(response, 'Finalisasi QR dan foto gagal.').catch(() => 'Finalisasi QR dan foto gagal.')
    if (response.status >= 500 || response.status === 408 || response.status === 504) {
      throw new QrPhotoCheckInUncertainError('Server belum memastikan hasil transaksi. Periksa daftar kehadiran sebelum mencoba kembali. ' + details)
    }
    throw new Error(details)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new QrPhotoCheckInUncertainError('Server merespons tanpa konfirmasi Check-In yang dapat diperiksa. Periksa daftar kehadiran terlebih dahulu.')
  }
  if (!isConfirmedQrPhotoCheckIn(payload, participant)) {
    throw new QrPhotoCheckInUncertainError('Respons Check-In tidak sesuai dengan peserta atau event. Periksa status server sebelum melanjutkan.')
  }
  return payload
}
