import {
  createAdminQuiz,
  createAdminQuizQuestion,
  deactivateAdminQuizQuestion,
  updateAdminQuiz,
  updateAdminQuizQuestion,
  uploadQuizMarker,
  uploadQuizQuestionImage,
  type QuizQuestionResponse,
  type QuizUpsertRequest
} from '@/lib/admin-quiz'
import type { QuizFormValue } from '@/app/(dashboard)/admin/events/components/QuizConfigurator'

const MAX_QUIZ_IMAGE_BYTES = 5 * 1024 * 1024
const QUIZ_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])

const validateImage = (file: File | undefined, label: string) => {
  if (!file) return null
  if (!QUIZ_IMAGE_TYPES.has(file.type)) return `${label} must be PNG, JPG/JPEG, WEBP, or SVG.`
  if (file.size > MAX_QUIZ_IMAGE_BYTES) return `${label} must not exceed 5 MB.`
  return null
}

export const validateQuizEditor = (quiz: QuizFormValue): string | null => {
  if (!quiz.enabled) return null
  if (!quiz.name.trim()) return 'Quiz name is required.'
  if (!quiz.context.trim()) return 'Quiz context is required.'
  if (!Number.isInteger(quiz.defaultQuestionDurationSeconds) || quiz.defaultQuestionDurationSeconds < 3 || quiz.defaultQuestionDurationSeconds > 120) {
    return 'Default quiz question duration must be between 3 and 120 seconds.'
  }

  if (quiz.answerMarkerMode === 'CustomImages') {
    const markers = [
      ['Answer A marker', quiz.markerAUrl, quiz.markerFiles.a],
      ['Answer B marker', quiz.markerBUrl, quiz.markerFiles.b],
      ['Answer C marker', quiz.markerCUrl, quiz.markerFiles.c],
      ['Answer D marker', quiz.markerDUrl, quiz.markerFiles.d]
    ] as const

    for (const [label, currentUrl, file] of markers) {
      if (!currentUrl && !file) return `${label} is required when using custom answer markers.`
      const imageError = validateImage(file, label)
      if (imageError) return imageError
    }
  }

  for (let index = 0; index < quiz.questions.length; index += 1) {
    const question = quiz.questions[index]
    if (question.isLocked) continue
    if (!question.questionText.trim()) return `Question ${index + 1} needs question text.`
    const answers = [question.answerA, question.answerB, question.answerC, question.answerD].map(answer => answer.trim())
    if (answers.some(answer => !answer)) return `Question ${index + 1} needs exactly four answers.`
    if (new Set(answers.map(answer => answer.toLowerCase())).size !== 4) return `Question ${index + 1} answer choices must be different.`
    if (question.correctAnswerIndex < 0 || question.correctAnswerIndex > 3) return `Question ${index + 1} needs a valid correct answer.`

    const imageError = validateImage(question.imageFile, `Question ${index + 1} image`)
    if (imageError) return imageError
  }

  return null
}

const markerSlotMap = [
  ['a', 'marker-a', 'markerAUrl'],
  ['b', 'marker-b', 'markerBUrl'],
  ['c', 'marker-c', 'markerCUrl'],
  ['d', 'marker-d', 'markerDUrl']
] as const

export async function persistQuizEditor(
  eventId: string,
  quiz: QuizFormValue,
  previousQuestions: QuizQuestionResponse[] = []
) {
  if (!quiz.enabled) return null

  const validationError = validateQuizEditor(quiz)
  if (validationError) throw new Error(validationError)

  const markerUrls = {
    markerAUrl: quiz.markerAUrl ?? null,
    markerBUrl: quiz.markerBUrl ?? null,
    markerCUrl: quiz.markerCUrl ?? null,
    markerDUrl: quiz.markerDUrl ?? null
  }

  if (quiz.answerMarkerMode === 'CustomImages') {
    for (const [fileKey, slot, urlKey] of markerSlotMap) {
      const file = quiz.markerFiles[fileKey]
      if (!file) continue
      const uploaded = await uploadQuizMarker(eventId, slot, file)
      markerUrls[urlKey] = uploaded.url
    }
  }

  const request: QuizUpsertRequest = {
    name: quiz.name.trim(),
    description: quiz.description.trim() || null,
    context: quiz.context.trim(),
    generationMode: quiz.generationMode,
    answerMarkerMode: quiz.answerMarkerMode,
    defaultQuestionDurationSeconds: quiz.defaultQuestionDurationSeconds,
    markerAUrl: quiz.answerMarkerMode === 'CustomImages' ? markerUrls.markerAUrl : null,
    markerBUrl: quiz.answerMarkerMode === 'CustomImages' ? markerUrls.markerBUrl : null,
    markerCUrl: quiz.answerMarkerMode === 'CustomImages' ? markerUrls.markerCUrl : null,
    markerDUrl: quiz.answerMarkerMode === 'CustomImages' ? markerUrls.markerDUrl : null
  }

  const savedQuiz = quiz.existingQuizId
    ? await updateAdminQuiz(eventId, request)
    : await createAdminQuiz(eventId, request)

  const submittedIds = new Set(quiz.questions.flatMap(question => question.id ? [question.id] : []))
  for (const existing of previousQuestions) {
    if (existing.isActive && !submittedIds.has(existing.id)) {
      await deactivateAdminQuizQuestion(eventId, existing.id)
    }
  }

  for (const question of quiz.questions) {
    if (question.isLocked) continue

    const questionRequest = {
      questionText: question.questionText.trim(),
      questionImageUrl: question.existingImageUrl ?? null,
      answerA: question.answerA.trim(),
      answerB: question.answerB.trim(),
      answerC: question.answerC.trim(),
      answerD: question.answerD.trim(),
      correctAnswerIndex: question.correctAnswerIndex,
      shortExplanation: question.shortExplanation.trim() || null
    }

    const savedQuestion = question.id
      ? await updateAdminQuizQuestion(eventId, question.id, questionRequest)
      : await createAdminQuizQuestion(eventId, questionRequest)

    if (question.imageFile) {
      await uploadQuizQuestionImage(eventId, savedQuestion.id, question.imageFile)
    }
  }

  return savedQuiz
}
