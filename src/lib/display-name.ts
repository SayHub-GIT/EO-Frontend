export const MAX_DISPLAY_NAME_WORDS = 5

export const displayNameWords = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean)

export const displayNameError = (value: string) => {
  const words = displayNameWords(value)

  if (words.length === 0) {
    return 'Display name is required.'
  }

  if (words.length > MAX_DISPLAY_NAME_WORDS) {
    return `Display name can contain at most ${MAX_DISPLAY_NAME_WORDS} words.`
  }

  return ''
}
