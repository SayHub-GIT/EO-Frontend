const ALLOWED_TAGS = new Set([
  'p',
  'div',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'span'
])

const FONT_SIZE_MAP: Record<string, string> = {
  '1': '0.75rem',
  '2': '0.875rem',
  '3': '1rem',
  '4': '1.125rem',
  '5': '1.25rem',
  '6': '1.5rem',
  '7': '2rem',
  'xx-small': '0.75rem',
  'x-small': '0.875rem',
  'small': '0.875rem',
  'medium': '1rem',
  'large': '1.125rem',
  'x-large': '1.25rem',
  'xx-large': '1.5rem'
}

const SAFE_FONT_SIZES = new Set([
  '0.75rem',
  '0.875rem',
  '1rem',
  '1.125rem',
  '1.25rem',
  '1.5rem',
  '2rem'
])

const SAFE_ALIGNMENTS = new Set(['left', 'center', 'right', 'justify'])

const SAFE_FONT_FAMILIES = new Map(
  [
    ['arial', 'Arial, sans-serif'],
    ['georgia', 'Georgia, serif'],
    ['times new roman', '"Times New Roman", serif'],
    ['verdana', 'Verdana, sans-serif'],
    ['trebuchet ms', '"Trebuchet MS", sans-serif'],
    ['courier new', '"Courier New", monospace']
  ].map(([key, value]) => [key, value])
)

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

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

const sanitizeHref = (href: string) => {
  const value = decodeAttribute(href).trim()

  if (!value) return null
  if (value.startsWith('#') || value.startsWith('/')) return value

  const protocolMatch = value.match(/^([a-z][a-z0-9+.-]*):/i)

  if (!protocolMatch) return null

  const protocol = protocolMatch[1].toLowerCase()

  return ['http', 'https', 'mailto', 'tel'].includes(protocol) ? value : null
}

const readAttribute = (attributes: string, name: string) => {
  const expression = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+))`,
    'i'
  )
  const match = attributes.match(expression)

  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : null
}

const normalizeCssColor = (value: string) => {
  const normalized = value.trim().toLowerCase()

  if (/^#[0-9a-f]{3,8}$/i.test(normalized)) return normalized
  if (['transparent', 'black', 'white'].includes(normalized)) return normalized

  const rgb = normalized.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/
  )

  if (!rgb) return null

  const channels = rgb.slice(1, 4).map(Number)
  if (channels.some(channel => channel < 0 || channel > 255)) return null

  if (normalized.startsWith('rgba')) {
    const alpha = Number(rgb[4] ?? 1)
    if (alpha < 0 || alpha > 1) return null

    return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`
  }

  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`
}

const normalizeFontFamily = (value: string) => {
  const primary = value
    .split(',')[0]
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .toLowerCase()

  return SAFE_FONT_FAMILIES.get(primary) ?? null
}

const normalizeStyle = (tag: string, attributes: string) => {
  const styles: string[] = []
  const style = readAttribute(attributes, 'style') ?? ''
  const alignAttribute = readAttribute(attributes, 'align') ?? ''
  const rawAlignment = (
    alignAttribute ||
    style.match(/(?:^|;)\s*text-align\s*:\s*([^;]+)/i)?.[1] ||
    ''
  )
    .trim()
    .toLowerCase()

  if (SAFE_ALIGNMENTS.has(rawAlignment)) {
    styles.push(`text-align: ${rawAlignment}`)
  }

  const rawFontSize = (
    tag === 'font'
      ? readAttribute(attributes, 'size') ?? ''
      : style.match(/(?:^|;)\s*font-size\s*:\s*([^;]+)/i)?.[1] ?? ''
  )
    .trim()
    .toLowerCase()

  const fontSize = FONT_SIZE_MAP[rawFontSize] ?? rawFontSize

  if (SAFE_FONT_SIZES.has(fontSize)) {
    styles.push(`font-size: ${fontSize}`)
  }

  const rawTextColor =
    tag === 'font'
      ? readAttribute(attributes, 'color') ?? ''
      : style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)?.[1] ?? ''
  const textColor = normalizeCssColor(rawTextColor)

  if (textColor) styles.push(`color: ${textColor}`)

  const rawBackgroundColor =
    style.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i)?.[1] ?? ''
  const backgroundColor = normalizeCssColor(rawBackgroundColor)

  if (backgroundColor) {
    styles.push(`background-color: ${backgroundColor}`)
  }

  const rawFontFamily =
    tag === 'font'
      ? readAttribute(attributes, 'face') ?? ''
      : style.match(/(?:^|;)\s*font-family\s*:\s*([^;]+)/i)?.[1] ?? ''
  const fontFamily = normalizeFontFamily(rawFontFamily)

  if (fontFamily) styles.push(`font-family: ${fontFamily}`)

  return styles.length ? styles.join('; ') : null
}

const sanitizeTag = (
  fullMatch: string,
  slash: string,
  rawTag: string,
  rawAttributes: string
) => {
  const originalTag = rawTag.toLowerCase()
  const tag = originalTag === 'font' ? 'span' : originalTag

  if (!ALLOWED_TAGS.has(tag)) return ''

  if (slash) return tag === 'br' ? '' : `</${tag}>`
  if (tag === 'br') return '<br>'

  const attributes: string[] = []
  const style = normalizeStyle(originalTag, rawAttributes)

  if (style) attributes.push(`style="${escapeAttribute(style)}"`)

  if (tag === 'a') {
    const href = sanitizeHref(readAttribute(rawAttributes, 'href') ?? '')

    if (!href) return '<a>'

    attributes.push(`href="${escapeAttribute(href)}"`)

    if ((readAttribute(rawAttributes, 'target') ?? '').toLowerCase() === '_blank') {
      attributes.push('target="_blank"')
      attributes.push('rel="noopener noreferrer"')
    }
  }

  return `<${tag}${attributes.length ? ` ${attributes.join(' ')}` : ''}>`
}

const looksLikeRichHtml = (value: string) =>
  /<\/?(?:p|div|br|strong|b|em|i|u|s|h1|h2|h3|ul|ol|li|blockquote|a|span|font)\b/i.test(value)

const plainTextToHtml = (value: string) =>
  value
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(block => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')

const normalizeCommonEntities = (value: string) =>
  value
    .replace(/&amp;nbsp;/gi, '&nbsp;')
    .replace(/&amp;#0*160;/gi, '&#160;')

export const sanitizeLegalHtml = (html: string) => {
  const source = normalizeCommonEntities(html.trim())

  if (!source) return ''

  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<(\/?)\s*([a-z0-9]+)\b([^>]*)>/gi, sanitizeTag)
    .replace(/<[^>]*>/g, '')
    .trim()
}

export const normalizeLegalContentForEditor = (content: string) => {
  const source = normalizeCommonEntities(content.trim())

  if (!source) return '<p><br></p>'

  return sanitizeLegalHtml(
    looksLikeRichHtml(source)
      ? source
      : plainTextToHtml(source)
  ) || '<p><br></p>'
}

export const getLegalTextContent = (html: string) =>
  sanitizeLegalHtml(html)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<\/div\s*>/gi, '\n')
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#0*160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()

export const canonicalizeLegalContent = (content: string) =>
  sanitizeLegalHtml(normalizeLegalContentForEditor(content))
