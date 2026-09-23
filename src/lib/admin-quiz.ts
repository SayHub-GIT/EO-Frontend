import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'

export const QUIZ_GENERATION_MODES = ['AiGenerated', 'QuestionBank', 'Hybrid'] as const
export const QUIZ_MARKER_MODES = ['DefaultShapes', 'CustomImages'] as const
export type QuizGenerationMode = (typeof QUIZ_GENERATION_MODES)[number]
export type QuizAnswerMarkerMode = (typeof QUIZ_MARKER_MODES)[number]
export type QuizStatus = 'Draft' | 'Ready' | 'Archived'
export type QuizQuestionOrigin = 'Manual' | 'Ai' | 'Import'
export type QuizQuestionUsageStatus = 'Available' | 'Reserved' | 'UsedLocked'
export type QuizQuestionBulkDeleteScope = 'used' | 'all'

export type QuizResponse = {
  id: string
  eventId: string
  name: string
  description: string | null
  context: string
  generationMode: QuizGenerationMode
  answerMarkerMode: QuizAnswerMarkerMode
  defaultQuestionDurationSeconds: number
  markerAUrl: string | null
  markerBUrl: string | null
  markerCUrl: string | null
  markerDUrl: string | null
  status: QuizStatus
  activeQuestionCount: number
}

export type QuizUpsertRequest = {
  name: string
  description?: string | null
  context: string
  generationMode: QuizGenerationMode
  answerMarkerMode: QuizAnswerMarkerMode
  defaultQuestionDurationSeconds: number
  markerAUrl?: string | null
  markerBUrl?: string | null
  markerCUrl?: string | null
  markerDUrl?: string | null
}

export type QuizQuestionResponse = {
  id: string
  quizId: string
  questionText: string
  questionImageUrl: string | null
  answerA: string
  answerB: string
  answerC: string
  answerD: string
  correctAnswerIndex: number
  shortExplanation: string | null
  origin: QuizQuestionOrigin
  isActive: boolean
  isAllocated: boolean
  usageStatus: QuizQuestionUsageStatus
  isLocked: boolean
}

export type BulkDeleteQuizQuestionsResponse = {
  deletedCount: number
  remainingActiveCount: number
}

export type QuizQuestionUpsertRequest = {
  questionText: string
  questionImageUrl?: string | null
  answerA: string
  answerB: string
  answerC: string
  answerD: string
  correctAnswerIndex: number
  shortExplanation?: string | null
}

export type QuizAssetSlot = 'marker-a' | 'marker-b' | 'marker-c' | 'marker-d'

export type ParsedQuizQuestionDraft = {
  sourceNumber: number
  questionText: string
  answerA: string
  answerB: string
  answerC: string
  answerD: string
  correctAnswerIndex: number | null
  status: 'Ready' | 'NeedsReview' | 'Duplicate'
  issues: string[]
  isDuplicate: boolean
}

export type ParseQuizQuestionBankResponse = {
  detected: number
  ready: number
  needsReview: number
  duplicates: number
  questions: ParsedQuizQuestionDraft[]
}

export type ImportQuizQuestionBankItem = {
  sourceNumber: number
  questionText: string
  answerA: string
  answerB: string
  answerC: string
  answerD: string
  correctAnswerIndex: number
}

export type ImportQuizQuestionBankItemResult = {
  sourceNumber: number
  status: 'Imported' | 'Duplicate' | 'Invalid'
  message: string | null
  question: QuizQuestionResponse | null
}

export type ImportQuizQuestionBankResponse = {
  requested: number
  imported: number
  skipped: number
  results: ImportQuizQuestionBankItemResult[]
}

const ensureOk = async (response: Response, fallback: string) => {
  if (response.status === 403) throw new Error('You are not authorized to manage this quiz.')
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

export async function tryGetAdminQuiz(eventId: string): Promise<QuizResponse | null> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/quiz`, { cache: 'no-store' })
  if (response.status === 404) return null
  await ensureOk(response, 'Unable to load quiz configuration.')
  return (await response.json()) as QuizResponse
}

export async function createAdminQuiz(eventId: string, request: QuizUpsertRequest): Promise<QuizResponse> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  await ensureOk(response, 'Unable to create quiz configuration.')
  return (await response.json()) as QuizResponse
}

export async function updateAdminQuiz(eventId: string, request: QuizUpsertRequest): Promise<QuizResponse> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/quiz`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  await ensureOk(response, 'Unable to update quiz configuration.')
  return (await response.json()) as QuizResponse
}

export async function archiveAdminQuiz(eventId: string): Promise<void> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/quiz`, { method: 'DELETE' })
  await ensureOk(response, 'Unable to archive quiz.')
}

export async function uploadQuizMarker(eventId: string, slot: QuizAssetSlot, file: File) {
  const form = new FormData()
  form.append('file', file)
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/quiz/assets/${encodeURIComponent(slot)}`,
    { method: 'POST', body: form }
  )
  await ensureOk(response, `Unable to upload ${slot}.`)
  return (await response.json()) as { slot: QuizAssetSlot; url: string }
}

export async function listAdminQuizQuestions(eventId: string): Promise<QuizQuestionResponse[]> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/quiz/questions`, { cache: 'no-store' })
  await ensureOk(response, 'Unable to load question bank.')
  const payload = (await response.json()) as QuizQuestionResponse[]
  return Array.isArray(payload) ? payload : []
}

export async function createAdminQuizQuestion(
  eventId: string,
  request: QuizQuestionUpsertRequest
): Promise<QuizQuestionResponse> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/quiz/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, difficulty: 'Medium' })
  })
  await ensureOk(response, 'Unable to add question.')
  return (await response.json()) as QuizQuestionResponse
}

export async function updateAdminQuizQuestion(
  eventId: string,
  questionId: string,
  request: QuizQuestionUpsertRequest
): Promise<QuizQuestionResponse> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/quiz/questions/${encodeURIComponent(questionId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, difficulty: 'Medium' })
    }
  )
  await ensureOk(response, 'Unable to update question.')
  return (await response.json()) as QuizQuestionResponse
}

export async function deactivateAdminQuizQuestion(eventId: string, questionId: string): Promise<void> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/quiz/questions/${encodeURIComponent(questionId)}`,
    { method: 'DELETE' }
  )
  await ensureOk(response, 'Unable to remove question from the active bank.')
}

export async function uploadQuizQuestionImage(
  eventId: string,
  questionId: string,
  file: File
): Promise<QuizQuestionResponse> {
  const form = new FormData()
  form.append('file', file)
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/quiz/questions/${encodeURIComponent(questionId)}/image`,
    { method: 'POST', body: form }
  )
  await ensureOk(response, 'Unable to upload question image.')
  return (await response.json()) as QuizQuestionResponse
}

export async function parseQuizQuestionBank(
  eventId: string,
  sourceText: string
): Promise<ParseQuizQuestionBankResponse> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/quiz/question-bank/parse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceText, defaultDifficulty: 'Medium' })
    }
  )

  await ensureOk(response, 'Unable to parse Question Bank text.')
  return (await response.json()) as ParseQuizQuestionBankResponse
}

export async function importQuizQuestionBank(
  eventId: string,
  questions: ImportQuizQuestionBankItem[]
): Promise<ImportQuizQuestionBankResponse> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/quiz/question-bank/import`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: questions.map(question => ({ ...question, difficulty: 'Medium' })) })
    }
  )

  await ensureOk(response, 'Unable to import Question Bank questions.')
  return (await response.json()) as ImportQuizQuestionBankResponse
}


export async function deleteUsedAdminQuizQuestions(eventId: string): Promise<BulkDeleteQuizQuestionsResponse> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/quiz/questions/used`,
    { method: 'DELETE' }
  )
  await ensureOk(response, 'Unable to delete used Quiz questions.')
  return (await response.json()) as BulkDeleteQuizQuestionsResponse
}

export async function deleteAllAdminQuizQuestions(eventId: string): Promise<BulkDeleteQuizQuestionsResponse> {
  const response = await authFetch(
    `/admin/events/${encodeURIComponent(eventId)}/quiz/questions`,
    { method: 'DELETE' }
  )
  await ensureOk(response, 'Unable to delete all Quiz questions.')
  return (await response.json()) as BulkDeleteQuizQuestionsResponse
}
