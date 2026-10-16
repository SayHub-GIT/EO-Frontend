export type AttendanceStatus = 'REGISTERED' | 'CHECK IN' | 'CHECK OUT'

export type AttendanceRecordsFilters = {
  page: number
  pageSize: number
  search?: string
  participantType?: 'Internal' | 'External' | ''
  eventPackageId?: string
  sort?: 'registeredAt' | 'fullName' | 'checkedInAt' | 'checkedOutAt'
  direction?: 'asc' | 'desc'
  status?: 'Registered' | 'CheckedIn' | 'CheckedOut'
  method?: 'QR' | 'Manual'
  actorUserId?: string
  checkedInFromUtc?: string
  checkedInToUtc?: string
  checkedOutFromUtc?: string
  checkedOutToUtc?: string
}

export type AttendanceRecord = {
  registrationId: string
  eventId: string
  bookingCode: string
  fullName: string
  email: string
  participantType: string | number
  eventPackageId: string | null
  eventPackageName: string | null
  registrationStatus: string | number
  attendanceStatus: AttendanceStatus
  checkInMethod: string | number | null
  registeredAtUtc: string
  checkedInAtUtc: string | null
  checkedInByUserId: string | null
  checkedInByName: string | null
  checkedOutAtUtc: string | null
  checkedOutByUserId: string | null
  checkedOutByName: string | null
}

export type AttendanceRecordsPage = {
  items: AttendanceRecord[]
  page: number
  pageSize: number
  total: number
}

const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const utcPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/

const requireText = (row: Record<string, unknown>, key: string): string => {
  const value = row[key]
  if (typeof value !== 'string' || !value.trim()) throw new Error('Data attendance dari server tidak lengkap.')
  return value
}

const nullableText = (row: Record<string, unknown>, key: string): string | null => {
  const value = row[key]
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') throw new Error('Data attendance dari server tidak valid.')
  return value
}

const enumValue = (row: Record<string, unknown>, key: string): string | number => {
  const value = row[key]
  if (typeof value === 'string' || (typeof value === 'number' && Number.isInteger(value))) return value
  throw new Error('Status attendance dari server tidak valid.')
}

const isUtcTimestamp = (value: string): boolean =>
  utcPattern.test(value) && Number.isFinite(Date.parse(value))

export const buildAttendanceRecordsQuery = (filters: AttendanceRecordsFilters): URLSearchParams => {
  if (!Number.isSafeInteger(filters.page) || filters.page < 1 || !Number.isSafeInteger(filters.pageSize) ||
      filters.pageSize < 1 || filters.pageSize > 100) {
    throw new Error('Parameter halaman attendance tidak valid.')
  }

  const sort = filters.sort || 'registeredAt'
  if (!['registeredAt', 'fullName', 'checkedInAt', 'checkedOutAt'].includes(sort)) {
    throw new Error('Urutan attendance tidak didukung server.')
  }

  const direction = filters.direction || 'desc'
  if (direction !== 'asc' && direction !== 'desc') throw new Error('Arah pengurutan tidak valid.')

  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    sort,
    direction
  })

  if (filters.search?.trim()) params.set('search', filters.search.trim().slice(0, 200))
  if (filters.participantType) {
    if (filters.participantType !== 'Internal' && filters.participantType !== 'External') {
      throw new Error('Tipe peserta tidak valid.')
    }
    params.set('participantType', filters.participantType)
  }

  for (const key of ['eventPackageId', 'actorUserId'] as const) {
    const value = filters[key]
    if (!value) continue
    if (!guidPattern.test(value)) throw new Error('Identitas filter attendance tidak valid.')
    params.set(key, value)
  }

  if (filters.status) {
    if (!['Registered', 'CheckedIn', 'CheckedOut'].includes(filters.status)) {
      throw new Error('Status attendance tidak valid.')
    }
    params.set('status', filters.status)
  }

  if (filters.method) {
    if (filters.method !== 'QR' && filters.method !== 'Manual') {
      throw new Error('Metode Check-In tidak valid.')
    }
    params.set('method', filters.method)
  }

  for (const key of ['checkedInFromUtc', 'checkedInToUtc', 'checkedOutFromUtc', 'checkedOutToUtc'] as const) {
    const value = filters[key]
    if (!value) continue
    if (!isUtcTimestamp(value)) throw new Error('Filter waktu harus menggunakan UTC.')
    params.set(key, value)
  }

  for (const [start, end] of [
    [filters.checkedInFromUtc, filters.checkedInToUtc],
    [filters.checkedOutFromUtc, filters.checkedOutToUtc]
  ]) {
    if (start && end && Date.parse(start) > Date.parse(end)) {
      throw new Error('Rentang tanggal attendance terbalik.')
    }
  }

  return params
}

export const normalizeAttendanceRecordsPage = (payload: unknown, expectedEventId: string): AttendanceRecordsPage => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !guidPattern.test(expectedEventId)) {
    throw new Error('Respons daftar attendance tidak valid.')
  }

  const data = payload as Record<string, unknown>
  if (!Array.isArray(data.items) || typeof data.page !== 'number' || !Number.isInteger(data.page) ||
      data.page < 1 || typeof data.pageSize !== 'number' || !Number.isInteger(data.pageSize) ||
      data.pageSize < 1 || typeof data.totalCount !== 'number' ||
      !Number.isInteger(data.totalCount) || data.totalCount < 0) {
    throw new Error('Pagination attendance dari server tidak lengkap.')
  }

  const items = data.items.map((value): AttendanceRecord => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Baris attendance dari server tidak valid.')
    }
    const row = value as Record<string, unknown>
    const eventId = requireText(row, 'eventId')
    if (eventId.toLowerCase() !== expectedEventId.toLowerCase()) {
      throw new Error('Server mengembalikan peserta dari event lain.')
    }

    const attendanceStatus = requireText(row, 'attendanceStatus')
    if (!['REGISTERED', 'CHECK IN', 'CHECK OUT'].includes(attendanceStatus)) {
      throw new Error('Status kehadiran tidak dikenali.')
    }

    const checkInMethod = row.checkInMethod
    if (checkInMethod != null && typeof checkInMethod !== 'string' &&
        !(typeof checkInMethod === 'number' && Number.isInteger(checkInMethod))) {
      throw new Error('Metode kehadiran dari server tidak valid.')
    }

    const registeredAtUtc = requireText(row, 'registeredAtUtc')
    const checkedInAtUtc = nullableText(row, 'checkedInAtUtc')
    const checkedOutAtUtc = nullableText(row, 'checkedOutAtUtc')
    if (![registeredAtUtc, checkedInAtUtc, checkedOutAtUtc].every(value => value === null || isUtcTimestamp(value))) {
      throw new Error('Waktu attendance dari server tidak valid.')
    }

    return {
      registrationId: requireText(row, 'registrationId'),
      eventId,
      bookingCode: requireText(row, 'bookingCode'),
      fullName: requireText(row, 'fullName'),
      email: requireText(row, 'email'),
      participantType: enumValue(row, 'participantType'),
      eventPackageId: nullableText(row, 'eventPackageId'),
      eventPackageName: nullableText(row, 'eventPackageName'),
      registrationStatus: enumValue(row, 'registrationStatus'),
      attendanceStatus: attendanceStatus as AttendanceStatus,
      checkInMethod: checkInMethod == null ? null : checkInMethod,
      registeredAtUtc,
      checkedInAtUtc,
      checkedInByUserId: nullableText(row, 'checkedInByUserId'),
      checkedInByName: nullableText(row, 'checkedInByName'),
      checkedOutAtUtc,
      checkedOutByUserId: nullableText(row, 'checkedOutByUserId'),
      checkedOutByName: nullableText(row, 'checkedOutByName')
    }
  })

  return { items, page: data.page, pageSize: data.pageSize, total: data.totalCount }
}
