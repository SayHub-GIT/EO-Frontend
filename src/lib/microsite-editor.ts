import type {
  MicrositeElement,
  MicrositeSection,
  MicrositeSectionFieldDefinition
} from '@/lib/admin-microsites'

export type MicrositeFieldValue = string | number | boolean

const htmlLikePattern = /<\s*\/?\s*[A-Za-z][^>]*>/
const unsafeControlPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/

const findElement = (section: MicrositeSection, elementId: string) =>
  section.elements.find(element => element.id === elementId)

export const readMicrositeFieldValue = (
  section: MicrositeSection,
  target: string
): MicrositeFieldValue => {
  if (target === 'section.name') return section.name
  if (target === 'section.visible') return section.visible
  if (target === 'section.dataSource') return section.dataSource ?? ''

  if (target.startsWith('section.style.')) {
    const key = target.slice('section.style.'.length)

    switch (key) {
      case 'backgroundColor':
        return section.style.backgroundColor ?? ''
      case 'backgroundImageUrl':
        return section.style.backgroundImageUrl ?? ''
      case 'textColor':
        return section.style.textColor ?? ''
      case 'paddingTop':
        return section.style.paddingTop
      case 'paddingBottom':
        return section.style.paddingBottom
      case 'contentAlign':
        return section.style.contentAlign
      case 'layoutPreset':
        return section.style.layoutPreset
      default:
        return ''
    }
  }

  const match = /^element:([^.]+)\.(.+)$/.exec(target)
  if (!match) return ''

  const element = findElement(section, match[1])
  if (!element) return ''

  switch (match[2]) {
    case 'content':
      return element.content ?? ''
    case 'assetUrl':
      return element.assetUrl ?? ''
    case 'altText':
      return element.altText ?? ''
    case 'actionType':
      return element.actionType ?? 'none'
    case 'actionValue':
      return element.actionValue ?? ''
    case 'style.fontFamily':
      return element.style.fontFamily ?? ''
    case 'style.fontSize':
      return element.style.fontSize ?? ''
    case 'style.fontWeight':
      return element.style.fontWeight ?? ''
    case 'style.lineHeight':
      return element.style.lineHeight ?? ''
    case 'style.letterSpacing':
      return element.style.letterSpacing ?? ''
    case 'style.textAlign':
      return element.style.textAlign ?? ''
    case 'style.textColor':
      return element.style.textColor ?? ''
    case 'style.backgroundColor':
      return element.style.backgroundColor ?? ''
    case 'style.borderRadius':
      return element.style.borderRadius ?? ''
    case 'style.widthPercent':
      return element.style.widthPercent ?? ''
    case 'style.paddingY':
      return element.style.paddingY ?? ''
    case 'style.paddingX':
      return element.style.paddingX ?? ''
    case 'style.marginTop':
      return element.style.marginTop ?? ''
    case 'style.marginBottom':
      return element.style.marginBottom ?? ''
    default:
      return ''
  }
}

const updateElement = (
  element: MicrositeElement,
  property: string,
  value: MicrositeFieldValue
): MicrositeElement => {
  switch (property) {
    case 'content':
      return { ...element, content: String(value) }
    case 'assetUrl':
      return { ...element, assetUrl: String(value) || null }
    case 'altText':
      return { ...element, altText: String(value) || null }
    case 'actionType':
      return { ...element, actionType: String(value) || 'none' }
    case 'actionValue':
      return { ...element, actionValue: String(value) || null }
  }

  if (!property.startsWith('style.')) return element

  const key = property.slice('style.'.length)

  switch (key) {
    case 'fontFamily':
      return { ...element, style: { ...element.style, fontFamily: String(value) || null } }
    case 'fontSize':
      return { ...element, style: { ...element.style, fontSize: Number(value) } }
    case 'fontWeight':
      return { ...element, style: { ...element.style, fontWeight: Number(value) } }
    case 'lineHeight':
      return { ...element, style: { ...element.style, lineHeight: Number(value) } }
    case 'letterSpacing':
      return { ...element, style: { ...element.style, letterSpacing: Number(value) } }
    case 'textAlign':
      return { ...element, style: { ...element.style, textAlign: String(value) || null } }
    case 'textColor':
      return { ...element, style: { ...element.style, textColor: String(value) || null } }
    case 'backgroundColor':
      return { ...element, style: { ...element.style, backgroundColor: String(value) || null } }
    case 'borderRadius':
      return { ...element, style: { ...element.style, borderRadius: Number(value) } }
    case 'widthPercent':
      return { ...element, style: { ...element.style, widthPercent: Number(value) } }
    case 'paddingY':
      return { ...element, style: { ...element.style, paddingY: Number(value) } }
    case 'paddingX':
      return { ...element, style: { ...element.style, paddingX: Number(value) } }
    case 'marginTop':
      return { ...element, style: { ...element.style, marginTop: Number(value) } }
    case 'marginBottom':
      return { ...element, style: { ...element.style, marginBottom: Number(value) } }
    default:
      return element
  }
}

export const writeMicrositeFieldValue = (
  section: MicrositeSection,
  target: string,
  value: MicrositeFieldValue
): MicrositeSection => {
  if (target === 'section.name') {
    return { ...section, name: String(value) }
  }

  if (target === 'section.visible') {
    return { ...section, visible: Boolean(value) }
  }

  if (target === 'section.dataSource') {
    return { ...section, dataSource: String(value) || null }
  }

  if (target.startsWith('section.style.')) {
    const key = target.slice('section.style.'.length)

    switch (key) {
      case 'backgroundColor':
        return {
          ...section,
          style: { ...section.style, backgroundColor: String(value) || null }
        }
      case 'backgroundImageUrl':
        return {
          ...section,
          style: { ...section.style, backgroundImageUrl: String(value) || null }
        }
      case 'textColor':
        return {
          ...section,
          style: { ...section.style, textColor: String(value) || null }
        }
      case 'paddingTop':
        return {
          ...section,
          style: { ...section.style, paddingTop: Number(value) }
        }
      case 'paddingBottom':
        return {
          ...section,
          style: { ...section.style, paddingBottom: Number(value) }
        }
      case 'contentAlign':
        return {
          ...section,
          style: { ...section.style, contentAlign: String(value) }
        }
      case 'layoutPreset':
        return {
          ...section,
          style: { ...section.style, layoutPreset: String(value) }
        }
      default:
        return section
    }
  }

  const match = /^element:([^.]+)\.(.+)$/.exec(target)
  if (!match) return section

  const [elementId, property] = [match[1], match[2]]

  return {
    ...section,
    elements: section.elements.map(element =>
      element.id === elementId
        ? updateElement(element, property, value)
        : element
    )
  }
}

export const validateMicrositeField = (
  field: MicrositeSectionFieldDefinition,
  value: MicrositeFieldValue
) => {
  const text = typeof value === 'string' ? value.trim() : String(value)

  if (field.required && text.length === 0) {
    return `${field.label} is required.`
  }

  if (field.maxLength && typeof value === 'string' && value.length > field.maxLength) {
    return `${field.label} cannot exceed ${field.maxLength} characters.`
  }

  if (typeof value === 'string' && text.length > 0) {
    if (htmlLikePattern.test(value) || unsafeControlPattern.test(value)) {
      return `${field.label} must use plain text without HTML or control characters.`
    }

    if (field.target.endsWith('.actionValue')) {
      const normalized = text.toLowerCase()

      if (
        normalized.startsWith('javascript:') ||
        normalized.startsWith('data:') ||
        text.startsWith('//') ||
        text.includes('\\')
      ) {
        return `${field.label} contains an unsafe action target.`
      }
    }
  }

  if (field.inputType === 'url' && text.length > 0) {
    try {
      const url = new URL(text)

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return `${field.label} must use an HTTP(S) URL.`
      }
    } catch {
      return `${field.label} must be a valid absolute URL.`
    }
  }

  return null
}
