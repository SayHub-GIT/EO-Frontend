import {
  buildAttendanceRecordsQuery,
  type AttendanceRecordsFilters
} from '@/lib/attendance-records-contract'

export type AttendancePageFilters = Omit<AttendanceRecordsFilters, 'status' | 'method'> & {
  pageSize: 10 | 20 | 50
  search: string
  participantType: '' | 'Internal' | 'External'
  eventPackageId: string
  sort: 'registeredAt' | 'fullName' | 'checkedInAt' | 'checkedOutAt'
  direction: 'asc' | 'desc'
  status: '' | 'Registered' | 'CheckedIn' | 'CheckedOut'
  method: '' | 'QR' | 'Manual'
}

const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const utcPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/

const validUtc = (value: string | null): string | undefined =>
  value && utcPattern.test(value) && Number.isFinite(Date.parse(value)) ? value : undefined

export const parseAttendancePageFilters = (params: URLSearchParams): AttendancePageFilters => {
  const rawPage = params.get('page') || ''
  const parsedPage = /^\d+$/.test(rawPage) ? Number(rawPage) : 1
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 && parsedPage <= 1000000 ? parsedPage : 1

  const rawSize = Number(params.get('pageSize'))
  const pageSize: AttendancePageFilters['pageSize'] = rawSize === 10 || rawSize === 50 ? rawSize : 20
  const participant = (params.get('participantType') || '').toLowerCase()
  const participantType: AttendancePageFilters['participantType'] =
    participant === 'internal' ? 'Internal' : participant === 'external' ? 'External' : ''

  const rawPackage = (params.get('eventPackageId') || '').trim()
  const rawSort = params.get('sort')
  const sort: AttendancePageFilters['sort'] =
    rawSort === 'fullName' || rawSort === 'checkedInAt' || rawSort === 'checkedOutAt'
      ? rawSort : 'registeredAt'

  const rawStatus = (params.get('status') || '').toLowerCase()
  const status: AttendancePageFilters['status'] =
    rawStatus === 'registered' ? 'Registered' :
    rawStatus === 'checkedin' ? 'CheckedIn' :
    rawStatus === 'checkedout' ? 'CheckedOut' : ''

  const rawMethod = (params.get('method') || '').toLowerCase()
  const method: AttendancePageFilters['method'] =
    rawMethod === 'qr' ? 'QR' : rawMethod === 'manual' ? 'Manual' : ''

  const checkedInFromUtc = validUtc(params.get('checkedInFromUtc'))
  const checkedInToUtc = validUtc(params.get('checkedInToUtc'))
  const checkedOutFromUtc = validUtc(params.get('checkedOutFromUtc'))
  const checkedOutToUtc = validUtc(params.get('checkedOutToUtc'))
  const inOrder = !checkedInFromUtc || !checkedInToUtc || Date.parse(checkedInFromUtc) <= Date.parse(checkedInToUtc)
  const outOrder = !checkedOutFromUtc || !checkedOutToUtc || Date.parse(checkedOutFromUtc) <= Date.parse(checkedOutToUtc)
  const rawActor = params.get('actorUserId') || ''

  return {
    page,
    pageSize,
    search: (params.get('search') || '').trim().slice(0, 200),
    participantType,
    eventPackageId: guidPattern.test(rawPackage) ? rawPackage.toLowerCase() : '',
    sort,
    direction: (params.get('direction') || '').toLowerCase() === 'asc' ? 'asc' : 'desc',
    status,
    method,
    actorUserId: guidPattern.test(rawActor) ? rawActor.toLowerCase() : undefined,
    checkedInFromUtc: inOrder ? checkedInFromUtc : undefined,
    checkedInToUtc: inOrder ? checkedInToUtc : undefined,
    checkedOutFromUtc: outOrder ? checkedOutFromUtc : undefined,
    checkedOutToUtc: outOrder ? checkedOutToUtc : undefined
  }
}

export const toAttendanceRecordsFilters = (filters: AttendancePageFilters): AttendanceRecordsFilters => ({
  ...filters,
  status: filters.status || undefined,
  method: filters.method || undefined
})

export const buildAttendancePageQuery = (filters: AttendancePageFilters): URLSearchParams =>
  buildAttendanceRecordsQuery(toAttendanceRecordsFilters(filters))
