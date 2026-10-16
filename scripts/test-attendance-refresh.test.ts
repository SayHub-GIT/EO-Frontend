import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  isAttendanceChangeForEvent,
  publishAttendanceChange,
  subscribeAttendanceRefresh
} from '../src/lib/attendance-refresh'

const eventA = '11111111-1111-4111-8111-111111111111'
const eventB = '22222222-2222-4222-8222-222222222222'

test('only accepts well-formed event-scoped refresh messages', () => {
  assert.equal(isAttendanceChangeForEvent({ eventId: eventA }, eventA.toUpperCase()), true)
  assert.equal(isAttendanceChangeForEvent({ eventId: eventB }, eventA), false)
  assert.equal(isAttendanceChangeForEvent({ eventId: 'event-B' }, eventA), false)
  assert.equal(isAttendanceChangeForEvent(null, eventA), false)
  assert.equal(isAttendanceChangeForEvent([], eventA), false)
  assert.equal(isAttendanceChangeForEvent({ eventId: eventA }, 'bad-route'), false)
})

test('subscribers receive only their event, refresh on focus and clean up', () => {
  const globalScope = globalThis as unknown as {
    window?: EventTarget
    document?: EventTarget & { visibilityState: string }
    BroadcastChannel?: typeof BroadcastChannel
  }
  const originalWindow = globalScope.window
  const originalDocument = globalScope.document
  const originalChannel = globalScope.BroadcastChannel
  const originalNow = Date.now
  const fakeWindow = new EventTarget()
  const fakeDocument = Object.assign(new EventTarget(), { visibilityState: 'visible' })

  class FakeChannel {
    static instances = new Set<FakeChannel>()
    onmessage: ((event: MessageEvent) => void) | null = null
    constructor(_name: string) {
      FakeChannel.instances.add(this)
    }
    postMessage(message: unknown) {
      for (const channel of FakeChannel.instances) {
        if (channel !== this) channel.onmessage?.({ data: message } as MessageEvent)
      }
    }
    close() { FakeChannel.instances.delete(this) }
  }

  let now = 100_000
  Date.now = () => now
  globalScope.window = fakeWindow
  globalScope.document = fakeDocument
  globalScope.BroadcastChannel = FakeChannel as unknown as typeof BroadcastChannel

  try {
    let calls = 0
    const unsubscribe = subscribeAttendanceRefresh(eventA, () => { calls += 1 })
    publishAttendanceChange(eventB)
    assert.equal(calls, 0)
    publishAttendanceChange(eventA)
    assert.equal(calls, 1)

    const crossTab = new FakeChannel('eo:attendance-refresh')
    crossTab.postMessage({ eventId: eventA })
    assert.equal(calls, 2)
    crossTab.postMessage({ eventId: eventB })
    assert.equal(calls, 2)

    now += 5_000
    fakeWindow.dispatchEvent(new Event('focus'))
    assert.equal(calls, 2)

    now += 15_001
    fakeWindow.dispatchEvent(new Event('focus'))
    assert.equal(calls, 3)

    now += 15_001
    fakeDocument.visibilityState = 'hidden'
    fakeDocument.dispatchEvent(new Event('visibilitychange'))
    assert.equal(calls, 3)

    fakeDocument.visibilityState = 'visible'
    fakeDocument.dispatchEvent(new Event('visibilitychange'))
    assert.equal(calls, 4)

    unsubscribe()
    assert.equal(FakeChannel.instances.size, 1)
    publishAttendanceChange(eventA)
    fakeWindow.dispatchEvent(new Event('focus'))
    assert.equal(calls, 4)
    crossTab.close()
  } finally {
    Date.now = originalNow
    if (originalWindow === undefined) delete globalScope.window
    else globalScope.window = originalWindow
    if (originalDocument === undefined) delete globalScope.document
    else globalScope.document = originalDocument
    if (originalChannel === undefined) delete globalScope.BroadcastChannel
    else globalScope.BroadcastChannel = originalChannel
  }
})

test('mutations broadcast only after server-confirmed QR/manual check-in or checkout', () => {
  const source = readFileSync('src/app/(dashboard)/admin/check-ins/page.tsx', 'utf8')
  assert.match(source, /const response = await checkInParticipant\(qrToken\)[\s\S]*?setResult\(response\)\s*publishAttendanceChange\(response\.eventId\)/)
  assert.match(source, /const response = await manualCheckIn\(candidate\.registrationId\)[\s\S]*?setResult\(response\)\s*publishAttendanceChange\(response\.eventId\)/)
  assert.match(source, /const response = await manualCheckOut\(candidate\.registrationId\)[\s\S]*?setCheckoutResult\(response\)\s*publishAttendanceChange\(response\.eventId\)/)
  assert.equal(source.match(/publishAttendanceChange\(response\.eventId\)/g)?.length, 3)
})

test('attendance list refreshes both endpoints without retrying metrics on paging or search', () => {
  const source = readFileSync('src/app/(dashboard)/admin/events/[eventSlug]/attendance/page.tsx', 'utf8')
  assert.match(source, /return subscribeAttendanceRefresh\(eventId, \(\) => setReload\(value => value \+ 1\)\)/)
  assert.match(source, /getEventAttendanceRecords\(eventId, toAttendanceRecordsFilters\(filters\), controller\.signal\)/)
  assert.match(source, /getEventAttendanceMetrics\(eventId, controller\.signal\)/)
  assert.match(source, /\[eventId, access\.resolved, access\.allowed, reload\]/)
  assert.match(source, /controller\.abort\(\)/)
  assert.doesNotMatch(source, /listing\.items\.(reduce|filter)\(/)
})

test('dashboard refreshes server counts only when attendance.read is allowed', () => {
  const source = readFileSync('src/app/(dashboard)/admin/events/[eventSlug]/dashboard/page.tsx', 'utf8')
  assert.match(source, /usePermissionAccess\('attendance\.read'\)/)
  assert.match(source, /getEventAttendanceMetrics\(eventId, controller\.signal\)/)
  assert.match(source, /subscribeAttendanceRefresh\(eventId, \(\) => setAttendanceReload\(value => value \+ 1\)\)/)
  assert.match(source, /metrics\.eventId\.toLowerCase\(\) !== eventId\.toLowerCase\(\)/)
})
