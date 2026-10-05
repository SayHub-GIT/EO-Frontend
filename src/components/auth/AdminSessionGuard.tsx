'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { usePathname, useRouter } from 'next/navigation'

import { hasPermission, rememberAdminPath, restoreSession } from '@/lib/auth'

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

      const requiredPermissions = requiredPermissionsForPath(pathname)

      if (requiredPermissions.length > 0 && !requiredPermissions.some(permission => hasPermission(session, permission))) {
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
