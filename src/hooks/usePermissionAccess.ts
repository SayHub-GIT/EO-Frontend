'use client'

import { useEffect, useState } from 'react'

import {
  getStoredSession,
  hasPermission,
  restoreSession,
  type AdminSession
} from '@/lib/auth'

export const usePermissionAccess = (permission: string) => {
  const initialSession = getStoredSession()
  const [session, setSession] = useState<AdminSession | null>(initialSession)
  const [resolved, setResolved] = useState(Boolean(initialSession))

  useEffect(() => {
    let active = true

    void restoreSession().then(value => {
      if (!active) return
      setSession(value)
      setResolved(true)
    })

    return () => {
      active = false
    }
  }, [])

  return {
    session,
    resolved,
    allowed: resolved && hasPermission(session, permission)
  }
}
