import { parseError } from '@/lib/api'
import { getApiBaseUrl } from '@/lib/api-base-url'
import { authFetch } from '@/lib/auth'
import type { QuizAnswerMarkerMode } from '@/lib/admin-quiz'

export type QuizSessionStatus =
  | 'Draft'
  | 'Open'
  | 'Countdown'
  | 'Active'
  | 'Leaderboard'
  | 'Finished'
  | 'Cancelled'

export type CreateQuizSessionRequest = {
  name: string
  capacity: number
  questionCount: number
  questionDurationSeconds?: number | null
  resultDelaySeconds: number
  leaderboardDurationSeconds: number
}

export type QuizSessionResponse = {
  id: string
  quizId: string
  name: string
  roomCode: string
  capacity: number
  participantCount: number
  remainingCapacity: number
  questionCount: number
  questionDurationSeconds: number
  resultDelaySeconds: number
  leaderboardDurationSeconds: number
  status: QuizSessionStatus
  startedAtUtc: string | null
  finishedAtUtc: string | null
  joinPath: string
  joinUrl: string
  qrCodePath: string
}

export type QuizEventAccessResponse = {
  available: boolean
}

export type PublicQuizRoomResponse = {
  sessionId: string
  eventId: string
  eventSlug: string
  eventName: string
  quizName: string
  sessionName: string
  roomCode: string
  status: QuizSessionStatus
  capacity: number
  participantCount: number
  remainingCapacity: number
  answerMarkerMode: QuizAnswerMarkerMode
  markerAUrl: string | null
  markerBUrl: string | null
  markerCUrl: string | null
  markerDUrl: string | null
}

export type JoinQuizRoomResponse = {
  sessionId: string
  participantId: string
  participantToken: string
  displayName: string
  roomCode: string
  status: QuizSessionStatus
}

const ensureAdminOk = async (response: Response, fallback: string) => {
  if (response.status === 403) throw new Error('You are not authorized to manage Quiz rooms.')
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

export async function listAdminQuizSessions(eventId: string): Promise<QuizSessionResponse[]> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/quiz/sessions`, {
    cache: 'no-store'
  })
  await ensureAdminOk(response, 'Unable to load Quiz sessions.')
  const payload = (await response.json()) as QuizSessionResponse[]
  return Array.isArray(payload) ? payload : []
}

export async function createAdminQuizSession(
  eventId: string,
  request: CreateQuizSessionRequest
): Promise<QuizSessionResponse> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/quiz/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  await ensureAdminOk(response, 'Unable to create Quiz session.')
  return (await response.json()) as QuizSessionResponse
}

export async function openAdminQuizSession(eventId: string, sessionId: string): Promise<QuizSessionResponse> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/quiz/sessions/${encodeURIComponent(sessionId)}/open`,
    { method: 'POST' }
  )
  await ensureAdminOk(response, 'Unable to open Quiz room.')
  return (await response.json()) as QuizSessionResponse
}

export async function cancelAdminQuizSession(eventId: string, sessionId: string): Promise<QuizSessionResponse> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/quiz/sessions/${encodeURIComponent(sessionId)}/cancel`,
    { method: 'POST' }
  )
  await ensureAdminOk(response, 'Unable to cancel Quiz room.')
  return (await response.json()) as QuizSessionResponse
}

export async function getPublicQuizRoom(roomCode: string): Promise<PublicQuizRoomResponse> {
  const response = await fetch(`${getApiBaseUrl()}/quiz/rooms/${encodeURIComponent(roomCode)}`, { cache: 'no-store' })
  if (!response.ok) throw new Error(await parseError(response, 'Quiz room was not found.'))
  return (await response.json()) as PublicQuizRoomResponse
}

export async function getEventQuizAccess(eventId: string): Promise<QuizEventAccessResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/events/${encodeURIComponent(eventId)}/quiz/access`,
    { cache: 'no-store' }
  )
  if (!response.ok) throw new Error(await parseError(response, 'Unable to check Quiz availability.'))
  return (await response.json()) as QuizEventAccessResponse
}

export async function getEventQuizRoom(
  eventId: string,
  roomCode: string
): Promise<PublicQuizRoomResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/events/${encodeURIComponent(eventId)}/quiz/rooms/${encodeURIComponent(roomCode)}`,
    { cache: 'no-store' }
  )
  if (!response.ok) throw new Error(await parseError(response, 'Quiz room was not found for this event.'))
  return (await response.json()) as PublicQuizRoomResponse
}

export async function joinEventQuizRoom(
  eventId: string,
  roomCode: string,
  displayName: string
): Promise<JoinQuizRoomResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/events/${encodeURIComponent(eventId)}/quiz/rooms/${encodeURIComponent(roomCode)}/join`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName })
    }
  )
  if (!response.ok) throw new Error(await parseError(response, 'Unable to join Quiz room.'))
  return (await response.json()) as JoinQuizRoomResponse
}

export const getQuizRoomQrUrl = (roomCode: string) =>
  `${getApiBaseUrl()}/quiz/rooms/${encodeURIComponent(roomCode)}/qr`

export const quizParticipantStorageKey = (roomCode: string) =>
  `eo-quiz-participant:${roomCode.trim().toUpperCase()}`
