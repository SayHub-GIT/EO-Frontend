import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'

export type AdminUser = {
  id: string
  fullName: string
  email: string
  role: string
  roleIds: string[]
  roles: string[]
  isActive: boolean
  createdAtUtc?: string | null
}

export type CreateAdminUserRequest = {
  fullName: string
  email: string
  password: string
  roleIds: string[]
}

export type UpdateAdminUserRequest = {
  fullName: string
  email: string
  roleIds: string[]
  isActive: boolean
}

const ensureOk = async (response: Response, fallback: string) => {
  if (response.status === 404) throw new Error('USER_MANAGEMENT_API_UNAVAILABLE')
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const response = await authFetch('/admin/users', { cache: 'no-store' })
  await ensureOk(response, 'Unable to load users.')
  return response.json()
}

export async function createAdminUser(request: CreateAdminUserRequest): Promise<AdminUser> {
  const response = await authFetch('/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  await ensureOk(response, 'Unable to create user.')
  return response.json()
}

export async function updateAdminUser(userId: string, request: UpdateAdminUserRequest): Promise<AdminUser> {
  const response = await authFetch('/admin/users/' + encodeURIComponent(userId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  await ensureOk(response, 'Unable to update user.')
  return response.json()
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const response = await authFetch('/admin/users/' + encodeURIComponent(userId), { method: 'DELETE' })
  await ensureOk(response, 'Unable to delete user.')
}
