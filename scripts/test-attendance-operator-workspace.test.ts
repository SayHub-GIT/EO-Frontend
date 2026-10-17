import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { canOperateAttendanceInWorkspace } from '../src/lib/attendance-operator-workspace'
import type { EventWorkspaceContext } from '../src/lib/event-workspace'

const eventA = 'e1a35015-f559-47d6-b1ee-dd4b73371609'
const eventB = '431661d1-6a5f-4bdf-a01c-6e5c6e467985'
const assigned: EventWorkspaceContext = {
  isGlobalAdmin: false,
  status: 'assigned',
  eventId: eventA,
  permissions: ['attendance.checkin', 'event.read']
}

test('unresolved event workspace blocks both operations even with a stale permitted session', () => {
  assert.equal(canOperateAttendanceInWorkspace(null, eventA, 'attendance.checkin', true), false)
  assert.equal(canOperateAttendanceInWorkspace(null, eventA, 'attendance.checkout', true), false)
})

test('effective scoped permissions allow Check-In but not Check-Out regardless of session roles', () => {
  assert.equal(canOperateAttendanceInWorkspace(assigned, eventA, 'attendance.checkin', false), true)
  assert.equal(canOperateAttendanceInWorkspace(assigned, eventA, 'attendance.checkout', true), false)
})

test('operator cannot inherit access to another event through URL or selected event', () => {
  assert.equal(canOperateAttendanceInWorkspace(assigned, eventB, 'attendance.checkin', true), false)
  assert.equal(canOperateAttendanceInWorkspace(assigned, '', 'attendance.checkin', true), false)
  assert.equal(canOperateAttendanceInWorkspace(assigned, eventA.toUpperCase(), 'attendance.checkin', true), true)
})

test('revoked Check-In permission takes effect without trusting the old session', () => {
  const revoked: EventWorkspaceContext = { ...assigned, permissions: ['event.read'] }
  assert.equal(canOperateAttendanceInWorkspace(revoked, eventA, 'attendance.checkin', true), false)
})

test('unassigned, ambiguous and permission_required workspaces block all attendance actions', () => {
  for (const status of ['unassigned', 'ambiguous', 'permission_required'] as const) {
    const value: EventWorkspaceContext = { isGlobalAdmin: false, status, eventId: null, permissions: [] }
    assert.equal(canOperateAttendanceInWorkspace(value, eventA, 'attendance.checkin', true), false)
    assert.equal(canOperateAttendanceInWorkspace(value, eventA, 'attendance.checkout', true), false)
  }
})

test('global admin still needs session operation permission and a selected event', () => {
  const admin: EventWorkspaceContext = { isGlobalAdmin: true, status: 'global', eventId: null, permissions: [] }
  assert.equal(canOperateAttendanceInWorkspace(admin, eventA, 'attendance.checkin', true), true)
  assert.equal(canOperateAttendanceInWorkspace(admin, eventA, 'attendance.checkout', false), false)
  assert.equal(canOperateAttendanceInWorkspace(admin, '', 'attendance.checkin', true), false)
})

test('client gates QR, manual Check-In, Checkout and scoped search with workspace permissions', () => {
  const page = readFileSync('src/app/(dashboard)/admin/check-ins/page.tsx', 'utf8')
  assert.match(page, /getCurrentEventWorkspace\(\)/)
  assert.match(page, /setWorkspace\(context\)/)
  assert.match(page, /setWorkspace\(null\)/)
  assert.match(page, /window\.addEventListener\('focus', refreshOnFocus\)/)
  assert.match(page, /document\.addEventListener\('visibilitychange', refreshOnFocus\)/)
  assert.match(page, /\[searchParams, workspaceRefresh\]/)
  assert.match(page, /canOperateAttendanceInWorkspace\(workspace, eventId, 'attendance\.checkin', checkInSessionAccess\.allowed\)/)
  assert.match(page, /canOperateAttendanceInWorkspace\(workspace, eventId, 'attendance\.checkout', checkoutSessionAccess\.allowed\)/)
  assert.match(page, /checkInMode === 'manual' && !checkInAccess\.allowed/)
  assert.match(page, /checkInMode === 'checkout' && !checkoutAccess\.allowed/)
  assert.match(page, /!photoConsent \|\| !checkInAccess\.allowed/)
  assert.match(page, /!checkoutAccess\.allowed/)
  assert.match(page, /publishAttendanceChange\(response\.eventId\)/)
})

test('frontend does not persist workspace permissions or participants to browser storage', () => {
  const page = readFileSync('src/app/(dashboard)/admin/check-ins/page.tsx', 'utf8')
  const helper = readFileSync('src/lib/attendance-operator-workspace.ts', 'utf8')
  assert.doesNotMatch(page, /localStorage|sessionStorage/)
  assert.doesNotMatch(helper, /localStorage|sessionStorage|fetch\(/)
})
