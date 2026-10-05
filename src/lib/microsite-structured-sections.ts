import type { MicrositeSection } from '@/lib/admin-microsites'

const htmlLikePattern = /<\s*\/?\s*[A-Za-z][^>]*>/
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const phonePattern = /^\+?[0-9][0-9 ()-]{5,29}$/

const validHttpUrl = (value: string) => {
  try {
    const url = new URL(value)

    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const validPlainText = (value: string) =>
  value.trim().length > 0 && !htmlLikePattern.test(value)

export const validateStructuredMicrositeSection = (
  section: MicrositeSection
): string[] => {
  const errors: string[] = []

  if (section.type === 'sponsor') {
    const sponsors = section.elements.filter(element =>
      element.id.startsWith('sponsor-item-')
    )

    if (sponsors.length > 24) {
      errors.push('Sponsors cannot contain more than 24 items.')
    }

    sponsors.forEach((sponsor, index) => {
      if (!validPlainText(sponsor.altText || '')) {
        errors.push(`Sponsor ${index + 1} needs a plain-text name.`)
      }

      if (!sponsor.assetUrl || !validHttpUrl(sponsor.assetUrl)) {
        errors.push(`Sponsor ${index + 1} needs a valid HTTP(S) logo URL.`)
      }

      if (
        sponsor.actionValue &&
        !validHttpUrl(sponsor.actionValue)
      ) {
        errors.push(`Sponsor ${index + 1} website must use HTTP(S).`)
      }
    })
  }

  if (section.type === 'faq') {
    const items = section.elements.filter(
      element => element.id !== 'faq-title'
    )

    if (items.length > 40 || items.length % 2 !== 0) {
      errors.push('FAQ must contain complete pairs and cannot exceed 20 items.')
      return errors
    }

    for (let index = 0; index < items.length; index += 2) {
      const question = items[index]
      const answer = items[index + 1]
      const itemNumber = index / 2 + 1

      if (
        !question.id.startsWith('faq-question-') ||
        !answer.id.startsWith('faq-answer-')
      ) {
        errors.push(`FAQ item ${itemNumber} has an invalid structure.`)
        continue
      }

      const questionKey = question.id.slice('faq-question-'.length)
      const answerKey = answer.id.slice('faq-answer-'.length)

      if (questionKey !== answerKey) {
        errors.push(`FAQ item ${itemNumber} question and answer do not match.`)
      }

      if (!validPlainText(question.content || '')) {
        errors.push(`FAQ item ${itemNumber} needs a plain-text question.`)
      }

      if (!validPlainText(answer.content || '')) {
        errors.push(`FAQ item ${itemNumber} needs a plain-text answer.`)
      }
    }
  }

  if (section.type === 'contact') {
    const contacts = section.elements.filter(element =>
      element.id.startsWith('contact-item-')
    )

    if (contacts.length > 12) {
      errors.push('Contact cannot contain more than 12 links.')
    }

    contacts.forEach((contact, index) => {
      const label = contact.content || ''
      const value = contact.actionValue || ''
      const number = index + 1

      if (!validPlainText(label)) {
        errors.push(`Contact ${number} needs a plain-text label.`)
      }

      if (contact.actionType === 'email') {
        if (!emailPattern.test(value)) {
          errors.push(`Contact ${number} needs a valid email address.`)
        }

        return
      }

      if (contact.actionType === 'phone') {
        if (!phonePattern.test(value)) {
          errors.push(`Contact ${number} needs a valid phone number.`)
        }

        return
      }

      if (contact.actionType === 'external') {
        if (!validHttpUrl(value)) {
          errors.push(`Contact ${number} website must use HTTP(S).`)
        }

        return
      }

      errors.push(`Contact ${number} uses an unsupported link type.`)
    })
  }

  return errors
}
