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

export const sanitizeLegalHtml = (html: string) => {
  const source = html.trim()

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
  const source = content.trim()

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
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()

export const canonicalizeLegalContent = (content: string) =>
  sanitizeLegalHtml(normalizeLegalContentForEditor(content))
