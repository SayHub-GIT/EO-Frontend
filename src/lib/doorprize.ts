import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'

export type DoorprizeCandidate = {
  candidateId: string
  registrationId: string | null
  source: 'registration' | 'manual'
  fullName: string
  reference: string | null
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
  candidateId: string
  registrationId: string | null
  source: 'registration' | 'manual'
  fullName: string
  reference: string | null
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

export type DoorprizeManualParticipant = {
  candidateId: string
  fullName: string
  reference: string | null
  notes: string | null
  active: boolean
  createdAtUtc: string
}

export type AddDoorprizeManualParticipant = {
  fullName: string
  reference?: string
  notes?: string
}

const ensureOk = async (response: Response, fallback: string) => {
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

export async function getDoorprizeManualPool(
  eventId: string
): Promise<DoorprizeManualParticipant[]> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/doorprize/manual-pool`,
    { cache: 'no-store' }
  )

  await ensureOk(response, 'Unable to load manual eligible participants.')
  const data = await response.json()
  return Array.isArray(data) ? data : []
}

export async function addDoorprizeManualParticipant(
  eventId: string,
  request: AddDoorprizeManualParticipant
): Promise<DoorprizeManualParticipant> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/doorprize/manual-pool`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    }
  )

  await ensureOk(response, 'Unable to add manual eligible participant.')
  return response.json()
}

export async function removeDoorprizeManualParticipant(
  eventId: string,
  candidateId: string
): Promise<DoorprizeManualParticipant> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/doorprize/manual-pool/${encodeURIComponent(candidateId)}`,
    { method: 'DELETE' }
  )

  await ensureOk(response, 'Unable to remove manual eligible participant.')
  return response.json()
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
