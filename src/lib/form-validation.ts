export type FieldErrors<K extends string = string> = Partial<Record<K, string>>

export const hasFieldErrors = <K extends string>(errors: FieldErrors<K>) =>
  Object.values(errors).some(Boolean)

export const requiredText = (value: string, label: string) =>
  value.trim() ? undefined : `${label} is required.`

export const emailAddress = (value: string, label = 'Email') => {
  if (!value.trim()) return `${label} is required.`
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? undefined
    : `${label} must be a valid email address.`
}

type NumericOptions = {
  label: string
  min?: number
  max?: number
  allowEmpty?: boolean
}

export const integerValue = (
  value: string | number,
  { label, min, max, allowEmpty = false }: NumericOptions
) => {
  const text = String(value).trim()
  if (!text) return allowEmpty ? undefined : `${label} is required.`

  const number = Number(text)
  if (!Number.isInteger(number)) return `${label} must be a whole number.`
  if (min !== undefined && number < min) return `${label} must be at least ${min}.`
  if (max !== undefined && number > max) return `${label} must be at most ${max}.`
  return undefined
}

export const numericValue = (
  value: string | number,
  { label, min, max, allowEmpty = false }: NumericOptions
) => {
  const text = String(value).trim()
  if (!text) return allowEmpty ? undefined : `${label} is required.`

  const number = Number(text)
  if (!Number.isFinite(number)) return `${label} must be a valid number.`
  if (min !== undefined && number < min) return `${label} must be at least ${min}.`
  if (max !== undefined && number > max) return `${label} must be at most ${max}.`
  return undefined
}

export const dateTimeValue = (value: string, label: string) => {
  if (!value.trim()) return `${label} is required.`
  return Number.isNaN(new Date(value).getTime())
    ? `${label} must be a valid date and time.`
    : undefined
}

export const httpUrl = (value: string, label: string, allowEmpty = true) => {
  const text = value.trim()
  if (!text) return allowEmpty ? undefined : `${label} is required.`

  try {
    const url = new URL(text)
    if (!['http:', 'https:'].includes(url.protocol)) return `${label} must use HTTP or HTTPS.`
    return undefined
  } catch {
    return `${label} must be a valid URL.`
  }
}

export const mergeHelperText = (error: string | undefined, helper?: string) =>
  error ?? helper
