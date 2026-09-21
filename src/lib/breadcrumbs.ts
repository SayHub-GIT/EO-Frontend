export type BreadcrumbScope = 'public' | 'admin'

export type BreadcrumbItem = {
  label: string
  href?: string
}

export type BreadcrumbContext = {
  eventLabel?: string
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

export const getBreadcrumbEventReference = (
  pathname: string,
  scope: BreadcrumbScope
): string | undefined => {
  const segments = segmentsOf(pathname)

  if (scope === 'admin') {
    if (segments[0] !== 'admin' || segments[1] !== 'events') return undefined
    const reference = segments[2]
    if (!reference || ['archived', 'create'].includes(reference)) return undefined
    return reference
  }

  if (segments[0] !== 'events') return undefined
  const reference = segments[1]
  if (!reference || reference === 'category') return undefined
  return reference
}

const publicBreadcrumbs = (
  pathname: string,
  context: BreadcrumbContext
): BreadcrumbItem[] => {
  const segments = segmentsOf(pathname)

  if (segments.length === 0 || segments[0] === 'home' || segments[0] === 'login') return []

  const home: BreadcrumbItem = { label: 'Home', href: '/home' }

  if (segments[0] === 'about') return [home, { label: 'About' }]

  if (segments[0] === 'events') {
    const items: BreadcrumbItem[] = [home]

    if (segments.length === 1) {
      items.push({ label: 'Events' })
      return items
    }

    items.push({ label: 'Events', href: '/events' })

    if (segments[1] === 'category') {
      items.push({ label: humanize(segments[2] ?? 'Category') })
      return items
    }

    const eventReference = segments[1]
    const eventLabel = context.eventLabel || fallbackEventLabel(eventReference)
    const eventHref = `/events/${encodeURIComponent(eventReference)}`
    const remainder = segments.slice(2)

    if (remainder.length === 0) {
      items.push({ label: eventLabel })
      return items
    }

    items.push({ label: eventLabel, href: eventHref })

    const pageLabels: Record<string, string> = {
      register: 'Registration',
      'payment-success': 'Payment Success',
      'payment-pending': 'Payment Pending'
    }

    items.push({ label: pageLabels[remainder[0]] ?? humanize(remainder[0]) })
    return items
  }

  if (segments[0] === 'registration') {
    const bookingCode = segments[1]
    const items: BreadcrumbItem[] = [home, { label: 'Registrations', href: '/events' }]

    if (bookingCode) {
      items.push({
        label: bookingCode,
        href: segments.length > 2 ? `/registration/${encodeURIComponent(bookingCode)}/status` : undefined
      })
    }

    if (segments[2]) items.push({ label: humanize(segments[2]) })
    return items
  }

  return [home, { label: humanize(segments[segments.length - 1] ?? 'Page') }]
}

const adminBreadcrumbs = (
  pathname: string,
  context: BreadcrumbContext
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
    if (!second) {
      items.push({ label: 'Quiz' })
      return items
    }

    items.push({ label: 'Quiz', href: `${eventHref}/quiz` })
    if (third === 'live') items.push({ label: 'Live Host' })
    else items.push({ label: 'Session' })
    return items
  }

  if (first === 'modules') {
    items.push({ label: 'Modules' })
    if (second) items.push({ label: MODULE_LABELS[second] ?? humanize(second) })
    return items
  }

  items.push({ label: humanize(first) })
  return items
}

export const buildBreadcrumbs = (
  pathname: string,
  scope: BreadcrumbScope,
  context: BreadcrumbContext = {}
): BreadcrumbItem[] =>
  scope === 'admin'
    ? adminBreadcrumbs(pathname, context)
    : publicBreadcrumbs(pathname, context)
