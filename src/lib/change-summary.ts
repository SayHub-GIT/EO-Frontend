export type ChangeKind = 'added' | 'removed' | 'changed'

export type ChangeSummaryEntry = {
  path: string
  label: string
  before: string
  after: string
  kind: ChangeKind
}

export type ChangeSummaryOptions = {
  labels?: Record<string, string>
  ignore?: string[]
  emptyLabel?: string
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !(typeof File !== 'undefined' && value instanceof File) &&
  !(typeof FileList !== 'undefined' && value instanceof FileList)

const humanizeKey = (path: string) => {
  const key = path.split('.').pop() ?? path
  return key
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/\b\w/g, character => character.toUpperCase())
}

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const size = bytes / Math.pow(1024, index)
  return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`
}

export const formatChangeValue = (value: unknown, emptyLabel = 'Empty'): string => {
  if (value === null || value === undefined || value === '') return emptyLabel
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value instanceof Date) return value.toLocaleString()

  if (typeof File !== 'undefined' && value instanceof File) {
    return `${value.name} (${formatBytes(value.size)})`
  }

  if (typeof FileList !== 'undefined' && value instanceof FileList) {
    const files = Array.from(value)
    return files.length > 0
      ? files.map(file => `${file.name} (${formatBytes(file.size)})`).join(', ')
      : emptyLabel
  }

  if (Array.isArray(value)) {
    return value.length > 0
      ? value.map(item => formatChangeValue(item, emptyLabel)).join(', ')
      : emptyLabel
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value)
      .filter(([, nested]) => nested !== undefined)
      .map(([key, nested]) => `${humanizeKey(key)}: ${formatChangeValue(nested, emptyLabel)}`)

    return entries.length > 0 ? entries.join('; ') : emptyLabel
  }

  return String(value)
}

const serializeComparable = (value: unknown): string => {
  if (value === undefined) return '__undefined__'
  if (value === null) return '__null__'
  if (value instanceof Date) return `date:${value.toISOString()}`
  if (typeof File !== 'undefined' && value instanceof File) {
    return `file:${value.name}:${value.size}:${value.type}:${value.lastModified}`
  }
  if (typeof FileList !== 'undefined' && value instanceof FileList) {
    return JSON.stringify(Array.from(value).map(file => serializeComparable(file)))
  }
  if (Array.isArray(value)) return JSON.stringify(value.map(item => serializeComparable(item)))
  if (isPlainObject(value)) {
    return JSON.stringify(
      Object.keys(value)
        .sort()
        .map(key => [key, serializeComparable(value[key])])
    )
  }
  return JSON.stringify(value) ?? String(value)
}

const collectChanges = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  options: ChangeSummaryOptions,
  prefix = ''
): ChangeSummaryEntry[] => {
  const ignored = new Set(options.ignore ?? [])
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort()
  const changes: ChangeSummaryEntry[] = []

  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key
    if (ignored.has(path) || ignored.has(key)) continue

    const previous = before[key]
    const next = after[key]

    if (isPlainObject(previous) && isPlainObject(next)) {
      changes.push(...collectChanges(previous, next, options, path))
      continue
    }

    if (serializeComparable(previous) === serializeComparable(next)) continue

    const previousEmpty = previous === null || previous === undefined || previous === ''
    const nextEmpty = next === null || next === undefined || next === ''
    const kind: ChangeKind = previousEmpty ? 'added' : nextEmpty ? 'removed' : 'changed'

    changes.push({
      path,
      label: options.labels?.[path] ?? options.labels?.[key] ?? humanizeKey(path),
      before: formatChangeValue(previous, options.emptyLabel),
      after: formatChangeValue(next, options.emptyLabel),
      kind
    })
  }

  return changes
}

export const buildChangeSummary = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  options: ChangeSummaryOptions = {}
): ChangeSummaryEntry[] => collectChanges(before, after, options)
