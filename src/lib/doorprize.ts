import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'

export type DoorprizeCandidate = {
  registrationId: string
  fullName: string
  bookingCode: string
  eventPackageName: string | null
}

export type DoorprizeEligible = {
  eventId: string
  prizeId: string
  prizeTitle: string
  prizeType: 'regular' | 'doorprize'
  total: number
  items: DoorprizeCandidate[]
}

export type DoorprizeWinner = {
  registrationId: string
  fullName: string
  bookingCode: string
  eventPackageName: string | null
  drawnAtUtc: string
}

export type DoorprizeDrawResult = {
  drawId: string
  prizeId: string
  prizeTitle: string
  prizeType: 'regular' | 'doorprize'
  eligibleCount: number
  reelItems: string[]
  winnerIndex: number
  durationMs: number
  winner: DoorprizeWinner
}

export type DoorprizeDecision = {
  drawId: string
  prizeId: string
  prizeTitle: string
  prizeType: 'regular' | 'doorprize'
  status: 'confirmed' | 'declined'
  winner: DoorprizeWinner
}

const ensureOk = async (response: Response, fallback: string) => {
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

export async function getDoorprizeEligible(
  eventId: string,
  prizeId: string,
  search?: string
): Promise<DoorprizeEligible> {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/doorprize/${encodeURIComponent(prizeId)}/eligible${query}`,
    { cache: 'no-store' }
  )

  await ensureOk(response, 'Unable to load eligible participants.')
  return response.json()
}

export async function drawDoorprize(
  eventId: string,
  prizeId: string
): Promise<DoorprizeDrawResult> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/doorprize/${encodeURIComponent(prizeId)}/draw`,
    { method: 'POST' }
  )

  await ensureOk(response, 'Unable to run prize draw.')
  return response.json()
}

export async function confirmDoorprizeWinner(
  eventId: string,
  prizeId: string,
  drawId: string
): Promise<DoorprizeDecision> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/doorprize/${encodeURIComponent(prizeId)}/draw/${encodeURIComponent(drawId)}/confirm`,
    { method: 'POST' }
  )

  await ensureOk(response, 'Unable to confirm prize winner.')
  return response.json()
}

export async function declineDoorprizeWinner(
  eventId: string,
  prizeId: string,
  drawId: string
): Promise<DoorprizeDecision> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/doorprize/${encodeURIComponent(prizeId)}/draw/${encodeURIComponent(drawId)}/decline`,
    { method: 'POST' }
  )

  await ensureOk(response, 'Unable to decline prize winner.')
  return response.json()
}
