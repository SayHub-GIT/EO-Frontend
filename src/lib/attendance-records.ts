import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'
import {
  buildAttendanceRecordsQuery,
  normalizeAttendanceRecordsPage,
  type AttendanceRecordsFilters,
  type AttendanceRecordsPage
} from '@/lib/attendance-records-contract'

export async function getEventAttendanceRecords(
  eventId: string,
  filters: AttendanceRecordsFilters,
  signal?: AbortSignal
): Promise<AttendanceRecordsPage> {
  if (!eventId.trim()) throw new Error('Pilih event terlebih dahulu.')

  const query = buildAttendanceRecordsQuery(filters)
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/attendance?${query}`,
    { cache: 'no-store', signal }
  )

  if (!response.ok) {
    throw new Error(await parseError(response, 'Daftar kehadiran gagal dimuat.'))
  }

  return normalizeAttendanceRecordsPage(await response.json(), eventId)
}
