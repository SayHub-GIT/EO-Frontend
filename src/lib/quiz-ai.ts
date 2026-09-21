import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'
import type { QuizQuestionResponse } from '@/lib/admin-quiz'

export type GenerateQuizQuestionsRequest = {
  count: number
  additionalInstructions?: string | null
}

export type GenerateQuizQuestionsResponse = {
  requested: number
  created: number
  questions: QuizQuestionResponse[]
}

export async function generateQuizQuestions(
  eventId: string,
  request: GenerateQuizQuestionsRequest
): Promise<GenerateQuizQuestionsResponse> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/quiz/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, difficulty: 'Medium' })
  })

  if (response.status === 403) throw new Error('You are not authorized to generate quiz questions.')
  if (!response.ok) throw new Error(await parseError(response, 'CYRA could not generate quiz questions.'))

  return (await response.json()) as GenerateQuizQuestionsResponse
}
