import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'

export const EVENT_KINDS = ['Seminar', 'Workshop', 'Running', 'Other'] as const
export const EVENT_STATUSES = ['Draft', 'Published', 'Archived'] as const
export const EVENT_ACCESS_MODES = ['Public', 'InvitationCode', 'EmailDomain'] as const
export const EVENT_ASSET_TYPES = ['logo', 'hero', 'registration'] as const

export type EventKind = (typeof EVENT_KINDS)[number]
export type EventStatus = (typeof EVENT_STATUSES)[number]
export type EventAccessMode = (typeof EVENT_ACCESS_MODES)[number]
export type EventAssetType = (typeof EVENT_ASSET_TYPES)[number]

export type AdminEvent = {
  id: string
  name: string
  slug: string
  kind: EventKind
  status: EventStatus
  description: string | null
  location: string | null
  startAtUtc: string
  endAtUtc: string
  registrationOpenAtUtc: string
  registrationCloseAtUtc: string
  capacity: number
  registeredCount: number
  remainingQuota: number
  price: number
  accessMode: EventAccessMode
  accessValue: string | null
  logoUrl: string | null
  heroImageUrl: string | null
  registrationImageUrl: string | null
  registrationImageTitle: string | null
  venueAddress: string | null
  mapsUrl: string | null
  about: string | null
  benefits: string | null
  additionalInformation: string | null
}

export type EventAttendanceMetrics = {
  eventId: string
  totalParticipants: number
  checkedIn: number
  notCheckedIn: number
  checkedOut: number
  currentlyOnSite: number
  capacity: number
  remainingCapacity: number
}

export type EventUpsertRequest = {
  name: string
  slug?: string | null
  description?: string | null
  location?: string | null
  kind: EventKind
  startAt: string
  endAt: string
  registrationOpenAt: string
  registrationCloseAt: string
  capacity: number
  accessMode: EventAccessMode
  accessValue?: string | null
  registrationImageTitle?: string | null
  venueAddress?: string | null
  mapsUrl?: string | null
  about?: string | null
  benefits?: string | null
  additionalInformation?: string | null
}

export type EventAssetUploadResponse = {
  assetType: EventAssetType
  url: string
}

const ensureOk = async (response: Response, fallback: string) => {
  if (response.status === 403) throw new Error('You are not authorized to manage events.')
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

export async function listAdminEvents(): Promise<AdminEvent[]> {
  const response = await authFetch('/admin/events', { cache: 'no-store' })
  await ensureOk(response, 'Unable to load admin events.')
  const payload = (await response.json()) as AdminEvent[]
  return Array.isArray(payload) ? payload : []
}

export async function getEventAttendanceMetrics(eventId: string): Promise<EventAttendanceMetrics> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/attendance-metrics`,
    { cache: 'no-store' }
  )
  await ensureOk(response, 'Unable to load attendance metrics.')
  return (await response.json()) as EventAttendanceMetrics
}

export async function getAdminEvent(eventId: string): Promise<AdminEvent> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}`, { cache: 'no-store' })
  await ensureOk(response, 'Unable to load event.')
  return (await response.json()) as AdminEvent
}

export async function createAdminEvent(request: EventUpsertRequest): Promise<AdminEvent> {
  const response = await authFetch('/admin/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  await ensureOk(response, 'Unable to create event.')
  return (await response.json()) as AdminEvent
}

export async function updateAdminEvent(eventId: string, request: EventUpsertRequest): Promise<AdminEvent> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  await ensureOk(response, 'Unable to update event.')
  return (await response.json()) as AdminEvent
}

export async function uploadAdminEventAsset(eventId: string, assetType: EventAssetType, file: File): Promise<EventAssetUploadResponse> {
  const form = new FormData()
  form.append('file', file)
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/assets/${encodeURIComponent(assetType)}`, {
    method: 'POST', body: form
  })
  await ensureOk(response, `Unable to upload event ${assetType} image.`)
  return (await response.json()) as EventAssetUploadResponse
}

export async function publishAdminEvent(eventId: string): Promise<AdminEvent> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/publish`, { method: 'POST' })
  await ensureOk(response, 'Unable to publish event.')
  return (await response.json()) as AdminEvent
}

export async function archiveAdminEvent(eventId: string): Promise<void> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' })
  await ensureOk(response, 'Unable to archive event.')
}

export async function unarchiveAdminEvent(eventId: string): Promise<AdminEvent> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/unarchive`, { method: 'POST' })
  await ensureOk(response, 'Unable to unarchive event.')
  return (await response.json()) as AdminEvent
}
