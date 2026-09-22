import { getApiBaseUrl } from '@/lib/api-base-url'

export type PublicEvent = {
  id: string
  slug: string
  name: string
  description?: string
  type?: string
  startDate?: string
  endDate?: string
  registrationStart?: string
  registrationEnd?: string
  location?: string
  venue?: string
  city?: string
  address?: string
  capacity?: number
  registeredCount?: number
  remainingQuota?: number
  price?: number
  accessMode?: string
  registrationStatus?: string
  published?: boolean
  imageUrl?: string
  logoUrl?: string
  heroImageUrl?: string
  registrationImageUrl?: string
  registrationImageTitle?: string
  venueAddress?: string
  mapsUrl?: string
  about?: string
  benefits?: string
  additionalInformation?: string
}

export type EventPackage = {
  id: string
  eventId: string
  name: string
  benefits?: string | null
  capacity: number | null
  registeredCount: number
  remainingQuota: number | null
  isUnlimited: boolean
  price: number
  sortOrder: number
  isActive: boolean
}

export type LoginResponse = {
  accessToken: string
  expiresAtUtc: string
  userId: string
  fullName: string
  email: string
  role: string
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    throw new Error(await parseError(response, 'Email atau password salah.'))
  }

  return response.json()
}

export function saveSession(session: LoginResponse) {
  window.localStorage.setItem('eo-auth', JSON.stringify(session))
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

const firstString = (record: Record<string, unknown>, ...keys: string[]) => {
  const value = keys.map(key => record[key]).find(item => typeof item === 'string')

  return typeof value === 'string' && value.trim() ? value : undefined
}

const firstNumber = (record: Record<string, unknown>, ...keys: string[]) => {
  const value = keys.map(key => record[key]).find(item => typeof item === 'number')

  return typeof value === 'number' ? value : undefined
}

const normalizeEvent = (value: unknown): PublicEvent | null => {
  const record = asRecord(value)

  if (!record) return null

  const id = firstString(record, 'id', 'eventId', 'Id', 'EventId')
  const slug = firstString(record, 'slug', 'Slug')
  const name = firstString(record, 'name', 'title', 'eventName', 'Name', 'Title')

  if (!id || !slug || !name) return null

  return {
    id,
    slug,
    name,
    description: firstString(record, 'description', 'Description'),
    type: firstString(record, 'type', 'eventType', 'kind', 'Type', 'EventType', 'Kind'),
    startDate: firstString(record, 'startDate', 'startAt', 'startAtUtc', 'StartDate', 'StartAt', 'StartAtUtc'),
    endDate: firstString(record, 'endDate', 'endAt', 'endAtUtc', 'EndDate', 'EndAt', 'EndAtUtc'),
    registrationStart: firstString(
      record,
      'registrationStart',
      'registrationOpenAtUtc',
      'registrationStartDate',
      'RegistrationStart',
      'RegistrationOpenAtUtc'
    ),
    registrationEnd: firstString(
      record,
      'registrationEnd',
      'registrationCloseAtUtc',
      'registrationEndDate',
      'RegistrationEnd',
      'RegistrationCloseAtUtc'
    ),
    location: firstString(record, 'location', 'Location'),
    venue: firstString(record, 'venue', 'Venue'),
    city: firstString(record, 'city', 'City'),
    address: firstString(record, 'address', 'Address'),
    capacity: firstNumber(record, 'capacity', 'Capacity'),
    registeredCount: firstNumber(record, 'registeredCount', 'RegisteredCount'),
    remainingQuota: firstNumber(record, 'remainingQuota', 'remaining', 'RemainingQuota'),
    price: firstNumber(record, 'price', 'Price'),
    accessMode: firstString(record, 'accessMode', 'mode', 'AccessMode'),
    registrationStatus: firstString(record, 'registrationStatus', 'status', 'RegistrationStatus', 'Status'),
    published: typeof record.published === 'boolean' ? record.published : undefined,
    imageUrl: firstString(record, 'imageUrl', 'coverImageUrl', 'ImageUrl', 'CoverImageUrl'),
    logoUrl: firstString(record, 'logoUrl', 'LogoUrl'),
    heroImageUrl: firstString(record, 'heroImageUrl', 'HeroImageUrl'),
    registrationImageUrl: firstString(record, 'registrationImageUrl', 'RegistrationImageUrl'),
    registrationImageTitle: firstString(record, 'registrationImageTitle', 'RegistrationImageTitle'),
    venueAddress: firstString(record, 'venueAddress', 'VenueAddress'),
    mapsUrl: firstString(record, 'mapsUrl', 'MapsUrl'),
    about: firstString(record, 'about', 'About'),
    benefits: firstString(record, 'benefits', 'Benefits'),
    additionalInformation: firstString(record, 'additionalInformation', 'AdditionalInformation')
  }
}

const extractEvents = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload

  const record = asRecord(payload)

  if (!record) return []

  for (const key of ['items', 'data', 'events', 'Items', 'Data', 'Events']) {
    if (Array.isArray(record[key])) return record[key]
  }

  return [payload]
}

export const parseError = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => null)

  return body?.detail ?? body?.message ?? body?.title ?? fallback
}

export async function getPublicEvents(kind?: string): Promise<PublicEvent[]> {
  const query = kind ? `?kind=${encodeURIComponent(kind)}` : ''
  const response = await fetch(`${getApiBaseUrl()}/events${query}`, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(await parseError(response, `Unable to load events (${response.status}).`))
  }

  const payload: unknown = await response.json()

  return extractEvents(payload)
    .map(normalizeEvent)
    .filter((event): event is PublicEvent => event !== null)
}

export async function getPublicEventBySlug(slug: string): Promise<PublicEvent> {
  const response = await fetch(`${getApiBaseUrl()}/events/${encodeURIComponent(slug)}`, {
    cache: 'no-store'
  })

  if (!response.ok) {
    throw new Error(await parseError(response, `Unable to load event (${response.status}).`))
  }

  const event = normalizeEvent(await response.json())

  if (!event) {
    throw new Error('Backend returned an invalid event response.')
  }

  return event
}

export async function getEventPackages(eventId: string): Promise<EventPackage[]> {
  const response = await fetch(`${getApiBaseUrl()}/events/${encodeURIComponent(eventId)}/packages`, {
    cache: 'no-store'
  })

  if (!response.ok) {
    throw new Error(await parseError(response, `Unable to load event packages (${response.status}).`))
  }

  const payload: unknown = await response.json()

  return Array.isArray(payload) ? (payload as EventPackage[]) : []
}
