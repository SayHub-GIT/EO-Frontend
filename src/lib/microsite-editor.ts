import type {
  MicrositeElement,
  MicrositeSection,
  MicrositeSectionFieldDefinition
} from '@/lib/admin-microsites'

export type MicrositeFieldValue = string | number | boolean

const htmlLikePattern = /<\s*\/?\s*[A-Za-z][^>]*>/
const unsafeControlPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const phonePattern = /^\+?[0-9][0-9 ()-]{5,29}$/
const colorPattern = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/
const anchorPattern = /^#[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/

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
      case 'paddingX':
        return section.style.paddingX
      case 'contentGap':
        return section.style.contentGap
      case 'minHeight':
        return section.style.minHeight
      case 'mediaWidthPercent':
        return section.style.mediaWidthPercent
      case 'mediaRadius':
        return section.style.mediaRadius
      case 'backgroundOverlayOpacity':
        return section.style.backgroundOverlayOpacity
      case 'backgroundSize':
        return section.style.backgroundSize
      case 'backgroundPosition':
        return section.style.backgroundPosition
      case 'contentAlign':
        return section.style.contentAlign
      case 'layoutPreset':
        return section.style.layoutPreset
      case 'agendaLayout':
        return section.style.agendaLayout ?? 'timeline'
      case 'agendaShowLocation':
        return section.style.agendaShowLocation ?? true
      case 'agendaShowDescription':
        return section.style.agendaShowDescription ?? true
      case 'speakerLayout':
        return section.style.speakerLayout ?? 'grid'
      case 'speakerShowPhoto':
        return section.style.speakerShowPhoto ?? true
      case 'speakerShowRole':
        return section.style.speakerShowRole ?? true
      case 'speakerShowCompany':
        return section.style.speakerShowCompany ?? true
      case 'speakerShowBio':
        return section.style.speakerShowBio ?? true
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
      case 'paddingX':
        return {
          ...section,
          style: { ...section.style, paddingX: Number(value) }
        }
      case 'contentGap':
        return {
          ...section,
          style: { ...section.style, contentGap: Number(value) }
        }
      case 'minHeight':
        return {
          ...section,
          style: { ...section.style, minHeight: Number(value) }
        }
      case 'mediaWidthPercent':
        return {
          ...section,
          style: { ...section.style, mediaWidthPercent: Number(value) }
        }
      case 'mediaRadius':
        return {
          ...section,
          style: { ...section.style, mediaRadius: Number(value) }
        }
      case 'backgroundOverlayOpacity':
        return {
          ...section,
          style: { ...section.style, backgroundOverlayOpacity: Number(value) }
        }
      case 'backgroundSize':
        return {
          ...section,
          style: { ...section.style, backgroundSize: String(value) }
        }
      case 'backgroundPosition':
        return {
          ...section,
          style: { ...section.style, backgroundPosition: String(value) }
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
      case 'agendaLayout':
        return {
          ...section,
          style: { ...section.style, agendaLayout: String(value) as 'timeline' | 'cards' }
        }
      case 'agendaShowLocation':
        return {
          ...section,
          style: { ...section.style, agendaShowLocation: Boolean(value) }
        }
      case 'agendaShowDescription':
        return {
          ...section,
          style: { ...section.style, agendaShowDescription: Boolean(value) }
        }
      case 'speakerLayout':
        return {
          ...section,
          style: { ...section.style, speakerLayout: String(value) as 'grid' | 'list' }
        }
      case 'speakerShowPhoto':
        return {
          ...section,
          style: { ...section.style, speakerShowPhoto: Boolean(value) }
        }
      case 'speakerShowRole':
        return {
          ...section,
          style: { ...section.style, speakerShowRole: Boolean(value) }
        }
      case 'speakerShowCompany':
        return {
          ...section,
          style: { ...section.style, speakerShowCompany: Boolean(value) }
        }
      case 'speakerShowBio':
        return {
          ...section,
          style: { ...section.style, speakerShowBio: Boolean(value) }
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

  if (
    field.inputType === 'select' &&
    field.options.length > 0 &&
    !field.options.includes(String(value))
  ) {
    return `${field.label} must use one of the supported options.`
  }

  if (
    field.inputType === 'color' &&
    text.length > 0 &&
    !colorPattern.test(text)
  ) {
    return `${field.label} must use a valid hex color.`
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


const validateHttpUrl = (
  value: string | null | undefined,
  label: string
) => {
  const text = value?.trim() ?? ''

  if (!text) return null

  try {
    const url = new URL(text)

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? null
      : `${label} must use an HTTP(S) URL.`
  } catch {
    return `${label} must be a valid absolute URL.`
  }
}

const validateAction = (
  element: MicrositeElement,
  label: string
) => {
  const type = element.actionType?.trim().toLowerCase() || 'none'
  const value = element.actionValue?.trim() ?? ''

  switch (type) {
    case 'none':
      return null
    case 'registration':
      return value && value !== 'event-registration'
        ? `${label} registration target is invalid.`
        : null
    case 'anchor':
      return anchorPattern.test(value)
        ? null
        : `${label} anchor must use a valid #section-id.`
    case 'internal':
      return value.startsWith('/') &&
        !value.startsWith('//') &&
        !value.includes('\\')
        ? null
        : `${label} internal link must use a safe relative path.`
    case 'external':
      return validateHttpUrl(value, `${label} external link`)
    case 'email':
      return emailPattern.test(value)
        ? null
        : `${label} must contain a valid email address.`
    case 'phone':
      return phonePattern.test(value)
        ? null
        : `${label} must contain a valid phone number.`
    default:
      return `${label} uses an unsupported action type.`
  }
}

export const validateMicrositeSectionSafety = (
  section: MicrositeSection
): string[] => {
  const errors: string[] = []

  const sectionName = section.name.trim()

  if (!sectionName) {
    errors.push('Section name is required.')
  } else if (
    htmlLikePattern.test(sectionName) ||
    unsafeControlPattern.test(sectionName)
  ) {
    errors.push('Section name must use plain text.')
  }

  if (
    section.style.backgroundColor &&
    !colorPattern.test(section.style.backgroundColor)
  ) {
    errors.push('Section background color is invalid.')
  }

  if (
    section.style.textColor &&
    !colorPattern.test(section.style.textColor)
  ) {
    errors.push('Section text color is invalid.')
  }

  const backgroundUrlError = validateHttpUrl(
    section.style.backgroundImageUrl,
    'Section background image'
  )
  if (backgroundUrlError) errors.push(backgroundUrlError)

  if (!['left', 'center', 'right'].includes(section.style.contentAlign)) {
    errors.push('Section content alignment is unsupported.')
  }

  if (
    !['stacked', 'media-left', 'media-right', 'centered'].includes(
      section.style.layoutPreset
    )
  ) {
    errors.push('Section layout preset is unsupported.')
  }

  if (section.type === 'agenda' &&
    !['timeline', 'cards'].includes(section.style.agendaLayout ?? 'timeline')
  ) {
    errors.push('Tampilan agenda tidak didukung.')
  }

  if (section.type === 'speaker' &&
    !['grid', 'list'].includes(section.style.speakerLayout ?? 'grid')
  ) {
    errors.push('Tampilan pembicara tidak didukung.')
  }

  if (section.style.paddingX < 0 || section.style.paddingX > 160) {
    errors.push('Section horizontal spacing must be between 0 and 160.')
  }
  if (section.style.contentGap < 0 || section.style.contentGap > 96) {
    errors.push('Section content gap must be between 0 and 96.')
  }
  if (section.style.minHeight < 0 || section.style.minHeight > 1200) {
    errors.push('Section minimum height must be between 0 and 1200.')
  }
  if (
    section.style.mediaWidthPercent < 25 ||
    section.style.mediaWidthPercent > 75
  ) {
    errors.push('Section media width must be between 25 and 75 percent.')
  }
  if (section.style.mediaRadius < 0 || section.style.mediaRadius > 64) {
    errors.push('Section media radius must be between 0 and 64.')
  }
  if (
    section.style.backgroundOverlayOpacity < 0 ||
    section.style.backgroundOverlayOpacity > 90
  ) {
    errors.push('Section background overlay must be between 0 and 90 percent.')
  }
  if (!['cover', 'contain', 'auto'].includes(section.style.backgroundSize)) {
    errors.push('Section background image size is unsupported.')
  }
  if (
    !['center', 'top', 'bottom', 'left', 'right'].includes(
      section.style.backgroundPosition
    )
  ) {
    errors.push('Section background image position is unsupported.')
  }

  section.elements.forEach((element, index) => {
    const label = `Element ${index + 1}`

    for (const [name, value] of [
      ['content', element.content],
      ['alt text', element.altText]
    ] as const) {
      const text = value?.trim() ?? ''

      if (
        text &&
        (htmlLikePattern.test(text) || unsafeControlPattern.test(text))
      ) {
        errors.push(`${label} ${name} must use plain text.`)
      }
    }

    const assetError = validateHttpUrl(
      element.assetUrl,
      `${label} asset`
    )
    if (assetError) errors.push(assetError)

    if (
      element.style.textColor &&
      !colorPattern.test(element.style.textColor)
    ) {
      errors.push(`${label} text color is invalid.`)
    }

    if (
      element.style.backgroundColor &&
      !colorPattern.test(element.style.backgroundColor)
    ) {
      errors.push(`${label} background color is invalid.`)
    }

    const actionError = validateAction(element, label)
    if (actionError) errors.push(actionError)
  })

  return errors
}

export const validateMicrositeStructuredSection = (
  section: MicrositeSection
): string[] => {
  if (section.type === 'faq') {
    const items = section.elements.filter(element => element.id !== 'faq-title')
    const errors: string[] = []

    if (items.length > 40 || items.length % 2 !== 0) {
      errors.push('FAQ must contain complete question-answer pairs with a maximum of 20 questions.')
      return errors
    }

    for (let index = 0; index < items.length; index += 2) {
      const question = items[index]
      const answer = items[index + 1]
      const number = index / 2 + 1

      if (
        !question?.id.startsWith('faq-question-') ||
        !answer?.id.startsWith('faq-answer-') ||
        question.type !== 'heading' ||
        answer.type !== 'text'
      ) {
        errors.push(`FAQ item ${number} has an invalid structure.`)
        continue
      }

      const questionKey = question.id.slice('faq-question-'.length)
      const answerKey = answer.id.slice('faq-answer-'.length)

      if (!questionKey || questionKey !== answerKey) {
        errors.push(`FAQ item ${number} has mismatched question and answer identifiers.`)
      }

      for (const [label, value] of [
        ['Question', question.content],
        ['Answer', answer.content]
      ] as const) {
        const text = value?.trim() ?? ''

        if (!text) {
          errors.push(`${label} ${number} is required.`)
          continue
        }

        if (htmlLikePattern.test(text) || unsafeControlPattern.test(text)) {
          errors.push(`${label} ${number} must use plain text without HTML or control characters.`)
        }
      }
    }

    return errors
  }

  if (section.type === 'sponsor') {
    const items = section.elements.filter(element => element.id !== 'sponsor-title')
    const errors: string[] = []

    if (items.length > 24) {
      errors.push('Sponsor section cannot contain more than 24 sponsors.')
      return errors
    }

    items.forEach((item, index) => {
      const number = index + 1

      if (!item.id.startsWith('sponsor-item-') || item.type !== 'image') {
        errors.push(`Sponsor ${number} has an invalid structure.`)
      }

      if (!item.assetUrl?.trim()) {
        errors.push(`Sponsor ${number} logo is required.`)
      }

      if (!item.altText?.trim()) {
        errors.push(`Sponsor ${number} name is required.`)
      }

      if (item.actionType !== 'none' && item.actionType !== 'external') {
        errors.push(`Sponsor ${number} uses an unsupported website action.`)
      }

      if (item.actionType === 'external' && !item.actionValue?.trim()) {
        errors.push(`Sponsor ${number} website URL is required when website linking is enabled.`)
      }
    })

    return errors
  }

  if (section.type === 'contact') {
    const items = section.elements.filter(element => element.id !== 'contact-title')
    const errors: string[] = []

    if (items.length > 12) {
      errors.push('Contact section cannot contain more than 12 links.')
      return errors
    }

    items.forEach((item, index) => {
      const number = index + 1
      const label = item.content?.trim() ?? ''
      const value = item.actionValue?.trim() ?? ''

      if (!item.id.startsWith('contact-item-') || item.type !== 'button') {
        errors.push(`Contact ${number} has an invalid structure.`)
      }

      if (!label) {
        errors.push(`Contact ${number} label is required.`)
      } else if (htmlLikePattern.test(label) || unsafeControlPattern.test(label)) {
        errors.push(`Contact ${number} label must use plain text.`)
      }

      if (item.actionType === 'email') {
        if (!emailPattern.test(value)) {
          errors.push(`Contact ${number} must contain a valid email address.`)
        }
        return
      }

      if (item.actionType === 'phone') {
        if (!phonePattern.test(value)) {
          errors.push(`Contact ${number} must contain a valid phone number.`)
        }
        return
      }

      if (item.actionType === 'external') {
        try {
          const url = new URL(value)
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            errors.push(`Contact ${number} website must use HTTP(S).`)
          }
        } catch {
          errors.push(`Contact ${number} must contain a valid website URL.`)
        }
        return
      }

      errors.push(`Contact ${number} uses an unsupported link type.`)
    })

    return errors
  }

  return []
}

