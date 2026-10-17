import type { EventWorkspaceContext } from '@/lib/event-workspace'
export function authorizedSidebarEventId(
  context: EventWorkspaceContext | null,
  routeEventId: string | null
): string | null {
  if (!context) return null
  if (context.isGlobalAdmin && context.status === 'global') return routeEventId
  if (!context.isGlobalAdmin && context.status === 'assigned') return context.eventId
  return null
}

export function sidebarAllowsPermission(
  context: EventWorkspaceContext | null,
  permission: string,
  globalSessionAllows: boolean
): boolean {
  if (!context) return false
  if (context.isGlobalAdmin && context.status === 'global') return globalSessionAllows
  return !context.isGlobalAdmin &&
    context.status === 'assigned' &&
    context.permissions.includes(permission)
}

export function authorizedSidebarModules(
  eventId: string | null,
  experience: { eventId?: string; enabledModules: readonly string[] } | null
): ReadonlySet<string> {
  if (!eventId || !experience || !Array.isArray(experience.enabledModules)) return new Set()
  if (experience.eventId && experience.eventId.toLowerCase() !== eventId.toLowerCase()) return new Set()

  return new Set(experience.enabledModules.filter(key => typeof key === 'string'))
}
