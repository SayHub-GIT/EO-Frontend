export type BreadcrumbItem = {
  label: string
  href?: string
}

export type BreadcrumbContext = {
  eventLabel?: string
  sessionLabel?: string
}

const MODULE_LABELS: Record<string, string> = {
  registration: 'Registration',
  participants: 'Participants',
  packages: 'Registration Options',
  checkins: 'Attendance',
  reports: 'Reports',
  'race-categories': 'Categories / Tracks',
  'race-pack': 'Distribution',
  quiz: 'Quiz',
  doorprize: 'Prize Draw',
  booths: 'Activity Points / Booths',
  speakers: 'Speakers / Facilitators',
  sessions: 'Sessions',
  agenda: 'Agenda',
  certificates: 'Certificates / Attendance Proof'
}

const decodeSegment = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const humanize = (value: string) => {
  const decoded = decodeSegment(value)
    .replace(/^custom-/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()

  return decoded
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const fallbackEventLabel = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value) ? 'Event' : humanize(value)

const cleanPath = (pathname: string) => {
  const path = pathname.split('?')[0]?.split('#')[0] ?? pathname
  return path === '/' ? '/' : path.replace(/\/+$/, '')
}

const segmentsOf = (pathname: string) =>
  cleanPath(pathname)
    .split('/')
    .filter(Boolean)
    .map(decodeSegment)

export const getBreadcrumbEventReference = (pathname: string): string | undefined => {
  const segments = segmentsOf(pathname)
  if (segments[0] !== 'admin' || segments[1] !== 'events') return undefined

  const reference = segments[2]
  if (!reference || ['archived', 'create'].includes(reference)) return undefined

  return reference
}

export const getBreadcrumbSessionReference = (pathname: string): string | undefined => {
  const segments = segmentsOf(pathname)

  if (
    segments[0] !== 'admin' ||
    segments[1] !== 'events' ||
    segments[3] !== 'quiz' ||
    !segments[4]
  ) {
    return undefined
  }

  return segments[4]
}

export const buildBreadcrumbs = (
  pathname: string,
  context: BreadcrumbContext = {}
): BreadcrumbItem[] => {
  const segments = segmentsOf(pathname)

  if (segments[0] !== 'admin') return []

  const items: BreadcrumbItem[] = [
    { label: 'Home', href: '/home' },
    { label: 'Admin', href: '/admin/home' }
  ]

  const section = segments[1]

  if (!section || section === 'home') {
    items[items.length - 1] = { label: 'Admin' }
    return items
  }

  const staticSections: Record<string, string> = {
    'check-ins': 'Attendance',
    registrations: 'Registrations',
    users: 'Users & Roles',
    about: 'About'
  }

  if (section !== 'events') {
    items.push({ label: staticSections[section] ?? humanize(section) })
    return items
  }

  const eventReference = segments[2]

  if (!eventReference) {
    items.push({ label: 'Events' })
    return items
  }

  items.push({ label: 'Events', href: '/admin/events' })

  if (eventReference === 'archived') {
    items.push({ label: 'Archived Events' })
    return items
  }

  if (eventReference === 'create') {
    items.push({ label: 'Create Event' })
    return items
  }

  const eventLabel = context.eventLabel || fallbackEventLabel(eventReference)
  const eventHref = `/admin/events/${encodeURIComponent(eventReference)}`
  const remainder = segments.slice(3)

  if (remainder.length === 0) {
    items.push({ label: eventLabel })
    return items
  }

  items.push({ label: eventLabel, href: eventHref })

  const [first, second, third] = remainder

  if (first === 'dashboard') {
    items.push({ label: 'Dashboard' })
    return items
  }

  if (first === 'edit') {
    items.push({ label: 'Edit Event' })
    return items
  }

  if (first === 'registrations') {
    items.push({ label: 'Registrations' })
    return items
  }

  if (first === 'quiz') {
    const quizHref = `${eventHref}/quiz`

    if (!second) {
      items.push({ label: 'Quiz' })
      return items
    }

    items.push({ label: 'Quiz', href: quizHref })
    items.push({ label: context.sessionLabel || 'Quiz Session' })

    if (third === 'live') items.push({ label: 'Live Host' })
    else if (third) items.push({ label: humanize(third) })

    return items
  }

  if (first === 'modules') {
    items.push({ label: 'Modules' })
    if (second) items.push({ label: MODULE_LABELS[second] ?? humanize(second) })
    if (third) items.push({ label: humanize(third) })
    return items
  }

  items.push({ label: humanize(first) })
  if (second) items.push({ label: humanize(second) })
  if (third) items.push({ label: humanize(third) })

  return items
}
