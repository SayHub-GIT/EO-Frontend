import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { getAttendanceNavigationVisibility } from '../src/lib/attendance-navigation'
import { authorizedSidebarEventId, sidebarAllowsPermission } from '../src/lib/workspace-sidebar'

import type { EventWorkspaceContext } from '../src/lib/event-workspace'

const eventA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const eventB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const assigned: EventWorkspaceContext = {
  isGlobalAdmin: false,
  status: 'assigned',
  eventId: eventA,
  permissions: ['attendance.read']
}

test('attendance.read alone exposes the list but not check-in operations', () => {
  assert.deepEqual(getAttendanceNavigationVisibility(false, false, true, eventA), {
    checkInAndOut: false,
    listAttendance: true
  })
})

test('check-in-only and checkout-only both expose operations without the read-only list', () => {
  for (const [checkIn, checkOut] of [[true, false], [false, true]]) {
    assert.deepEqual(getAttendanceNavigationVisibility(checkIn, checkOut, false, eventA), {
      checkInAndOut: true,
      listAttendance: false
    })
  }
})

test('operator with read permission sees both links when an event is selected', () => {
  assert.deepEqual(getAttendanceNavigationVisibility(true, true, true, eventA), {
    checkInAndOut: true,
    listAttendance: true
  })
})

test('event-less navigation never exposes an unscoped attendance list', () => {
  assert.deepEqual(getAttendanceNavigationVisibility(true, false, true, null), {
    checkInAndOut: true,
    listAttendance: false
  })
  assert.deepEqual(getAttendanceNavigationVisibility(false, false, true, null), {
    checkInAndOut: false,
    listAttendance: false
  })
})

test('scoped operator uses the assigned event and effective workspace permissions', () => {
  const eventId = authorizedSidebarEventId(assigned, eventB)
  assert.equal(eventId, eventA)
  const visibility = getAttendanceNavigationVisibility(
    sidebarAllowsPermission(assigned, 'attendance.checkin', true),
    sidebarAllowsPermission(assigned, 'attendance.checkout', true),
    sidebarAllowsPermission(assigned, 'attendance.read', false),
    eventId
  )
  assert.deepEqual(visibility, { checkInAndOut: false, listAttendance: true })
})

test('unresolved workspace fails closed for both menu links', () => {
  assert.deepEqual(getAttendanceNavigationVisibility(
    sidebarAllowsPermission(null, 'attendance.checkin', true),
    sidebarAllowsPermission(null, 'attendance.checkout', true),
    sidebarAllowsPermission(null, 'attendance.read', true),
    authorizedSidebarEventId(null, eventA)
  ), { checkInAndOut: false, listAttendance: false })
})

test('menu visibility matches the page-level backend permission contracts', () => {
  const checkIns = readFileSync('src/app/(dashboard)/admin/check-ins/page.tsx', 'utf8')
  const attendance = readFileSync('src/app/(dashboard)/admin/events/[eventSlug]/attendance/page.tsx', 'utf8')
  assert.match(checkIns, /usePermissionAccess\('attendance\.checkin'\)/)
  assert.match(checkIns, /usePermissionAccess\('attendance\.checkout'\)/)
  assert.match(attendance, /usePermissionAccess\('attendance\.read'\)/)
})

test('vertical nav passes distinct effective permissions to explicit menu links', () => {
  const navigation = readFileSync('src/components/layout/vertical/Navigation.tsx', 'utf8')
  const menu = readFileSync('src/components/layout/vertical/VerticalMenu.tsx', 'utf8')
  assert.match(navigation, /allowed\('attendance\.checkin'\)/)
  assert.match(navigation, /allowed\('attendance\.checkout'\)/)
  assert.match(navigation, /allowed\('attendance\.read'\)/)
  assert.match(navigation, /showCheckIns=\{showCheckIns && attendanceNavigation\.checkInAndOut\}/)
  assert.match(navigation, /showAttendanceList=\{showCheckIns && attendanceNavigation\.listAttendance\}/)
  assert.match(menu, /\{showAttendanceList && eventPath && \(/)
  assert.match(menu, /href=\{\x60\$\{eventPath\}\/attendance\x60\}/)
  assert.match(menu, /Check-in & Out/)
  assert.match(menu, /List Attendance/)
})

test('horizontal nav scopes event links to the effective workspace, not stale roles', () => {
  const menu = readFileSync('src/components/layout/horizontal/HorizontalMenu.tsx', 'utf8')
  assert.match(menu, /getCurrentEventWorkspace\(\)/)
  assert.match(menu, /authorizedSidebarEventId\(workspace, routeEventId\)/)
  assert.match(menu, /sidebarAllowsPermission\(workspace, permission, hasPermission\(session, permission\)\)/)
  assert.match(menu, /attendanceNavigation\.checkInAndOut/)
  assert.match(menu, /attendanceNavigation\.listAttendance && eventId/)
  assert.match(menu, /encodeURIComponent\(eventId\)\}\/attendance/)
  assert.match(menu, /Check-in &amp; Out/)
})

test('Settings is the last admin navigation section in both layouts', () => {
  const vertical = readFileSync('src/components/layout/vertical/VerticalMenu.tsx', 'utf8')
  const horizontal = readFileSync('src/components/layout/horizontal/HorizontalMenu.tsx', 'utf8')
  const verticalAbout = vertical.indexOf('href={aboutHref}')
  const verticalSettings = vertical.indexOf("<SubMenu label='Settings'")
  const horizontalAbout = horizontal.indexOf('href={aboutHref}')
  const horizontalSettings = horizontal.indexOf("<SubMenu label='Settings'")
  assert.ok(verticalAbout > 0 && verticalSettings > verticalAbout)
  assert.ok(horizontalAbout > 0 && horizontalSettings > horizontalAbout)
  assert.match(horizontal, /SMTP Email/)
  assert.match(vertical, /SMTP Email/)
})
