'use client'

import { useEffect, useState } from 'react'

import { useParams, useRouter } from 'next/navigation'
import NextLink from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

import QuestionBankParser from '../../components/QuestionBankParser'
import EventForm, { type EventFormSubmission } from '../../components/EventForm'
import QuizConfigurator, { createQuizFormValue, type QuizFormValue } from '../../components/QuizConfigurator'
import {
  getAdminEvent,
  updateAdminEvent,
  uploadAdminEventAsset,
  type AdminEvent
} from '@/lib/admin-events'
import {
  getAdminEventExperience,
  updateAdminEventExperience,
  type EventExperienceConfig
} from '@/lib/event-experience'
import {
  deleteAllAdminQuizQuestions,
  deleteUsedAdminQuizQuestions,
  listAdminQuizQuestions,
  tryGetAdminQuiz,
  type QuizQuestionBulkDeleteScope,
  type QuizQuestionResponse
} from '@/lib/admin-quiz'
import { persistQuizEditor, validateQuizEditor } from '@/lib/quiz-editor'
import { pushAppAlert } from '@/components/feedback/AppAlertProvider'

const EditEventPage = () => {
  const params = useParams<{ eventSlug: string }>()
  const eventSlug = params.eventSlug
  const router = useRouter()
  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [experience, setExperience] = useState<EventExperienceConfig | null>(null)
  const [quizConfig, setQuizConfig] = useState<QuizFormValue>(() => createQuizFormValue())
  const [previousQuestions, setPreviousQuestions] = useState<QuizQuestionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEvent = async () => {
    try {
      setLoading(true)
      setError(null)
      const [loadedEvent, loadedExperience, loadedQuiz] = await Promise.all([
        getAdminEvent(eventSlug),
        getAdminEventExperience(eventSlug),
        tryGetAdminQuiz(eventSlug)
      ])
      const questions = loadedQuiz ? await listAdminQuizQuestions(eventSlug) : []

      setEvent(loadedEvent)
      setExperience(loadedExperience)
      setPreviousQuestions(questions)
      setQuizConfig(createQuizFormValue(loadedQuiz, questions))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load event.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSlug])

  const handleImportedQuestions = (questions: QuizQuestionResponse[]) => {
    const drafts = createQuizFormValue(null, questions).questions
    setPreviousQuestions(previous => [...previous, ...questions])
    setQuizConfig(previous => ({ ...previous, questions: [...previous.questions, ...drafts] }))
  }

  const handleBulkDeleteQuestions = async (scope: QuizQuestionBulkDeleteScope) => {
    if (!event) return 0

    try {
      const result = scope === 'used'
        ? await deleteUsedAdminQuizQuestions(event.id)
        : await deleteAllAdminQuizQuestions(event.id)

      setPreviousQuestions(previous =>
        previous.map(question =>
          question.isActive && (scope === 'all' || question.isLocked)
            ? { ...question, isActive: false }
            : question
        )
      )

      pushAppAlert({
        severity: 'success',
        message: scope === 'used'
          ? `${result.deletedCount} used Quiz question(s) were deleted from the active Question Bank.`
          : `${result.deletedCount} Quiz question(s) were deleted from the active Question Bank.`
      })

      return result.deletedCount
    } catch (deleteError) {
      const message = deleteError instanceof Error
        ? deleteError.message
        : 'Unable to delete Quiz questions.'

      pushAppAlert({ severity: 'error', message })
      throw new Error(message)
    }
  }

  const handleSubmit = async ({ request, assets, experienceConfig }: EventFormSubmission) => {
    if (!event || submitting) return

    try {
      setSubmitting(true)
      setError(null)

      const quizError = validateQuizEditor(quizConfig)
      if (quizError) throw new Error(quizError)

      await updateAdminEvent(event.id, request)
      await updateAdminEventExperience(event.id, {
        enabledModules: experienceConfig.enabledModules,
        registrationFields: experienceConfig.registrationFields
      })

      if (assets.logo) await uploadAdminEventAsset(event.id, 'logo', assets.logo)
      if (assets.hero) await uploadAdminEventAsset(event.id, 'hero', assets.hero)
      if (assets.registration) await uploadAdminEventAsset(event.id, 'registration', assets.registration)

      await persistQuizEditor(event.id, quizConfig, previousQuestions)

      pushAppAlert({ severity: 'success', message: `${request.name} changes were saved.` })
      router.push(`/admin/events/${encodeURIComponent(event.id)}/dashboard`)
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to update event.'
      setError(message)
      pushAppAlert({ severity: 'error', message })

      try {
        const [freshEvent, freshExperience, freshQuiz] = await Promise.all([
          getAdminEvent(event.id),
          getAdminEventExperience(event.id),
          tryGetAdminQuiz(event.id)
        ])
        const freshQuestions = freshQuiz ? await listAdminQuizQuestions(event.id) : []
        setEvent(freshEvent)
        setExperience(freshExperience)
        setPreviousQuestions(freshQuestions)
        setQuizConfig(createQuizFormValue(freshQuiz, freshQuestions))
      } catch {
        // Keep the already loaded data so the edit form remains usable.
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress size={32} /></Box>
  }

  if (error && !event) {
    return (
      <Alert severity='error' action={<Button onClick={() => router.push('/admin/events')}>Back to events</Button>}>
        {error}
      </Alert>
    )
  }

  if (!event) return null

  if (event.status === 'Archived') {
    return <Alert severity='warning'>Archived events are read-only. Unarchive the event before changing its modules.</Alert>
  }

  if (event.kind !== 'Running' && event.kind !== 'Seminar') {
    return (
      <Alert
        severity='info'
        action={
          <Button onClick={() => router.push(`/admin/events/${encodeURIComponent(event.id)}/dashboard`)}>
            Open dashboard
          </Button>
        }
      >
        {event.kind} is a legacy event type. This modular editor currently supports Running and Seminar, so the existing event type is preserved and will not be converted automatically.
      </Alert>
    )
  }

  const mediaComplete = Boolean(event.logoUrl && event.heroImageUrl && event.registrationImageUrl && event.registrationImageTitle)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 2, alignItems: { md: 'center' } }}>
          <Box>
            <Typography variant='h4' fontWeight={700}>Edit Event</Typography>
            <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
              Update the event modules, registration fields, Quiz configuration, public content, and visual assets.
            </Typography>
          </Box>
          <Button
            component={NextLink}
            href={`/admin/events/${encodeURIComponent(event.id)}/dashboard`}
            variant='contained'
            startIcon={<i className='tabler-layout-dashboard' />}
          >
            Event Dashboard
          </Button>
        </Box>

        {!mediaComplete && (
          <Alert severity='warning' sx={{ mt: 3 }}>
            Complete the event logo, hero image, registration visual, and visual title before publishing this Draft event.
          </Alert>
        )}
      </Box>

      <QuizConfigurator
        value={quizConfig}
        disabled={submitting}
        onChange={setQuizConfig}
        onBulkDeleteQuestions={handleBulkDeleteQuestions}
      />

      {quizConfig.enabled && quizConfig.existingQuizId && (
        <QuestionBankParser
          eventId={event.id}
          disabled={submitting}
          onImported={handleImportedQuestions}
        />
      )}

      {quizConfig.enabled && !quizConfig.existingQuizId && (
        <Alert severity='info'>
          Save the event once to create the Quiz. After the Quiz exists, AI Parse can review and import a pasted Question Bank safely on the backend.
        </Alert>
      )}

      <EventForm
        event={event}
        experienceConfig={experience}
        submitLabel='Save Changes'
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/admin/events/${encodeURIComponent(event.id)}/dashboard`)}
      />
    </Box>
  )
}

export default EditEventPage
