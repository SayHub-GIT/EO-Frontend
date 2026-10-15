export type AttendanceListFilters = {
  page: number
  pageSize: 10 | 20 | 50
  search: string
  participantType: '' | 'Internal' | 'External'
  eventPackageId: string
  sort: 'registeredAt' | 'fullName' | 'bookingCode'
  direction: 'asc' | 'desc'
}

const validGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const parseAttendanceFilters = (params: URLSearchParams): AttendanceListFilters => {
  const rawPage = params.get('page') || ''
  const numericPage = /^\d+$/.test(rawPage) ? Number(rawPage) : 1
  const page = Number.isSafeInteger(numericPage) && numericPage >= 1 && numericPage <= 1000000
    ? numericPage
    : 1
  const rawSize = Number(params.get('pageSize'))
  const pageSize: AttendanceListFilters['pageSize'] =
    rawSize === 10 || rawSize === 50 ? rawSize : 20
  const rawType = (params.get('participantType') || '').toLowerCase()
  const participantType: AttendanceListFilters['participantType'] =
    rawType === 'internal' ? 'Internal' : rawType === 'external' ? 'External' : ''
  const rawPackage = (params.get('eventPackageId') || '').trim()
  const sortParam = params.get('sort')
  const sort: AttendanceListFilters['sort'] =
    sortParam === 'fullName' || sortParam === 'bookingCode' ? sortParam : 'registeredAt'

  return {
    page,
    pageSize,
    search: (params.get('search') || '').trim().slice(0, 200),
    participantType,
    eventPackageId: validGuid.test(rawPackage) ? rawPackage.toLowerCase() : '',
    sort,
    direction: params.get('direction')?.toLowerCase() === 'asc' ? 'asc' : 'desc'
  }
}

export const buildAttendanceQuery = (filters: AttendanceListFilters): URLSearchParams => {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    sort: filters.sort,
    direction: filters.direction
  })

  if (filters.search.trim()) params.set('search', filters.search.trim().slice(0, 200))
  if (filters.participantType) params.set('participantType', filters.participantType)
  if (filters.eventPackageId && validGuid.test(filters.eventPackageId)) {
    params.set('eventPackageId', filters.eventPackageId)
  }

  return params
}
