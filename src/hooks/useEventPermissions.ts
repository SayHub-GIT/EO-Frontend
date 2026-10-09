'use client'

import { useEffect, useState } from 'react'
import {
  hasPermission,
  restoreSession,
  type AdminSession
} from '@/lib/auth'
import {
  getCurrentEventWorkspace,
  type EventWorkspaceContext
} from '@/lib/event-workspace'

/**
 * Effective permissions for one event. Global admins retain their global
 * permissions; scoped Staff must hold the explicit grant for this event.
 * On any session or API error, UI actions remain disabled (fail closed).
 */
export function useEventPermissions(eventId: string) {
  const [context, setContext] = useState<{
    session: AdminSession
    workspace: EventWorkspaceContext
  } | null>(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    let active = true
    setResolved(false)
    setContext(null)

    void Promise.all([restoreSession(), getCurrentEventWorkspace()])
      .then(([session, workspace]) => {
        if (!active || !session?.canAccessAdmin) return
        setContext({ session, workspace })
      })
      .catch(() => {
        // Keep permissions denied when the server cannot verify the assignment.
      })
      .finally(() => {
        if (active) setResolved(true)
      })

    return () => { active = false }
  }, [eventId])

  const can = (permission: string): boolean => {
    if (!resolved || !context) return false
    if (context.workspace.isGlobalAdmin)
      return hasPermission(context.session, permission)

    return context.workspace.status === 'assigned' &&
      context.workspace.eventId === eventId &&
      context.workspace.permissions.includes(permission)
  }

  return { resolved, can }
}
