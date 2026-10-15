import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'
import { buildAttendanceQuery, type AttendanceListFilters } from '@/lib/attendance-list-filters'

export type AttendanceListRow = {
  id: string
  fullName: string
  bookingCode: string
  email: string
  eventPackageName: string | null
  status: string | number
  registeredAtUtc: string
  checkedInAtUtc: string | null
}

export type AttendanceListPage = {
  items: AttendanceListRow[]
  page: number
  pageSize: number
  total: number
}

const readText = (record: Record<string, unknown>, field: string): string => {
  const value = record[field]
  return typeof value === 'string' ? value : ''
}

export const normalizeAttendanceListPage = (payload: unknown): AttendanceListPage => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Format daftar peserta dari server tidak valid.')
  }

  const record = payload as Record<string, unknown>

  if (
    !Array.isArray(record.items) ||
    !Number.isInteger(record.page) || Number(record.page) < 1 ||
    !Number.isInteger(record.pageSize) || Number(record.pageSize) < 1 ||
    !Number.isInteger(record.total) || Number(record.total) < 0
  ) {
    throw new Error('Data pagination daftar peserta tidak lengkap.')
  }

  const items = record.items.map((item): AttendanceListRow => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Data peserta dari server tidak valid.')
    }

    const row = item as Record<string, unknown>
    const id = readText(row, 'id')
    const fullName = readText(row, 'fullName')
    const bookingCode = readText(row, 'bookingCode')
    const email = readText(row, 'email')
    const registeredAtUtc = readText(row, 'registeredAtUtc')

    if (
      !id.trim() || !fullName.trim() || !bookingCode.trim() ||
      !(typeof row.status === 'string' || typeof row.status === 'number') ||
      !registeredAtUtc.trim() ||
      (row.checkedInAtUtc !== null && typeof row.checkedInAtUtc !== 'string') ||
      (row.eventPackageName !== null && typeof row.eventPackageName !== 'string')
    ) {
      throw new Error('Data peserta dari server belum lengkap.')
    }

    return {
      id,
      fullName,
      bookingCode,
      email,
      eventPackageName: row.eventPackageName,
      status: row.status,
      registeredAtUtc,
      checkedInAtUtc: row.checkedInAtUtc
    }
  })

  return { items, page: Number(record.page), pageSize: Number(record.pageSize), total: Number(record.total) }
}

export const attendanceStatusLabel = (status: string | number): string => {
  const normalized = String(status).trim().replace(/[\s_-]/g, '').toLowerCase()

  switch (normalized) {
    case '1':
    case 'pendingpayment': return 'Menunggu pembayaran'
    case '2':
    case 'registered':
    case 'paid': return 'Terdaftar'
    case '3':
    case 'checkedin': return 'Check-In'
    case '4':
    case 'cancelled':
    case 'canceled': return 'Dibatalkan'
    case '5':
    case 'failed': return 'Gagal'
    case '6':
    case 'expired': return 'Kedaluwarsa'
    case '7':
    case 'completed': return 'Selesai'
    default: return 'Status tidak diketahui'
  }
}

export const formatAttendanceUtc = (value: string | null): string => {
  if (!value) return 'Belum tercatat'

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Waktu tidak valid'

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date) + ' WIB'
}

export async function getAttendanceListPage(
  eventId: string,
  filters: AttendanceListFilters,
  signal?: AbortSignal
): Promise<AttendanceListPage> {
  if (!eventId) throw new Error('Pilih event terlebih dahulu.')
  if (!Number.isSafeInteger(filters.page) || filters.page < 1 || ![10, 20, 50].includes(filters.pageSize)) {
    throw new Error('Parameter halaman daftar peserta tidak valid.')
  }

  const params = buildAttendanceQuery(filters)
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/registrations?${params}`,
    { cache: 'no-store', signal }
  )

  if (!response.ok) {
    throw new Error(await parseError(response, 'Daftar kehadiran gagal dimuat.'))
  }

  return normalizeAttendanceListPage(await response.json())
}
