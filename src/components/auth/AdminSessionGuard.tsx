'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { usePathname, useRouter } from 'next/navigation'

import { hasPermission, rememberAdminPath, restoreSession } from '@/lib/auth'
import { assignedDashboardPath, getCurrentEventWorkspace, type EventWorkspaceContext } from '@/lib/event-workspace'

type Props = {
  children: ReactNode
}

const EXACT_ADMIN_ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/admin/events': ['event.read'],
  '/admin/events/create': ['event.create'],
  '/admin/events/archived': ['event.archive']
}

const ADMIN_ROUTE_PERMISSIONS: Array<{ prefix: string; anyOf: string[] }> = [
  { prefix: '/admin/users', anyOf: ['users.read'] },
  { prefix: '/admin/roles', anyOf: ['roles.read'] },
  { prefix: '/admin/settings/legal', anyOf: ['legal.read'] },
  { prefix: '/admin/settings/smtp', anyOf: ['settings.read'] },
  { prefix: '/admin/audit', anyOf: ['audit.read'] },
  { prefix: '/admin/registrations', anyOf: ['registration.read'] },
  { prefix: '/admin/check-ins', anyOf: ['attendance.read', 'attendance.checkin'] },
  { prefix: '/admin/microsite', anyOf: ['microsite.read'] }
]

const requiredPermissionsForPath = (path: string | null | undefined) => {
  if (!path) return []

  const exactMatch = EXACT_ADMIN_ROUTE_PERMISSIONS[path]
  if (exactMatch) return exactMatch

  return ADMIN_ROUTE_PERMISSIONS.find(
    route => path === route.prefix || path.startsWith(`${route.prefix}/`)
  )?.anyOf ?? []
}

const AdminSessionGuard = ({ children }: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    let active = true

    const validateSession = async () => {
      const session = await restoreSession()

      if (!active) return

      const currentAdminPath =
        typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
          ? `${window.location.pathname}${window.location.search}`
          : pathname?.startsWith('/admin')
            ? pathname
            : '/admin/home'

      if (!session) {
        router.replace(`/login?returnTo=${encodeURIComponent(currentAdminPath)}&authCheck=1`)
        return
      }

      if (!session.canAccessAdmin) {
        router.replace(session.role?.toLowerCase() === 'participant' ? '/account' : '/home')
        return
      }

      let resolvedWorkspace: EventWorkspaceContext | null = null

      // Scope resolution is server-authoritative; client route protection is
      // only a UX guard in addition to per-event API authorization.
      try {
        const workspace = await getCurrentEventWorkspace()
        if (!active) return
        resolvedWorkspace = workspace

        if (!workspace.isGlobalAdmin) {
          const assignedPath = assignedDashboardPath(workspace)
          const fallback = assignedPath ?? '/admin/home'
          const path = pathname ?? '/admin/home'
          const segment = path.match(/^\/admin\/events\/([^/]+)(?:\/|$)/)?.[1]

          const globalOnly = [
            '/admin/users',
            '/admin/roles',
            '/admin/settings',
            '/admin/audit',
            '/admin/registrations'
          ].some(prefix => path === prefix || path.startsWith(`${prefix}/`))

          const restrictedEventList = [
            '/admin/events',
            '/admin/events/create',
            '/admin/events/archived'
          ].includes(path)

          if (path !== '/admin/home' && (!assignedPath || globalOnly || restrictedEventList)) {
            router.replace(fallback)
            return
          }

          if (segment && segment !== 'create' && segment !== 'archived') {
            let requestedId: string

            try {
              requestedId = decodeURIComponent(segment)
            } catch {
              router.replace(fallback)
              return
            }

            if (requestedId !== workspace.eventId) {
              router.replace(fallback)
              return
            }
          }

          const canEvent = (...permissions: string[]) =>
            permissions.some(permission => workspace.permissions.includes(permission))

          const protectedModule = segment && segment !== 'create' && segment !== 'archived'
            ? path.slice(`/admin/events/${segment}`.length)
            : ''

          if (
            (protectedModule?.startsWith('/staff-access')) ||
            (protectedModule?.startsWith('/edit') && !canEvent('event.update')) ||
            (protectedModule?.startsWith('/registrations') && !canEvent('registration.read')) ||
            (protectedModule?.startsWith('/quiz') && !canEvent('quiz.read', 'quiz.manage')) ||
            (protectedModule?.startsWith('/modules/doorprize') && !canEvent('doorprize.read', 'doorprize.manage')) ||
            (protectedModule?.startsWith('/modules/certificates') && !canEvent('certificates.read', 'certificates.manage')) ||
            (protectedModule?.startsWith('/modules/race-pack') && !canEvent('event.update')) ||
            (protectedModule?.startsWith('/modules/reports') && !canEvent('registration.read', 'event.read'))
          ) {
            router.replace(fallback)
            return
          }

          if (path === '/admin/microsite' || path.startsWith('/admin/microsite/')) {
            if (!canEvent('microsite.read')) {
              router.replace(fallback)
              return
            }

            const micrositeEvent = path.match(/^\/admin\/microsite\/sites\/([^/]+)(?:\/|$)/)?.[1]
            if (micrositeEvent) {
              let decodedId: string
              try { decodedId = decodeURIComponent(micrositeEvent) }
              catch { router.replace(fallback); return }
              if (decodedId !== workspace.eventId) {
                router.replace(fallback)
                return
              }
            }
          }

          if (path === '/admin/check-ins' && !canEvent('attendance.read', 'attendance.checkin')) {
            router.replace(fallback)
            return
          }

          if (path === '/admin/check-ins' && workspace.eventId) {
            const requestedEventId = new URLSearchParams(
              typeof window === 'undefined' ? '' : window.location.search
            ).get('eventId')

            if (requestedEventId !== workspace.eventId) {
              router.replace(`/admin/check-ins?eventId=${encodeURIComponent(workspace.eventId)}`)
              return
            }
          }
        }
      } catch {
        if (!active) return

        // Do not expose any admin route until scope can be verified. The home
        // route renders a retryable error rather than an untrusted workspace.
        if (pathname !== '/admin/home') {
          router.replace('/admin/home')
          return
        }
      }

      const requiredPermissions = requiredPermissionsForPath(pathname)

      if (requiredPermissions.length > 0 && !requiredPermissions.some(permission =>
        resolvedWorkspace?.isGlobalAdmin === false
          ? resolvedWorkspace.permissions.includes(permission)
          : hasPermission(session, permission))) {
        router.replace('/admin/home')
        return
      }

      rememberAdminPath(currentAdminPath)
      setIsAuthorized(true)
    }

    setIsAuthorized(false)
    void validateSession()

    return () => {
      active = false
    }
  }, [pathname, router])

  return isAuthorized ? children : null
}

export default AdminSessionGuard
