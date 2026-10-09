import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'
import type { PermissionDefinition } from '@/lib/access-roles'

export type EventStaffAccess = {
  id: string
  eventId: string
  userId: string
  permissions: string[]
  isActive: boolean
}

export type EventStaffAccessUpdate = {
  userId: string
  permissions: string[]
  isActive: boolean
}

const endpoint = (eventId: string) =>
  `/admin/events/${encodeURIComponent(eventId)}/access`

const ensureOk = async (response: Response, message: string): Promise<void> => {
  if (!response.ok) {
    throw new Error(await parseError(response, message))
  }
}

export async function listEventStaffAccess(eventId: string): Promise<EventStaffAccess[]> {
  const response = await authFetch(endpoint(eventId), { cache: 'no-store' })
  await ensureOk(response, 'Could not load staff assignments.')
  const payload: unknown = await response.json()
  if (!Array.isArray(payload)) throw new Error('Invalid event staff response.')
  return payload as EventStaffAccess[]
}

export async function listAssignableEventPermissions(eventId: string): Promise<PermissionDefinition[]> {
  const response = await authFetch(`${endpoint(eventId)}/permissions`, { cache: 'no-store' })
  await ensureOk(response, 'Could not load event-specific permission options.')
  const payload: unknown = await response.json()
  if (!Array.isArray(payload)) throw new Error('Invalid event permission catalog.')
  return payload as PermissionDefinition[]
}

export async function saveEventStaffAccess(
  eventId: string,
  request: EventStaffAccessUpdate
): Promise<EventStaffAccess> {
  const response = await authFetch(endpoint(eventId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  await ensureOk(response, 'Could not save staff access.')
  return response.json()
}
