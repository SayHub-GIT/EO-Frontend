import type { EventWorkspaceContext } from '@/lib/event-workspace'

export type AttendanceOperationPermission = 'attendance.checkin' | 'attendance.checkout'

export const canOperateAttendanceInWorkspace = (
  context: EventWorkspaceContext | null,
  selectedEventId: string,
  permission: AttendanceOperationPermission,
  globalSessionAllows: boolean
): boolean => {
  if (!context || !selectedEventId.trim()) return false

  if (context.isGlobalAdmin) {
    return context.status === 'global' && globalSessionAllows
  }

  return context.status === 'assigned' &&
    typeof context.eventId === 'string' &&
    context.eventId.toLowerCase() === selectedEventId.toLowerCase() &&
    context.permissions.includes(permission)
}
