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

const sanitizeHref = (href: string) => {
  const value = href.trim()

  if (!value) return null
  if (value.startsWith('#')) return value

  try {
    const parsed = new URL(value, 'https://legal.invalid')
    const protocol = parsed.protocol.toLowerCase()

    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(protocol)) return null

    if (parsed.origin === 'https://legal.invalid' && !value.startsWith('/')) return null

    return value
  } catch {
    return null
  }
}

const normalizeStyle = (element: Element) => {
  const styles: string[] = []
  const rawAlignment = (
    element.getAttribute('align') ??
    element.getAttribute('style')?.match(/text-align\s*:\s*([^;]+)/i)?.[1] ??
    ''
  )
    .trim()
    .toLowerCase()

  if (SAFE_ALIGNMENTS.has(rawAlignment)) {
    styles.push(`text-align: ${rawAlignment}`)
  }

  const rawFontSize = (
    element.tagName.toLowerCase() === 'font'
      ? element.getAttribute('size') ?? ''
      : element.getAttribute('style')?.match(/font-size\s*:\s*([^;]+)/i)?.[1] ?? ''
  )
    .trim()
    .toLowerCase()

  const fontSize = FONT_SIZE_MAP[rawFontSize] ?? rawFontSize

  if (SAFE_FONT_SIZES.has(fontSize)) {
    styles.push(`font-size: ${fontSize}`)
  }

  return styles.length ? styles.join('; ') : null
}

const sanitizeElement = (element: Element): string => {
  const originalTag = element.tagName.toLowerCase()
  const tag = originalTag === 'font' ? 'span' : originalTag
  const children = Array.from(element.childNodes).map(sanitizeNode).join('')

  if (!ALLOWED_TAGS.has(tag)) return children

  const attributes: string[] = []
  const style = normalizeStyle(element)

  if (style) attributes.push(`style="${escapeHtml(style)}"`)

  if (tag === 'a') {
    const href = sanitizeHref(element.getAttribute('href') ?? '')

    if (!href) return children

    attributes.push(`href="${escapeHtml(href)}"`)

    const target = element.getAttribute('target')

    if (target === '_blank') {
      attributes.push('target="_blank"')
      attributes.push('rel="noopener noreferrer"')
    }
  }

  if (tag === 'br') return '<br>'

  return `<${tag}${attributes.length ? ` ${attributes.join(' ')}` : ''}>${children}</${tag}>`
}

const sanitizeNode = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? '')
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  return sanitizeElement(node as Element)
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

  if (typeof DOMParser === 'undefined' || typeof Node === 'undefined') {
    return looksLikeRichHtml(source)
      ? escapeHtml(source)
      : plainTextToHtml(source)
  }

  const documentValue = new DOMParser().parseFromString(
    `<div data-legal-root="1">${source}</div>`,
    'text/html'
  )
  const root = documentValue.querySelector('[data-legal-root="1"]')

  if (!root) return ''

  return Array.from(root.childNodes).map(sanitizeNode).join('').trim()
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

export const getLegalTextContent = (html: string) => {
  const sanitized = sanitizeLegalHtml(html)

  if (!sanitized) return ''

  if (typeof DOMParser === 'undefined') {
    return sanitized
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const documentValue = new DOMParser().parseFromString(sanitized, 'text/html')
  return (documentValue.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export const canonicalizeLegalContent = (content: string) =>
  sanitizeLegalHtml(normalizeLegalContentForEditor(content))
