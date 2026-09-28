import { parseError } from '@/lib/api'
import { accessApiFetch } from '@/lib/access-api-fetch'
import { authFetch } from '@/lib/auth'
import { getApiBaseUrl } from '@/lib/api-base-url'

export type SitePageKey = 'home' | 'event' | 'registration' | 'about'
export type SiteSectionType = 'content' | 'hero' | 'cta' | 'image' | 'spacer'
export type SiteSectionLayout = 'stack' | 'split' | 'banner' | 'center'
export type SiteSectionPlacement = 'before' | 'after'
export type SiteSectionAlign = 'left' | 'center' | 'right'

export type SitePageSection = {
  id: string
  type: SiteSectionType
  enabled: boolean
  sortOrder: number
  layout: SiteSectionLayout
  placement: SiteSectionPlacement
  align: SiteSectionAlign
  eyebrow?: string | null
  title?: string | null
  body?: string | null
  imageUrl?: string | null
  ctaLabel?: string | null
  ctaHref?: string | null
  backgroundColor?: string | null
  textColor?: string | null
  accentColor?: string | null
  paddingY: number
  borderRadius: number
}

export type SitePageDefinition = {
  key: SitePageKey
  enabled: boolean
  showDefaultContent: boolean
  backgroundColor?: string | null
  backgroundImageUrl?: string | null
  maxWidth: number
  sections: SitePageSection[]
}

export type SitePageBuilderConfig = {
  pages: SitePageDefinition[]
  updatedAtUtc?: string | null
}

const ensureOk = async (response: Response, fallback: string) => {
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

export async function getPublicPageBuilder(): Promise<SitePageBuilderConfig> {
  const response = await accessApiFetch(`${getApiBaseUrl()}/site/page-builder`, {
    cache: 'no-store'
  })

  await ensureOk(response, 'Unable to load Page Builder configuration.')
  return response.json()
}

export async function getAdminPageBuilder(): Promise<SitePageBuilderConfig> {
  const response = await authFetch('/admin/settings/page-builder', { cache: 'no-store' })
  await ensureOk(response, 'Unable to load Page Builder settings.')
  return response.json()
}

export async function updateAdminPageBuilder(
  pages: SitePageDefinition[]
): Promise<SitePageBuilderConfig> {
  const response = await authFetch('/admin/settings/page-builder', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pages })
  })

  await ensureOk(response, 'Unable to save Page Builder settings.')
  return response.json()
}

export const getPageDefinition = (
  config: SitePageBuilderConfig | null | undefined,
  key: SitePageKey
) => config?.pages.find(page => page.key === key) ?? null
