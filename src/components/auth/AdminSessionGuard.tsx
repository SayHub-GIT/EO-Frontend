'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { usePathname, useRouter } from 'next/navigation'

import { rememberAdminPath, restoreSession } from '@/lib/auth'

type Props = {
  children: ReactNode
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
