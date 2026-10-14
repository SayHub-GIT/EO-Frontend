import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'
import type { PermissionDefinition } from '@/lib/access-roles'

export type EventSubUser = {
  id: string
  eventId: string
  fullName: string
  email: string
  role: string
  isActive: boolean
  status: string
}

export type CreateEventSubUser = {
  fullName: string
  email: string
  password: string
}

export type EventCustomRole = {
  id: string
  eventId: string
  name: string
  description: string | null
  isActive: boolean
  permissions: string[]
  createdAtUtc: string
}

export type CreateEventCustomRole = {
  name: string
  description: string | null
  permissions: string[]
}

export type UpdateEventCustomRole = CreateEventCustomRole & { isActive: boolean }

const base = (eventId: string) => `/admin/events/${encodeURIComponent(eventId)}`

const ensureOk = async (response: Response, fallback: string) => {
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

export async function listEventSubUsers(eventId: string): Promise<EventSubUser[]> {
  const response = await authFetch(`${base(eventId)}/sub-users`, { cache: 'no-store' })
  await ensureOk(response, 'Unable to load subordinate accounts.')
  return response.json()
}

export async function createEventSubUser(eventId: string, request: CreateEventSubUser): Promise<EventSubUser> {
  const response = await authFetch(`${base(eventId)}/sub-users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  await ensureOk(response, 'Unable to create subordinate account.')
  return response.json()
}

export async function listEventCustomRoles(eventId: string): Promise<EventCustomRole[]> {
  const response = await authFetch(`${base(eventId)}/roles`, { cache: 'no-store' })
  await ensureOk(response, 'Unable to load event roles.')
  return response.json()
}

export async function listEventRolePermissions(eventId: string): Promise<PermissionDefinition[]> {
  const response = await authFetch(`${base(eventId)}/roles/permissions`, { cache: 'no-store' })
  await ensureOk(response, 'Unable to load assignable event permissions.')
  return response.json()
}

export async function createEventCustomRole(eventId: string, request: CreateEventCustomRole): Promise<EventCustomRole> {
  const response = await authFetch(`${base(eventId)}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  await ensureOk(response, 'Unable to create event role.')
  return response.json()
}

export async function updateEventCustomRole(eventId: string, roleId: string, request: UpdateEventCustomRole): Promise<EventCustomRole> {
  const response = await authFetch(`${base(eventId)}/roles/${encodeURIComponent(roleId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  await ensureOk(response, 'Unable to update event role.')
  return response.json()
}

export async function deleteEventCustomRole(eventId: string, roleId: string): Promise<void> {
  const response = await authFetch(`${base(eventId)}/roles/${encodeURIComponent(roleId)}`, {
    method: 'DELETE'
  })
  await ensureOk(response, 'Unable to delete event role.')
}

export type EventSubUserRoles = {
  subUserId: string
  eventId: string
  isActive: boolean
  roleIds: string[]
  effectivePermissions: string[]
}

export async function getEventSubUserRoles(eventId: string, subUserId: string): Promise<EventSubUserRoles> {
  const response = await authFetch(`${base(eventId)}/sub-users/${encodeURIComponent(subUserId)}/roles`, { cache: 'no-store' })
  await ensureOk(response, 'Unable to load subordinate roles.')
  return response.json()
}

export async function saveEventSubUserRoles(eventId: string, subUserId: string, roleIds: string[], isActive: boolean): Promise<EventSubUserRoles> {
  const response = await authFetch(`${base(eventId)}/sub-users/${encodeURIComponent(subUserId)}/roles`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleIds, isActive })
  })
  await ensureOk(response, 'Unable to save subordinate roles.')
  return response.json()
}
