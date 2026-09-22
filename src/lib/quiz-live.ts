'use client'

import { parseError } from '@/lib/api'
import { getApiBaseUrl, getApiOrigin } from '@/lib/api-base-url'
import { authFetch, restoreSession } from '@/lib/auth'
import type { QuizAnswerMarkerMode } from '@/lib/admin-quiz'
import type { QuizSessionStatus } from '@/lib/quiz-rooms'
import { SignalRJsonClient } from '@/lib/signalr-json'

export type QuizLeaderboardEntry = {
  rank: number
  displayName: string
  score: number
}

export type QuizHostQuestion = {
  sessionQuestionId: string
  sequence: number
  totalQuestions: number
  questionText: string
  questionImageUrl: string | null
  answers: string[]
  startedAtUtc: string
  deadlineAtUtc: string
  durationSeconds: number
}

export type QuizParticipantQuestion = {
  sessionQuestionId: string
  sequence: number
  totalQuestions: number
  answerMarkerMode: QuizAnswerMarkerMode
  markerAUrl: string | null
  markerBUrl: string | null
  markerCUrl: string | null
  markerDUrl: string | null
  startedAtUtc: string
  deadlineAtUtc: string
  durationSeconds: number
}

export type QuizLiveState = {
  sessionId: string
  roomCode: string
  status: QuizSessionStatus
  serverTimeUtc: string
  participantCount: number
  answerCount: number
  currentQuestion: QuizHostQuestion | null
  leaderboard: QuizLeaderboardEntry[]
  hasMoreQuestions: boolean
}

export type QuizParticipantResult = {
  submitted: boolean
  isCorrect: boolean
  scoreAwarded: number
  totalScore: number
  responseTimeMs: number | null
}

export type QuizParticipantLiveState = {
  sessionId: string
  status: QuizSessionStatus
  serverTimeUtc: string
  currentQuestion: QuizParticipantQuestion | null
  hasAnsweredCurrentQuestion: boolean
  personalScore: number
  lastResult: QuizParticipantResult | null
}

export type QuizCountdown = {
  sessionId: string
  startedAtUtc: string
  startsAtUtc: string
  seconds: number
}

export type SubmitQuizAnswerResponse = {
  accepted: boolean
  sessionQuestionId: string
  responseTimeMs: number
  answerCount: number
}

export type QuizQuestionReveal = {
  sessionId: string
  sessionQuestionId: string
  sequence: number
  correctAnswerIndex: number
  shortExplanation: string | null
  revealedAtUtc: string
  scoreVisibleAtUtc: string
  nextActionAtUtc: string
  leaderboard: QuizLeaderboardEntry[]
  hasMoreQuestions: boolean
}

export type QuizParticipantReveal = Omit<QuizQuestionReveal, 'leaderboard'>

export type QuizLeaderboardShown = {
  sessionId: string
  podium: QuizLeaderboardEntry[]
  leaderboard: QuizLeaderboardEntry[]
  hasMoreQuestions: boolean
  nextActionAtUtc: string
}

export type QuizFinished = {
  sessionId: string
  podium: QuizLeaderboardEntry[]
  leaderboard: QuizLeaderboardEntry[]
}

export type QuizParticipantFinished = {
  sessionId: string
  finishedAtUtc: string
}

const ensureAdminOk = async (response: Response, fallback: string) => {
  if (response.status === 403) throw new Error('You are not authorized to control this Quiz.')
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

export async function getAdminQuizLiveState(eventId: string, sessionId: string): Promise<QuizLiveState> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/quiz/sessions/${encodeURIComponent(sessionId)}/live`,
    { cache: 'no-store' }
  )
  await ensureAdminOk(response, 'Unable to load live Quiz state.')
  return (await response.json()) as QuizLiveState
}

const adminLiveAction = async <T>(eventId: string, sessionId: string, action: 'start' | 'next' | 'reveal' | 'finish') => {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/quiz/sessions/${encodeURIComponent(sessionId)}/live/${action}`,
    { method: 'POST' }
  )
  await ensureAdminOk(response, `Unable to ${action} Quiz.`)
  return (await response.json()) as T
}

export const startAdminQuizLive = (eventId: string, sessionId: string) =>
  adminLiveAction<QuizCountdown>(eventId, sessionId, 'start')

export const nextAdminQuizQuestion = (eventId: string, sessionId: string) =>
  adminLiveAction<QuizHostQuestion>(eventId, sessionId, 'next')

export const revealAdminQuizQuestion = (eventId: string, sessionId: string) =>
  adminLiveAction<QuizQuestionReveal>(eventId, sessionId, 'reveal')

export const finishAdminQuiz = (eventId: string, sessionId: string) =>
  adminLiveAction<QuizFinished>(eventId, sessionId, 'finish')

export async function getParticipantQuizState(
  sessionId: string,
  participantToken: string
): Promise<QuizParticipantLiveState> {
  const response = await fetch(`${getApiBaseUrl()}/quiz/live/${encodeURIComponent(sessionId)}/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantToken }),
    cache: 'no-store'
  })
  if (!response.ok) throw new Error(await parseError(response, 'Unable to restore Quiz state.'))
  return (await response.json()) as QuizParticipantLiveState
}

export async function submitParticipantQuizAnswer(
  sessionId: string,
  participantToken: string,
  selectedAnswerIndex: number
): Promise<SubmitQuizAnswerResponse> {
  const response = await fetch(`${getApiBaseUrl()}/quiz/live/${encodeURIComponent(sessionId)}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantToken, selectedAnswerIndex })
  })
  if (!response.ok) throw new Error(await parseError(response, 'Unable to submit answer.'))
  return (await response.json()) as SubmitQuizAnswerResponse
}

export const createAdminQuizHubClient = () =>
  new SignalRJsonClient({
    hubUrl: `${getApiOrigin()}/hubs/quiz`,
    accessTokenFactory: async () => (await restoreSession())?.accessToken ?? null,
    skipNegotiation: true
  })

export const createParticipantQuizHubClient = () =>
  new SignalRJsonClient({
    hubUrl: `${getApiOrigin()}/hubs/quiz`,
    skipNegotiation: true
  })

export const secondsUntil = (utc: string, serverOffsetMs = 0) =>
  Math.max(0, (Date.parse(utc) - (Date.now() + serverOffsetMs)) / 1000)

export const deriveServerOffsetMs = (serverTimeUtc: string) => Date.parse(serverTimeUtc) - Date.now()
