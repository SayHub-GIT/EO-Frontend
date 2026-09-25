export type EventBenefitItem = {
  id: string
  title: string
  description: string
  icon: string
}

export type EventContentSection = {
  id: string
  title: string
  contentHtml: string
}

const DEFAULT_BENEFIT_ICON = 'tabler-sparkles'
const BENEFIT_FORMAT = 'eo-benefits-v1'
const CONTENT_FORMAT = 'eo-content-v1'

const makeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null

const asString = (value: unknown) => typeof value === 'string' ? value : ''

const splitLegacyLines = (value: string) =>
  value.split(/\r?\n/).map(item => item.trim().replace(/^[-•]\s*/, '')).filter(Boolean)

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const EVENT_RICH_TAGS = new Set([
  'p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a', 'span'
])

const EVENT_RICH_ALIGNMENTS = new Set(['left', 'center', 'right', 'justify'])

const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const decodeAttribute = (value: string) =>
  value
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const readAttribute = (attributes: string, name: string) => {
  const expression = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+))`,
    'i'
  )
  const match = attributes.match(expression)

  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : null
}

const sanitizeEventHref = (href: string) => {
  const value = decodeAttribute(href).trim()

  if (!value) return null
  if (value.startsWith('#') || value.startsWith('/')) return value

  const protocolMatch = value.match(/^([a-z][a-z0-9+.-]*):/i)
  if (!protocolMatch) return null

  return ['http', 'https', 'mailto', 'tel'].includes(protocolMatch[1].toLowerCase())
    ? value
    : null
}

const sanitizeEventRichTag = (
  _match: string,
  closing: string,
  rawTag: string,
  rawAttributes: string
) => {
  const tag = rawTag.toLowerCase()

  if (!EVENT_RICH_TAGS.has(tag)) return ''
  if (closing) return tag === 'br' ? '' : `</${tag}>`
  if (tag === 'br') return '<br>'

  const attributes: string[] = []
  const style = readAttribute(rawAttributes, 'style') ?? ''
  const alignAttribute = readAttribute(rawAttributes, 'align') ?? ''
  const alignment = (
    alignAttribute ||
    style.match(/(?:^|;)\s*text-align\s*:\s*([^;]+)/i)?.[1] ||
    ''
  ).trim().toLowerCase()

  if (EVENT_RICH_ALIGNMENTS.has(alignment)) {
    attributes.push(`style="text-align: ${alignment}"`)
  }

  if (tag === 'a') {
    const href = sanitizeEventHref(readAttribute(rawAttributes, 'href') ?? '')

    if (href) {
      attributes.push(`href="${escapeAttribute(href)}"`)

      if ((readAttribute(rawAttributes, 'target') ?? '').toLowerCase() === '_blank') {
        attributes.push('target="_blank"')
        attributes.push('rel="noopener noreferrer"')
      }
    }
  }

  return `<${tag}${attributes.length ? ` ${attributes.join(' ')}` : ''}>`
}

export const sanitizeRichHtml = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<(\/?)\s*([a-z0-9]+)\b([^>]*)>/gi, sanitizeEventRichTag)

export const parseEventBenefits = (value?: string | null): EventBenefitItem[] => {
  const raw = value?.trim() ?? ''
  if (!raw) return []

  try {
    const parsed = asRecord(JSON.parse(raw))
    const items = parsed?.format === BENEFIT_FORMAT && Array.isArray(parsed.items) ? parsed.items : null

    if (items) {
      return items
        .map(item => asRecord(item))
        .filter((item): item is Record<string, unknown> => item !== null)
        .map(item => ({
          id: asString(item.id) || makeId(),
          title: asString(item.title),
          description: asString(item.description),
          icon: /^tabler-[a-z0-9-]+$/i.test(asString(item.icon)) ? asString(item.icon) : DEFAULT_BENEFIT_ICON
        }))
    }
  } catch {
    // Legacy plain text is intentionally supported below.
  }

  return splitLegacyLines(raw).map(title => ({
    id: makeId(),
    title,
    description: '',
    icon: DEFAULT_BENEFIT_ICON
  }))
}

export const serializeEventBenefits = (items: EventBenefitItem[]) => {
  const normalized = items.map(item => ({
    id: item.id || makeId(),
    title: item.title.slice(0, 120),
    description: item.description.slice(0, 280),
    icon: /^tabler-[a-z0-9-]+$/i.test(item.icon) ? item.icon : DEFAULT_BENEFIT_ICON
  }))

  return normalized.length ? JSON.stringify({ format: BENEFIT_FORMAT, items: normalized }) : ''
}

export const parseEventContentSections = (value?: string | null): EventContentSection[] => {
  const raw = value?.trim() ?? ''
  if (!raw) return []

  try {
    const parsed = asRecord(JSON.parse(raw))
    const sections = parsed?.format === CONTENT_FORMAT && Array.isArray(parsed.sections) ? parsed.sections : null

    if (sections) {
      return sections
        .map(section => asRecord(section))
        .filter((section): section is Record<string, unknown> => section !== null)
        .map(section => ({
          id: asString(section.id) || makeId(),
          title: asString(section.title),
          contentHtml: sanitizeRichHtml(asString(section.contentHtml))
        }))
    }
  } catch {
    // Legacy plain text is intentionally supported below.
  }

  return [{
    id: makeId(),
    title: 'Additional Information',
    contentHtml: `<p>${escapeHtml(raw).replace(/\r?\n/g, '<br>')}</p>`
  }]
}

export const serializeEventContentSections = (sections: EventContentSection[]) => {
  const normalized = sections.map(section => ({
    id: section.id || makeId(),
    title: section.title.slice(0, 160),
    contentHtml: sanitizeRichHtml(section.contentHtml)
  }))

  return normalized.length ? JSON.stringify({ format: CONTENT_FORMAT, sections: normalized }) : ''
}

export const createBenefitItem = (): EventBenefitItem => ({
  id: makeId(),
  title: '',
  description: '',
  icon: DEFAULT_BENEFIT_ICON
})

export const createContentSection = (): EventContentSection => ({
  id: makeId(),
  title: '',
  contentHtml: '<p><br></p>'
})
