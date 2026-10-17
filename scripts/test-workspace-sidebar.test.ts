import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  authorizedSidebarEventId,
  authorizedSidebarModules,
  sidebarAllowsPermission
} from '../src/lib/workspace-sidebar'

import type { EventWorkspaceContext } from '../src/lib/event-workspace'

const eventA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const eventB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const globalAdmin: EventWorkspaceContext = {
  isGlobalAdmin: true,
  status: 'global',
  eventId: null,
  permissions: []
}
const assigned: EventWorkspaceContext = {
  isGlobalAdmin: false,
  status: 'assigned',
  eventId: eventA,
  permissions: ['event.read', 'quiz.read', 'registration.read']
}

test('unresolved workspace exposes no event link even when URL contains an event', () => {
  assert.equal(authorizedSidebarEventId(null, eventB), null)
  assert.equal(sidebarAllowsPermission(null, 'event.read', true), false)
})

test('scoped staff always sees assigned event, never another event from the address bar', () => {
  assert.equal(authorizedSidebarEventId(assigned, eventB), eventA)
  assert.equal(authorizedSidebarEventId(assigned, null), eventA)
})

test('global admin can navigate selected event without an implicit assignment', () => {
  assert.equal(authorizedSidebarEventId(globalAdmin, eventB), eventB)
  assert.equal(authorizedSidebarEventId(globalAdmin, null), null)
})

test('unassigned, ambiguous and permission-required workspaces expose no event sections', () => {
  for (const status of ['unassigned', 'ambiguous', 'permission_required'] as const) {
    const context: EventWorkspaceContext = { isGlobalAdmin: false, status, eventId: null, permissions: [] }
    assert.equal(authorizedSidebarEventId(context, eventB), null)
    assert.equal(sidebarAllowsPermission(context, 'event.read', true), false)
  }
})

test('effective scoped permissions cannot be elevated by a stale global admin session', () => {
  assert.equal(sidebarAllowsPermission(assigned, 'event.read', false), true)
  assert.equal(sidebarAllowsPermission(assigned, 'quiz.read', true), true)
  assert.equal(sidebarAllowsPermission(assigned, 'event.update', true), false)
  assert.equal(sidebarAllowsPermission(globalAdmin, 'event.update', false), false)
  assert.equal(sidebarAllowsPermission(globalAdmin, 'event.update', true), true)
})

test('enabled modules are visible only when the response belongs to the current event', () => {
  const config = { eventId: eventA, enabledModules: ['participants', 'quiz', 'reports'] }
  const allowed = authorizedSidebarModules(eventA, config)
  assert.equal(allowed.has('quiz'), true)
  assert.equal(allowed.has('reports'), true)
  assert.equal(allowed.has('doorprize'), false)
  assert.equal(authorizedSidebarModules(eventB, config).size, 0)
  assert.equal(authorizedSidebarModules(null, config).size, 0)
})

test('module data pending, unavailable or malformed fails closed', () => {
  assert.equal(authorizedSidebarModules(eventA, null).size, 0)
  assert.equal(authorizedSidebarModules(eventA, { eventId: eventA, enabledModules: [] }).size, 0)
  assert.equal(authorizedSidebarModules(eventA, { eventId: eventA, enabledModules: null } as never).size, 0)
})

test('sidebar routes and controls depend on scoped modules and permissions', () => {
  const nav = readFileSync('src/components/layout/vertical/Navigation.tsx', 'utf8')
  const vertical = readFileSync('src/components/layout/vertical/VerticalMenu.tsx', 'utf8')

  assert.match(nav, /authorizedSidebarEventId\(workspace, routeEventId\)/)
  assert.match(nav, /sidebarAllowsPermission\(workspace, permission, hasPermission\(session, permission\)\)/)
  assert.match(nav, /getAdminEventExperience\(eventId\)/)
  assert.match(nav, /experience\.eventId\.toLowerCase\(\) !== eventId\.toLowerCase\(\)/)
  assert.match(nav, /showRegistrations=\{showRegistrations && allowed\('registration\.read'\) && moduleEnabled\('participants'\)\}/)
  assert.match(nav, /showEventQuiz=\{moduleEnabled\('quiz'\) && allowedAny\('quiz\.manage', 'quiz\.read'\)\}/)
  assert.match(nav, /showDoorprize=\{moduleEnabled\('doorprize'\) && allowedAny\('doorprize\.read', 'doorprize\.manage'\)\}/)
  assert.match(nav, /showCertificates=\{moduleEnabled\('certificates'\) && allowedAny\('certificates\.read', 'certificates\.manage'\)\}/)
  assert.match(nav, /showMerchandise=\{moduleEnabled\('race-pack'\) && allowed\('event\.update'\)\}/)
  assert.match(nav, /showReports=\{moduleEnabled\('reports'\) && allowed\('event\.read'\)\}/)
  assert.match(vertical, /\{showMerchandise && \(/)
  assert.match(vertical, /\{showEventManagement && eventPath && showReports && \(/)
  assert.doesNotMatch(vertical, /Reports \(select an event\)/)
})
