import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'

export type PermissionDefinition = {
  module: string
  action: string
  value: string
  label: string
}

export type AccessRole = {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  systemKey: string | null
  isActive: boolean
  permissions: string[]
  userCount: number
  createdAtUtc: string
}

export type AccessRoleRequest = {
  name: string
  description?: string | null
  isActive?: boolean
  permissions: string[]
}

const ensureOk = async (response: Response, fallback: string) => {
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

export async function listAccessRoles(): Promise<AccessRole[]> {
  const response = await authFetch('/admin/roles', { cache: 'no-store' })
  await ensureOk(response, 'Unable to load roles.')
  return response.json()
}

export async function getPermissionCatalog(): Promise<PermissionDefinition[]> {
  const response = await authFetch('/admin/roles/permissions', { cache: 'no-store' })
  await ensureOk(response, 'Unable to load permission catalog.')
  return response.json()
}

export async function createAccessRole(request: AccessRoleRequest): Promise<AccessRole> {
  const response = await authFetch('/admin/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  await ensureOk(response, 'Unable to create role.')
  return response.json()
}

export async function updateAccessRole(id: string, request: AccessRoleRequest): Promise<AccessRole> {
  const response = await authFetch(`/admin/roles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  await ensureOk(response, 'Unable to update role.')
  return response.json()
}

export async function deleteAccessRole(id: string): Promise<void> {
  const response = await authFetch(`/admin/roles/${encodeURIComponent(id)}`, { method: 'DELETE' })
  await ensureOk(response, 'Unable to delete role.')
}
