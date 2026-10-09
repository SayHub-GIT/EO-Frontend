import { authFetch } from '@/lib/auth'

export type EventPackage = {
  id: string
  eventId: string
  name: string
  benefits: string | null
  capacity: number | null
  registeredCount: number
  remainingQuota: number | null
  isUnlimited: boolean
  price: number
  sortOrder: number
  isActive: boolean
}

const getString = (record: Record<string, unknown>, ...keys: string[]): string => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

const getNullableString = (record: Record<string, unknown>, ...keys: string[]): string | null => {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string') return value
    if (value === null) return null
  }
  return null
}

type ApiEventPackage = Record<string, unknown>

const normalizeEventPackage = (record: ApiEventPackage): EventPackage => {
  const capacity = typeof record.capacity === 'number' ? record.capacity : typeof record.Capacity === 'number' ? record.Capacity : null
  const remainingQuota =
    typeof record.remainingQuota === 'number'
      ? record.remainingQuota
      : typeof record.RemainingQuota === 'number'
        ? record.RemainingQuota
        : null

  return {
    id: getString(record, 'id', 'Id'),
    eventId: getString(record, 'eventId', 'EventId'),
    name: getString(record, 'name', 'Name'),
    benefits: getNullableString(record, 'benefits', 'Benefits'),
    capacity,
    registeredCount:
      typeof record.registeredCount === 'number'
        ? record.registeredCount
        : typeof record.RegisteredCount === 'number'
          ? record.RegisteredCount
          : 0,
    remainingQuota,
    isUnlimited:
      (typeof record.isUnlimited === 'boolean' ? record.isUnlimited : typeof record.IsUnlimited === 'boolean' ? record.IsUnlimited : false) ||
      capacity === null,
    price: typeof record.price === 'number' ? record.price : typeof record.Price === 'number' ? record.Price : 0,
    sortOrder:
      typeof record.sortOrder === 'number'
        ? record.sortOrder
        : typeof record.SortOrder === 'number'
          ? record.SortOrder
          : 0,
    isActive:
      typeof record.isActive === 'boolean'
        ? record.isActive
        : typeof record.IsActive === 'boolean'
          ? record.IsActive
          : false
  }
}

const ensureOk = async (response: Response, fallback: string) => {
  if (response.status === 403) throw new Error('You are not authorized to import registrations.')
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? body?.title ?? fallback)
  }
}

export async function getEventPackages(eventId: string): Promise<EventPackage[]> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/packages`, {
    method: 'GET',
    cache: 'no-store'
  })

  await ensureOk(response, 'Unable to load event packages.')
  const payload = (await response.json()) as unknown
  return Array.isArray(payload) ? payload.map(item => normalizeEventPackage(item as ApiEventPackage)) : []
}

export async function importInternalRegistrations(eventId: string, file: File, eventPackageId: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('eventPackageId', eventPackageId)

  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/registrations/import-internal`, {
    method: 'POST',
    body: formData,
    cache: 'no-store'
  })

  const body = await response.json().catch(() => null)

  // HTTP 422 is a rejected batch. Preserve structured row errors, but
  // never treat this HTTP response as a successful import.
  if (response.status === 422 && body && typeof body === 'object') {
    return { ...body, success: false }
  }

  if (response.status === 403) throw new Error('You are not authorized to import registrations.')

  if (!response.ok) {
    const detail = body?.detail ?? body?.title ?? 'Unable to import Excel file.'
    if (response.status === 409) throw new Error(`Import ditolak (409): ${detail}`)
    throw new Error(detail)
  }

  return body
}

export async function downloadInternalRegistrationTemplate(eventId: string): Promise<void> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/registrations/internal-template`,
    { method: 'GET', cache: 'no-store' }
  )

  await ensureOk(response, 'Unable to download internal registration Excel template.')

  const blob = await response.blob()
  if (!blob.size) throw new Error('The Excel template returned by the server is empty.')

  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  try {
    link.href = objectUrl
    link.download = `internal-participants-${eventId}.xlsx`
    document.body.appendChild(link)
    link.click()
  } finally {
    link.remove()
    // Let the click event consume the Blob URL before releasing it.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }
}
