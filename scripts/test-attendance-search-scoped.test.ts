import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { searchCheckInParticipants } from '../src/lib/check-ins'

const eventId = '4dc4520a-9603-45b2-9b95-1dd760d17a02'
const anotherEventId = 'bf9c3028-143f-4f62-8fd8-5d902b2e291f'
const person = { eventId, registrationId: 'e69003d1-421c-42af-852c-32be51c3987d' }

const json = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })

test('manual Check-In search explicitly passes CheckIn and its selected event', async () => {
  let calls = 0
  const result = await searchCheckInParticipants(eventId, '  Ani + Rina  ', 'CheckIn', undefined, async (path, options) => {
    calls += 1
    const url = new URL(path, 'https://example.invalid')
    assert.equal(url.pathname, '/check-ins/search')
    assert.equal(url.searchParams.get('eventId'), eventId)
    assert.equal(url.searchParams.get('q'), 'Ani + Rina')
    assert.equal(url.searchParams.get('mode'), 'CheckIn')
    assert.equal(url.searchParams.has('registrationId'), false)
    assert.equal(options?.cache, 'no-store')
    return json([person])
  })
  assert.equal(calls, 1)
  assert.equal(result[0].registrationId, person.registrationId)
})

test('manual Check-Out search explicitly passes CheckOut and forwards cancellation', async () => {
  const controller = new AbortController()
  const result = await searchCheckInParticipants(eventId, 'Nina', 'CheckOut', controller.signal, async (path, options) => {
    assert.equal(new URL(path, 'https://example.invalid').searchParams.get('mode'), 'CheckOut')
    assert.equal(options?.signal, controller.signal)
    return json([person])
  })
  assert.equal(result.length, 1)
})

test('All mode, missing event and short queries never reach the server', async () => {
  let requests = 0
  const fake = async () => { requests += 1; return json([person]) }
  await assert.rejects(searchCheckInParticipants('', 'Ani', 'CheckIn', undefined, fake), /event/i)
  await assert.rejects(searchCheckInParticipants(eventId, 'Ani', 'All' as never, undefined, fake), /mode/i)
  assert.deepEqual(await searchCheckInParticipants(eventId, ' A ', 'CheckIn', undefined, fake), [])
  assert.equal(requests, 0)
})

test('backend 403 is not treated as empty results or permission fallback', async () => {
  await assert.rejects(searchCheckInParticipants(eventId, 'Ayu', 'CheckOut', undefined,
    async () => json({ detail: 'Forbidden' }, 403)), /Forbidden|Pencarian/)
})

test('invalid payload, mixed events, and unidentified rows fail closed', async () => {
  await assert.rejects(searchCheckInParticipants(eventId, 'Ayu', 'CheckIn', undefined,
    async () => json({ items: [] })), /Respons/)
  await assert.rejects(searchCheckInParticipants(eventId, 'Ayu', 'CheckIn', undefined,
    async () => json([person, { ...person, eventId: anotherEventId }])), /event/)
  await assert.rejects(searchCheckInParticipants(eventId, 'Ayu', 'CheckOut', undefined,
    async () => json([{ eventId, registrationId: null }])), /event/)
})

test('event comparison accepts the same GUID regardless of case', async () => {
  const result = await searchCheckInParticipants(eventId.toUpperCase(), 'Ayu', 'CheckIn', undefined,
    async () => json([person]))
  assert.equal(result.length, 1)
})

test('frontend checks effective permission before either mode-specific search', () => {
  const page = readFileSync('src/app/(dashboard)/admin/check-ins/page.tsx', 'utf8')
  const client = readFileSync('src/lib/check-ins.ts', 'utf8')
  assert.match(page, /checkInMode === 'manual' && !checkInAccess\.allowed/)
  assert.match(page, /checkInMode === 'checkout' && !checkoutAccess\.allowed/)
  assert.match(page, /searchCheckInParticipants\(eventId, searchName, checkInMode === 'checkout' \? 'CheckOut' : 'CheckIn', controller\.signal\)/)
  assert.match(page, /manualSearchRefresh, checkInAccess\.allowed, checkoutAccess\.allowed/)
  assert.match(client, /new URLSearchParams\(\{ eventId: selectedEventId, q: term, mode \}\)/)
  assert.doesNotMatch(client, /mode: 'All'/)
})
