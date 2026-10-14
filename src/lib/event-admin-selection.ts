import type { AdminUser } from '@/lib/admin-users'
import type { EventStaffAccess } from '@/lib/event-staff-access'

export const isAdminKecil = (user: AdminUser) =>
  user.role.toLowerCase() === 'admin_kecil' ||
  user.roles.some(role => role.toLowerCase() === 'admin_kecil')

export const resolveEventAdmin = (
  users: AdminUser[],
  assignments: EventStaffAccess[],
  candidateId: string
): AdminUser | null => {
  const adminKecilUsers = users.filter(isAdminKecil)
  const current = assignments.find(grant =>
    grant.isActive && adminKecilUsers.some(user => user.id === grant.userId))

  if (current) return adminKecilUsers.find(user => user.id === current.userId) ?? null

  const eligible = adminKecilUsers.filter(user => user.isActive)
  const candidate = eligible.find(user => user.id === candidateId)
  if (candidate) return candidate

  return eligible.find(user =>
    assignments.some(grant => grant.userId === user.id)) ?? null
}
