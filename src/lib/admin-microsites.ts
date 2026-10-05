import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'

export type MicrositeListItem = {
  id: string
  eventId: string
  eventName: string
  eventSlug: string
  subdomain: string
  templateKey: string
  draftVersionNumber: number
  publishedVersionNumber: number | null
  lastPublishedAtUtc: string | null
  updatedAtUtc: string
}

export type MicrositeSection = {
  id: string
  type: string
  name: string
  visible: boolean
  sortOrder: number
  dataSource?: string | null
  elements: unknown[]
}

export type MicrositeAdminDetail = {
  id: string
  eventId: string
  subdomain: string
  templateKey: string
  draftVersionNumber: number
  publishedVersionNumber: number | null
  lastPublishedAtUtc: string | null
  draft: {
    theme: Record<string, unknown>
    sections: MicrositeSection[]
  }
  updatedAtUtc: string
}

const ensureOk = async (response: Response, fallback: string) => {
  if (response.status === 403) throw new Error('You are not authorized to access MicroSite.')
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

export async function listAdminMicrosites(): Promise<MicrositeListItem[]> {
  const response = await authFetch('/admin/microsites', { cache: 'no-store' })
  await ensureOk(response, 'Unable to load MicroSites.')

  const payload = (await response.json()) as MicrositeListItem[]

  return Array.isArray(payload) ? payload : []
}

export async function getAdminMicrosite(eventId: string): Promise<MicrositeAdminDetail> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/microsite`,
    { cache: 'no-store' }
  )

  await ensureOk(response, 'Unable to load this MicroSite.')

  return (await response.json()) as MicrositeAdminDetail
}
