import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'

export type EventWorkspaceContext = {
  isGlobalAdmin: boolean
  status: 'global' | 'assigned' | 'unassigned' | 'ambiguous' | 'permission_required'
  eventId: string | null
}

const validStatuses = new Set<EventWorkspaceContext['status']>([
  'global',
  'assigned',
  'unassigned',
  'ambiguous',
  'permission_required'
])

export async function getCurrentEventWorkspace(): Promise<EventWorkspaceContext> {
  const response = await authFetch('/admin/event-workspace', { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(await parseError(response, 'Unable to verify event workspace access.'))
  }

  const value: unknown = await response.json()

  if (!value || typeof value !== 'object') {
    throw new Error('Invalid event workspace response.')
  }

  const payload = value as Record<string, unknown>

  if (
    typeof payload.isGlobalAdmin !== 'boolean' ||
    typeof payload.status !== 'string' ||
    !validStatuses.has(payload.status as EventWorkspaceContext['status']) ||
    (payload.eventId !== null && typeof payload.eventId !== 'string') ||
    (payload.status === 'assigned' && !payload.eventId) ||
    (payload.isGlobalAdmin && payload.status !== 'global')
  ) {
    throw new Error('Invalid event workspace response.')
  }

  return payload as EventWorkspaceContext
}

export function assignedDashboardPath(context: EventWorkspaceContext): string | null {
  if (context.isGlobalAdmin || context.status !== 'assigned' || !context.eventId) return null

  return `/admin/events/${encodeURIComponent(context.eventId)}/dashboard`
}

export function workspaceStatusMessage(status: EventWorkspaceContext['status']): string {
  switch (status) {
    case 'unassigned':
      return 'Your account has not been assigned to an event. Contact the main administrator.'
    case 'ambiguous':
      return 'More than one active event assignment was found. The main administrator must reconcile your access.'
    case 'permission_required':
      return 'Your event assignment does not include permission to view the event dashboard. Contact the main administrator.'
    default:
      return 'Your event workspace is not available yet.'
  }
}
