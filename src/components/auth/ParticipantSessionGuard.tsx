'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { restoreSession } from '@/lib/auth'

const ParticipantSessionGuard = ({ children }: { children: ReactNode }) => {
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    let active = true

    const validate = async () => {
      const session = await restoreSession()
      if (!active) return

      if (!session) {
        router.replace(`/login?returnTo=${encodeURIComponent(pathname ?? '/account')}`)
        return
      }

      const role = session.role?.toLowerCase()

      if (session.canAccessAdmin) {
        router.replace('/admin/home')
        return
      }

      if (role !== 'participant') {
        router.replace('/home')
        return
      }

      setAuthorized(true)
    }

    setAuthorized(false)
    void validate()

    return () => {
      active = false
    }
  }, [pathname, router])

  return authorized ? children : null
}

export default ParticipantSessionGuard
