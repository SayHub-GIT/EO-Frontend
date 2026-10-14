import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveEventAdmin } from '../src/lib/event-admin-selection'
import type { AdminUser } from '../src/lib/admin-users'
import type { EventStaffAccess } from '../src/lib/event-staff-access'

const admin = (id: string, isActive = true): AdminUser => ({
  id,
  fullName: id,
  email: `${id}@example.com`,
  role: 'Admin_kecil',
  roleIds: [],
  roles: ['Admin_kecil'],
  isActive
})

const assignment = (userId: string, isActive: boolean): EventStaffAccess => ({
  id: `grant-${userId}`,
  eventId: 'event-a',
  userId,
  permissions: ['event.read'],
  isActive
})

test('active event owner wins over a different URL candidate', () => {
  const selected = resolveEventAdmin(
    [admin('previous'), admin('candidate')],
    [assignment('previous', true)],
    'candidate'
  )
  assert.equal(selected?.id, 'previous')
})

test('inactive assignment does not trap a valid new candidate', () => {
  const selected = resolveEventAdmin(
    [admin('previous'), admin('candidate')],
    [assignment('previous', false)],
    'candidate'
  )
  assert.equal(selected?.id, 'candidate')
})

test('previous inactive assignment remains default when no candidate is supplied', () => {
  const selected = resolveEventAdmin(
    [admin('previous'), admin('candidate')],
    [assignment('previous', false)],
    ''
  )
  assert.equal(selected?.id, 'previous')
})

test('disabled active owner stays selected to allow grant revocation', () => {
  const selected = resolveEventAdmin(
    [admin('previous', false), admin('candidate')],
    [assignment('previous', true)],
    'candidate'
  )
  assert.equal(selected?.id, 'previous')
  assert.equal(selected?.isActive, false)
})

test('unknown or Staff candidate cannot become an event Admin Kecil', () => {
  const staff: AdminUser = { ...admin('staff'), role: 'Staff', roles: ['Staff'] }
  assert.equal(resolveEventAdmin([staff], [], 'staff'), null)
  assert.equal(resolveEventAdmin([admin('other')], [], 'unrecognized'), null)
})

test('inactive candidate without an assignment is not selectable', () => {
  assert.equal(resolveEventAdmin([admin('candidate', false)], [], 'candidate'), null)
})
