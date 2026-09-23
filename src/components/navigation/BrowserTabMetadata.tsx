'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const BRAND_TITLE = 'PTC Event Management'

const exactTitles: Record<string, string> = {
  '/': 'Home',
  '/home': 'Home',
  '/about': 'About',
  '/login': 'Login',
  '/admin/home': 'Admin Dashboard',
  '/admin/about': 'About Management',
  '/admin/events': 'Event Management',
  '/admin/events/create': 'Create Event',
  '/admin/events/archived': 'Archived Events',
  '/admin/check-ins': 'Check-ins',
  '/admin/registrations': 'Registrations',
  '/admin/users': 'Users',
  '/quiz/join': 'Join Quiz'
}

const humanize = (value: string) => {
  let decoded = value

  try {
    decoded = decodeURIComponent(value)
  } catch {
    decoded = value
  }

  return decoded
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
    .trim()
}

const formatTitle = (pageTitle: string) =>
  pageTitle === BRAND_TITLE ? BRAND_TITLE : `${pageTitle} | ${BRAND_TITLE}`

const getBrowserTitle = (pathname: string) => {
  const normalizedPath = pathname !== '/' ? pathname.replace(/\/$/, '') : pathname
  const exactTitle = exactTitles[normalizedPath]

  if (exactTitle) return formatTitle(exactTitle)

  const segments = normalizedPath.split('/').filter(Boolean)

  if (segments[0] === 'events') {
    if (segments[1] === 'category' && segments[2]) {
      return formatTitle(`${humanize(segments[2])} Events`)
    }

    const eventName = segments[1] ? humanize(segments[1]) : 'Events'

    if (segments.length === 2) return formatTitle(eventName)
    if (segments[2] === 'register') return formatTitle(`Register — ${eventName}`)
    if (segments[2] === 'payment-pending') return formatTitle(`Payment Pending — ${eventName}`)
    if (segments[2] === 'payment-success') return formatTitle(`Payment Success — ${eventName}`)
    if (segments[2] === 'quiz' && segments[3] === 'join') return formatTitle(`Join Quiz — ${eventName}`)
    if (segments[2] === 'quiz') return formatTitle(`Quiz — ${eventName}`)

    return formatTitle(eventName)
  }

  if (segments[0] === 'registration' && segments[1]) {
    const bookingCode = segments[1].toUpperCase()
    const view = segments[2]

    if (view === 'ticket') return formatTitle(`Ticket — ${bookingCode}`)
    if (view === 'receipt') return formatTitle(`Receipt — ${bookingCode}`)
    if (view === 'status') return formatTitle(`Registration Status — ${bookingCode}`)

    return formatTitle(`Registration — ${bookingCode}`)
  }

  if (segments[0] === 'quiz') {
    if (segments[1] === 'join' && segments[2]) return formatTitle(`Join Quiz — ${segments[2].toUpperCase()}`)

    if (segments[1] === 'host' && segments[2]) {
      return formatTitle(`Quiz Host — ${humanize(segments[2])}`)
    }

    return formatTitle('Quiz')
  }

  if (segments[0] === 'admin' && segments[1] === 'events' && segments[2]) {
    const eventName = humanize(segments[2])
    const section = segments[3]

    if (!section) return formatTitle(`${eventName} — Event Admin`)
    if (section === 'dashboard') return formatTitle(`${eventName} — Dashboard`)
    if (section === 'edit') return formatTitle(`Edit ${eventName}`)
    if (section === 'registrations') return formatTitle(`${eventName} — Registrations`)
    if (section === 'quiz') {
      if (segments[5] === 'live') return formatTitle(`${eventName} — Live Quiz`)

      return formatTitle(`${eventName} — Quiz`)
    }

    if (section === 'modules' && segments[4]) {
      return formatTitle(`${eventName} — ${humanize(segments[4])}`)
    }

    return formatTitle(`${eventName} — ${humanize(section)}`)
  }

  if (segments[0] === 'admin') {
    const fallbackAdminTitle = segments.at(-1) ? humanize(segments.at(-1)!) : 'Admin'

    return formatTitle(fallbackAdminTitle)
  }

  const fallback = segments.at(-1)

  return fallback ? formatTitle(humanize(fallback)) : BRAND_TITLE
}

const BrowserTabMetadata = () => {
  const pathname = usePathname()

  useEffect(() => {
    document.title = getBrowserTitle(pathname)
  }, [pathname])

  return null
}

export default BrowserTabMetadata
