import { accessApiFetch } from '@/lib/access-api-fetch'
import { parseError } from '@/lib/api'
import { getApiBaseUrl } from '@/lib/api-base-url'
import { authFetch } from '@/lib/auth'

export type MicrositeTheme = {
  fontFamily: string
  headingFontFamily: string
  baseFontSize: number
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  buttonRadius: number
  containerWidth: number
}

export type MicrositeSectionStyle = {
  backgroundColor?: string | null
  backgroundImageUrl?: string | null
  textColor?: string | null
  paddingTop: number
  paddingBottom: number
  paddingX: number
  contentGap: number
  minHeight: number
  mediaWidthPercent: number
  mediaRadius: number
  backgroundOverlayOpacity: number
  backgroundSize: 'cover' | 'contain' | 'auto' | string
  backgroundPosition: 'center' | 'top' | 'bottom' | 'left' | 'right' | string
  contentAlign: 'left' | 'center' | 'right' | string
  layoutPreset: 'stacked' | 'media-left' | 'media-right' | 'centered' | string
}

export type MicrositeElementStyle = {
  fontFamily?: string | null
  fontSize?: number | null
  fontWeight?: number | null
  lineHeight?: number | null
  letterSpacing?: number | null
  textAlign?: 'left' | 'center' | 'right' | 'justify' | null | string
  textColor?: string | null
  backgroundColor?: string | null
  borderRadius?: number | null
  widthPercent?: number | null
  paddingY?: number | null
  paddingX?: number | null
  marginTop?: number | null
  marginBottom?: number | null
}

export type MicrositeElement = {
  id: string
  type: string
  content?: string | null
  assetUrl?: string | null
  altText?: string | null
  actionType?: string | null
  actionValue?: string | null
  style: MicrositeElementStyle
}

export type MicrositeSection = {
  id: string
  type: string
  name: string
  visible: boolean
  sortOrder: number
  dataSource?: string | null
  style: MicrositeSectionStyle
  elements: MicrositeElement[]
}

export type MicrositeDocument = {
  theme: MicrositeTheme
  sections: MicrositeSection[]
}

export type MicrositeTemplate = {
  id: string
  key: string
  name: string
  category: string
  description: string
  tags: string[]
  version: number
  isActive: boolean
  defaultDocument: MicrositeDocument
}

export type MicrositeSectionFieldDefinition = {
  key: string
  group: 'content' | 'appearance' | 'settings' | string
  label: string
  target: string
  inputType: 'text' | 'textarea' | 'url' | 'color' | 'select' | 'toggle' | 'number' | string
  required: boolean
  maxLength: number | null
  options: string[]
}

export type MicrositeSectionRegistryItem = {
  type: string
  label: string
  description: string
  allowedDataSources: string[]
  allowedElementTypes: string[]
  supportsVisibility: boolean
  supportsReorder: boolean
  fields: MicrositeSectionFieldDefinition[]
}

export type MicrositeTemplateCatalog = {
  templates: MicrositeTemplate[]
  allowedFonts: string[]
  allowedSectionTypes: string[]
  allowedElementTypes: string[]
  allowedDataSources: string[]
  sectionRegistry: MicrositeSectionRegistryItem[]
}

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

export type MicrositeAdminDetail = {
  id: string
  eventId: string
  subdomain: string
  templateKey: string
  draftVersionNumber: number
  publishedVersionNumber: number | null
  lastPublishedAtUtc: string | null
  draft: MicrositeDocument
  updatedAtUtc: string
}

export type MicrositePreview = {
  eventId: string
  eventSlug: string
  eventName: string
  subdomain: string
  draftVersionNumber: number
  templateKey: string
  document: MicrositeDocument
  dataBindings: Record<string, unknown>
  generatedAtUtc: string
}

export type MicrositeSubdomainAvailability = {
  subdomain: string
  available: boolean
  reason: string | null
}

export type MicrositeAssetUpload = {
  url: string
  contentType: string
  sizeBytes: number
}

export type MicrositeVersionListItem = {
  versionNumber: number
  templateKey: string
  schemaVersion: number
  createdByUserId: string | null
  restoredFromVersionNumber: number | null
  createdAtUtc: string
  publishedAtUtc: string | null
}

export type MicrositeVersionHistory = {
  items: MicrositeVersionListItem[]
  page: number
  pageSize: number
  total: number
}

export type PublicMicrosite = {
  eventId: string
  eventSlug: string
  eventName: string
  canonicalSubdomain: string
  resolvedFromAlias: boolean
  publishedVersionNumber: number
  templateKey: string
  document: MicrositeDocument
  dataBindings: Record<string, unknown>
  publishedAtUtc: string | null
}

export type CreateMicrositeRequest = {
  templateKey: string
  subdomain?: string | null
}

export type SaveMicrositeDraftRequest = {
  expectedDraftVersionNumber: number
  document: MicrositeDocument
}

export type ChangeMicrositeTemplateRequest = {
  expectedDraftVersionNumber: number
  templateKey: string
  mode: 'reset' | 'keep-content'
}

export type ChangeMicrositeSubdomainRequest = {
  subdomain: string
}

export type PublishMicrositeRequest = {
  expectedDraftVersionNumber: number
}

export type RestoreMicrositeVersionRequest = {
  expectedDraftVersionNumber: number
}

const eventRoot = (eventId: string) =>
  `/admin/events/${encodeURIComponent(eventId)}/microsite`

export const micrositeApiRoutes = {
  list: '/admin/microsites',
  templates: '/admin/microsites/templates',
  detail: (eventId: string) => eventRoot(eventId),
  delete: (eventId: string, expectedDraftVersionNumber: number) =>
    `${eventRoot(eventId)}?expectedDraftVersionNumber=${expectedDraftVersionNumber}`,
  preview: (eventId: string) => `${eventRoot(eventId)}/preview`,
  assets: (eventId: string) => `${eventRoot(eventId)}/assets`,
  eventCatalog: (eventId: string) => `${eventRoot(eventId)}/catalog`,
  draftContent: (eventId: string) => `${eventRoot(eventId)}/draft/content`,
  draftLayout: (eventId: string) => `${eventRoot(eventId)}/draft/layout`,
  subdomainAvailability: (eventId: string, value: string) =>
    `${eventRoot(eventId)}/subdomain-availability?value=${encodeURIComponent(value)}`,
  template: (eventId: string) => `${eventRoot(eventId)}/template`,
  subdomain: (eventId: string) => `${eventRoot(eventId)}/subdomain`,
  publish: (eventId: string) => `${eventRoot(eventId)}/publish`,
  history: (eventId: string, page = 1, pageSize = 20) =>
    `${eventRoot(eventId)}/history?page=${page}&pageSize=${pageSize}`,
  restore: (eventId: string, versionNumber: number) =>
    `${eventRoot(eventId)}/history/${versionNumber}/restore`,
  public: (subdomain: string) => `/public/microsites/${encodeURIComponent(subdomain)}`,
  publicByEvent: (eventSlug: string) =>
    `/public/microsites/event/${encodeURIComponent(eventSlug)}`
} as const

const ensureOk = async (response: Response, fallback: string) => {
  if (response.status === 403) throw new Error('You are not authorized to access MicroSite.')
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

const jsonHeaders = { 'Content-Type': 'application/json' }

export async function listAdminMicrosites(): Promise<MicrositeListItem[]> {
  const response = await authFetch(micrositeApiRoutes.list, { cache: 'no-store' })
  await ensureOk(response, 'Unable to load MicroSites.')

  const payload = (await response.json()) as MicrositeListItem[]

  return Array.isArray(payload) ? payload : []
}

export async function getMicrositeTemplateCatalog(): Promise<MicrositeTemplateCatalog> {
  const response = await authFetch(micrositeApiRoutes.templates, { cache: 'no-store' })
  await ensureOk(response, 'Unable to load MicroSite templates.')

  return (await response.json()) as MicrositeTemplateCatalog
}

export async function getEventMicrositeCatalog(eventId: string): Promise<MicrositeTemplateCatalog> {
  const response = await authFetch(micrositeApiRoutes.eventCatalog(eventId), { cache: 'no-store' })
  await ensureOk(response, 'Unable to load MicroSite template options.')

  return (await response.json()) as MicrositeTemplateCatalog
}

export async function getAdminMicrosite(eventId: string): Promise<MicrositeAdminDetail> {
  const response = await authFetch(micrositeApiRoutes.detail(eventId), { cache: 'no-store' })
  await ensureOk(response, 'Unable to load this MicroSite.')

  return (await response.json()) as MicrositeAdminDetail
}

export async function getMicrositePreview(eventId: string): Promise<MicrositePreview> {
  const response = await authFetch(micrositeApiRoutes.preview(eventId), { cache: 'no-store' })
  await ensureOk(response, 'Unable to load MicroSite preview.')

  return (await response.json()) as MicrositePreview
}

export async function uploadMicrositeAsset(eventId: string, file: File): Promise<MicrositeAssetUpload> {
  const form = new FormData()
  form.append('file', file)

  const response = await authFetch(micrositeApiRoutes.assets(eventId), {
    method: 'POST',
    body: form
  })

  await ensureOk(response, 'Unable to upload MicroSite image.')

  return (await response.json()) as MicrositeAssetUpload
}

export async function checkMicrositeSubdomainAvailability(
  eventId: string,
  value: string
): Promise<MicrositeSubdomainAvailability> {
  const response = await authFetch(
    micrositeApiRoutes.subdomainAvailability(eventId, value),
    { cache: 'no-store' }
  )

  await ensureOk(response, 'Unable to check MicroSite slug availability.')

  return (await response.json()) as MicrositeSubdomainAvailability
}

export async function createAdminMicrosite(
  eventId: string,
  request: CreateMicrositeRequest
): Promise<MicrositeAdminDetail> {
  const response = await authFetch(micrositeApiRoutes.detail(eventId), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(request)
  })

  await ensureOk(response, 'Unable to create MicroSite.')

  return (await response.json()) as MicrositeAdminDetail
}

export async function deleteAdminMicrosite(
  eventId: string,
  expectedDraftVersionNumber: number
): Promise<void> {
  const response = await authFetch(
    micrositeApiRoutes.delete(eventId, expectedDraftVersionNumber),
    { method: 'DELETE' }
  )

  await ensureOk(response, 'Unable to delete MicroSite.')
}

export async function saveMicrositeContent(
  eventId: string,
  request: SaveMicrositeDraftRequest
): Promise<MicrositeAdminDetail> {
  const response = await authFetch(micrositeApiRoutes.draftContent(eventId), {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(request)
  })

  await ensureOk(response, 'Unable to save MicroSite content.')

  return (await response.json()) as MicrositeAdminDetail
}

export async function saveMicrositeLayout(
  eventId: string,
  request: SaveMicrositeDraftRequest
): Promise<MicrositeAdminDetail> {
  const response = await authFetch(micrositeApiRoutes.draftLayout(eventId), {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(request)
  })

  await ensureOk(response, 'Unable to save MicroSite layout.')

  return (await response.json()) as MicrositeAdminDetail
}

export async function changeMicrositeTemplate(
  eventId: string,
  request: ChangeMicrositeTemplateRequest
): Promise<MicrositeAdminDetail> {
  const response = await authFetch(micrositeApiRoutes.template(eventId), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(request)
  })

  await ensureOk(response, 'Unable to change MicroSite template.')

  return (await response.json()) as MicrositeAdminDetail
}

export async function changeMicrositeSubdomain(
  eventId: string,
  request: ChangeMicrositeSubdomainRequest
): Promise<MicrositeAdminDetail> {
  const response = await authFetch(micrositeApiRoutes.subdomain(eventId), {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(request)
  })

  await ensureOk(response, 'Unable to change MicroSite slug.')

  return (await response.json()) as MicrositeAdminDetail
}

export async function publishAdminMicrosite(
  eventId: string,
  request: PublishMicrositeRequest
): Promise<MicrositeAdminDetail> {
  const response = await authFetch(micrositeApiRoutes.publish(eventId), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(request)
  })

  await ensureOk(response, 'Unable to publish MicroSite.')

  return (await response.json()) as MicrositeAdminDetail
}

export async function getMicrositeHistory(
  eventId: string,
  page = 1,
  pageSize = 20
): Promise<MicrositeVersionHistory> {
  const response = await authFetch(
    micrositeApiRoutes.history(eventId, page, pageSize),
    { cache: 'no-store' }
  )

  await ensureOk(response, 'Unable to load MicroSite history.')

  return (await response.json()) as MicrositeVersionHistory
}

export async function restoreMicrositeVersion(
  eventId: string,
  versionNumber: number,
  request: RestoreMicrositeVersionRequest
): Promise<MicrositeAdminDetail> {
  const response = await authFetch(micrositeApiRoutes.restore(eventId, versionNumber), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(request)
  })

  await ensureOk(response, 'Unable to restore MicroSite version.')

  return (await response.json()) as MicrositeAdminDetail
}

export async function getPublicMicrosite(subdomain: string): Promise<PublicMicrosite> {
  const response = await accessApiFetch(
    `${getApiBaseUrl()}${micrositeApiRoutes.public(subdomain)}`,
    { cache: 'no-store' }
  )

  if (!response.ok) {
    throw new Error(await parseError(response, 'Unable to load public MicroSite.'))
  }

  return (await response.json()) as PublicMicrosite
}

export async function getPublicMicrositeByEventSlug(
  eventSlug: string
): Promise<PublicMicrosite> {
  const response = await accessApiFetch(
    `${getApiBaseUrl()}${micrositeApiRoutes.publicByEvent(eventSlug)}`,
    { cache: 'no-store' }
  )

  if (!response.ok) {
    throw new Error(await parseError(response, 'MicroSite untuk event ini belum tersedia.'))
  }

  return (await response.json()) as PublicMicrosite
}
