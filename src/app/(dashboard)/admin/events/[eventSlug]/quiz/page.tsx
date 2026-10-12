'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import NextLink from 'next/link'
import { useParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip, { type ChipProps } from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import ConfirmActionDialog from '@/components/feedback/ConfirmActionDialog'
import QuizRoomQrImage from '@/components/quiz/QuizRoomQrImage'
import { pushAppAlert } from '@/components/feedback/AppAlertProvider'

import { getAdminEvent, type AdminEvent } from '@/lib/admin-events'
import { getQuizEventWindow } from '@/lib/quiz-event-window'
import { tryGetAdminQuiz, type QuizResponse } from '@/lib/admin-quiz'
import {
  cancelAdminQuizSession,
  createAdminQuizSession,
  listAdminQuizSessions,
  openAdminQuizSession,
  type QuizSessionResponse,
  type QuizSessionStatus
} from '@/lib/quiz-rooms'
import { hasFieldErrors, integerValue, type FieldErrors } from '@/lib/form-validation'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'

type QuizSessionField = 'capacity' | 'questionCount' | 'questionDuration' | 'resultDelay' | 'leaderboardDuration'

const statusColor: Record<QuizSessionStatus, ChipProps['color']> = {
  Draft: 'default',
  Open: 'success',
  Countdown: 'warning',
  Active: 'primary',
  Leaderboard: 'info',
  Finished: 'secondary',
  Cancelled: 'error'
}

const QuizSessionWorkspace = () => {
  const params = useParams<{ eventSlug: string }>()
  const eventId = params.eventSlug

  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [nowTick, setNowTick] = useState(Date.now())
  const [quiz, setQuiz] = useState<QuizResponse | null>(null)
  const [sessions, setSessions] = useState<QuizSessionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<QuizSessionField>>({})
  const [cancelTarget, setCancelTarget] = useState<QuizSessionResponse | null>(null)
  const createLockRef = useRef(false)
  const actionLockRef = useRef(false)
  const manageAccess = usePermissionAccess('quiz.manage')

  const [capacity, setCapacity] = useState('100')
  const [questionCount, setQuestionCount] = useState('10')
  const [questionDuration, setQuestionDuration] = useState('10')
  const [resultDelay, setResultDelay] = useState('3')
  const [leaderboardDuration, setLeaderboardDuration] = useState('8')

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const [loadedEvent, loadedQuiz] = await Promise.all([
        getAdminEvent(eventId),
        tryGetAdminQuiz(eventId)
      ])
      setEvent(loadedEvent)
      setQuiz(loadedQuiz)
      if (loadedQuiz) {
        setQuestionDuration(String(loadedQuiz.defaultQuestionDurationSeconds))
        setSessions(await listAdminQuizSessions(eventId))
      } else {
        setSessions([])
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Quiz workspace.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 10_000)
    return () => window.clearInterval(timer)
  }, [])

  const quizWindow = event ? getQuizEventWindow(event, nowTick) : { active: false, message: '' }

  const allocatedQuestionCount = useMemo(
    () => sessions.filter(item => item.status !== 'Cancelled').reduce((sum, item) => sum + item.questionCount, 0),
    [sessions]
  )
  const activeQuestionCount = quiz?.activeQuestionCount ?? 0
  const estimatedAvailable = Math.max(0, activeQuestionCount - allocatedQuestionCount)

  const createSession = async () => {
    if (saving || createLockRef.current) return

    setError(null)
    setNotice(null)

    const nextErrors: FieldErrors<QuizSessionField> = {
      capacity: integerValue(capacity, { label: 'Capacity', min: 1, max: 100000 }),
      questionCount: integerValue(questionCount, { label: 'Question count', min: 1, max: 100 }),
      questionDuration: integerValue(questionDuration, { label: 'Question duration', min: 3, max: 120 }),
      resultDelay: integerValue(resultDelay, { label: 'Result delay', min: 0, max: 30 }),
      leaderboardDuration: integerValue(leaderboardDuration, { label: 'Leaderboard duration', min: 0, max: 60 })
    }

    setFieldErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) return

    const parsedCapacity = Number(capacity)
    const parsedQuestions = Number(questionCount)
    const parsedDuration = Number(questionDuration)
    const parsedResultDelay = Number(resultDelay)
    const parsedLeaderboard = Number(leaderboardDuration)

    createLockRef.current = true

    try {
      setSaving(true)
      const created = await createAdminQuizSession(eventId, {
        capacity: parsedCapacity,
        questionCount: parsedQuestions,
        questionDurationSeconds: parsedDuration,
        resultDelaySeconds: parsedResultDelay,
        leaderboardDurationSeconds: parsedLeaderboard
      })
      setSessions(previous => [created, ...previous])
      const message = `${created.name} created with room code ${created.roomCode}.`
      setNotice(message)
      pushAppAlert({ severity: 'success', message })
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Unable to create Quiz session.'
      setError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setSaving(false)
      createLockRef.current = false
    }
  }

  const updateSession = async (session: QuizSessionResponse, action: 'open' | 'cancel') => {
    if (actionId || actionLockRef.current) return

    actionLockRef.current = true

    try {
      setActionId(session.id)
      setError(null)
      setNotice(null)
      const updated = action === 'open'
        ? await openAdminQuizSession(eventId, session.id)
        : await cancelAdminQuizSession(eventId, session.id)
      setSessions(previous => previous.map(item => item.id === updated.id ? updated : item))
      const message = action === 'open'
        ? `${updated.name} is open. Participants can join with ${updated.roomCode}.`
        : `${updated.name} was cancelled.`
      setNotice(message)
      pushAppAlert({ severity: action === 'open' ? 'success' : 'warning', message })
      if (action === 'cancel') setCancelTarget(null)
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : `Unable to ${action} Quiz session.`
      setError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setActionId(null)
      actionLockRef.current = false
    }
  }

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      const message = `${label} copied.`
      setNotice(message)
      pushAppAlert({ severity: 'info', message, duration: 2200 })
    } catch {
      setError(`Unable to copy ${label.toLowerCase()}.`)
    }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress size={32} /></Box>
  if (!event) return <Alert severity='error'>{error ?? 'Event is unavailable.'}</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 2.5 }}>
          <Box>
            <Typography variant='h4' fontWeight={750}>Quiz Sessions</Typography>
            <Typography color='text.secondary' sx={{ mt: 1, maxWidth: 800 }}>
              Prepare rooms, share code or QR, then open the Live Host screen to run the realtime Quiz.
            </Typography>
          </Box>
          <Button component={NextLink} href={`/admin/events/${encodeURIComponent(event.id)}/edit#quiz-configuration`} variant='outlined' startIcon={<i className='tabler-settings' />} sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}>
            Quiz configuration
          </Button>
        </Box>
      </Box>

      {error && <Alert severity='error'>{error}</Alert>}
      {notice && <Alert severity='success'>{notice}</Alert>}

      {!quiz ? (
        <Alert severity='info' action={<Button component={NextLink} href={`/admin/events/${encodeURIComponent(event.id)}/edit#quiz-configuration`}>Add Quiz</Button>}>
          This event does not have a Quiz yet. Add and save the Quiz configuration before creating rooms.
        </Alert>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2.5 }}>
            {[
              ['Question Bank', activeQuestionCount, 'active questions'],
              ['Unused estimate', estimatedAvailable, 'backend enforces exact allocation'],
              ['Rooms', sessions.length, 'created sessions']
            ].map(([label, value, caption]) => (
              <Card key={String(label)} variant='outlined'><CardContent><Typography variant='body2' color='text.secondary'>{label}</Typography><Typography variant='h4' fontWeight={750} sx={{ mt: 1 }}>{value}</Typography><Typography variant='caption' color='text.secondary'>{caption}</Typography></CardContent></Card>
            ))}
          </Box>

          <Card>
            <CardContent sx={{ p: { xs: 3, md: 4 }, display: 'grid', gap: 3 }}>
              <Box>
                <Typography variant='h6' fontWeight={700}>Create a new room</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>The session number is assigned automatically from creation order. Question Bank items are allocated immediately and cannot overlap with another active session.</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))' }, gap: 2.5 }}>
                <TextField label='Capacity' type='number' value={capacity} onChange={e => { setCapacity(e.target.value); setFieldErrors(current => ({ ...current, capacity: undefined })) }} error={Boolean(fieldErrors.capacity)} helperText={fieldErrors.capacity} inputProps={{ min: 1, max: 100000, step: 1, inputMode: 'numeric' }} />
                <TextField label='Questions' type='number' value={questionCount} onChange={e => { setQuestionCount(e.target.value); setFieldErrors(current => ({ ...current, questionCount: undefined })) }} error={Boolean(fieldErrors.questionCount)} helperText={fieldErrors.questionCount} inputProps={{ min: 1, max: 100, step: 1, inputMode: 'numeric' }} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 2.5 }}>
                <TextField label='Question duration (sec)' type='number' value={questionDuration} onChange={e => { setQuestionDuration(e.target.value); setFieldErrors(current => ({ ...current, questionDuration: undefined })) }} error={Boolean(fieldErrors.questionDuration)} helperText={fieldErrors.questionDuration} inputProps={{ min: 3, max: 120, step: 1, inputMode: 'numeric' }} />
                <TextField label='Answer result delay (sec)' type='number' value={resultDelay} onChange={e => { setResultDelay(e.target.value); setFieldErrors(current => ({ ...current, resultDelay: undefined })) }} error={Boolean(fieldErrors.resultDelay)} helperText={fieldErrors.resultDelay} inputProps={{ min: 0, max: 30, step: 1, inputMode: 'numeric' }} />
                <TextField label='Leaderboard duration (sec)' type='number' value={leaderboardDuration} onChange={e => { setLeaderboardDuration(e.target.value); setFieldErrors(current => ({ ...current, leaderboardDuration: undefined })) }} error={Boolean(fieldErrors.leaderboardDuration)} helperText={fieldErrors.leaderboardDuration} inputProps={{ min: 0, max: 60, step: 1, inputMode: 'numeric' }} />
              </Box>
              <Box><Button variant='contained' disabled={saving || !manageAccess.allowed} startIcon={<i className='tabler-plus' />} onClick={() => void createSession()}>{saving ? 'Creating room...' : 'Create Room'}</Button></Box>
            </CardContent>
          </Card>

          <Box>
            <Typography variant='h5' fontWeight={700}>Rooms</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>Ruang dapat disiapkan lebih awal. Live Host hanya bisa dibuka ketika event sedang berlangsung.</Typography>
            {!quizWindow.active && <Alert severity='info' sx={{ mt: 2 }}>{quizWindow.message}</Alert>}
          </Box>

          {sessions.length === 0 ? (
            <Card variant='outlined'><CardContent sx={{ py: 7, textAlign: 'center' }}><i className='tabler-device-gamepad-2 text-4xl' /><Typography variant='h6' sx={{ mt: 2 }}>No Quiz rooms yet</Typography><Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>Create the first session above.</Typography></CardContent></Card>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'repeat(2,1fr)' }, gap: 2.5 }}>
              {sessions.map(session => (
                <Card key={session.id} variant='outlined'>
                  <CardContent sx={{ display: 'grid', gap: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
                      <Box><Typography variant='h6' fontWeight={700}>{session.name}</Typography><Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>{session.questionCount} questions • {session.questionDurationSeconds}s each</Typography></Box>
                      <Chip label={session.status} color={statusColor[session.status]} variant='tonal' size='small' />
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '150px minmax(0,1fr)' }, gap: 3, alignItems: 'center' }}>
                      <QuizRoomQrImage eventId={event.id} roomCode={session.roomCode} size={150} />
                      <Box sx={{ display: 'grid', gap: 1.5 }}>
                        <Box><Typography variant='caption' color='text.secondary'>ROOM CODE</Typography><Typography variant='h4' fontWeight={800} letterSpacing={3}>{session.roomCode}</Typography></Box>
                        <Typography variant='body2' color='text.secondary' sx={{ wordBreak: 'break-all' }}>{session.joinUrl}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button size='small' variant='outlined' startIcon={<i className='tabler-copy' />} onClick={() => void copy(session.roomCode, 'Room code')}>Copy code</Button>
                          <Button size='small' variant='outlined' startIcon={<i className='tabler-link' />} onClick={() => void copy(session.joinUrl, 'Join link')}>Copy link</Button>
                        </Box>
                      </Box>
                    </Box>

                    <Divider />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                      <Typography variant='body2' color='text.secondary'><strong>{session.participantCount}</strong> joined • {session.remainingCapacity} of {session.capacity} spots left</Typography>
                      <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
                        {session.status === 'Draft' && <Button variant='contained' color='success' disabled={Boolean(actionId) || !manageAccess.allowed} startIcon={<i className='tabler-door-enter' />} onClick={() => void updateSession(session, 'open')}>Open Room</Button>}
                        {session.status !== 'Draft' && session.status !== 'Cancelled' && (
                          <Button
                            component={NextLink}
                            href={`/quiz/host/${encodeURIComponent(eventId)}/${encodeURIComponent(session.id)}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            variant='contained'
                            disabled={!manageAccess.allowed || !quizWindow.active}
                            title={!quizWindow.active ? quizWindow.message : 'Buka layar host Quiz'}
                            startIcon={<i className='tabler-device-gamepad-2' />}
                          >
                            Live Host
                          </Button>
                        )}
                        {(session.status === 'Draft' || session.status === 'Open') && <Button variant='outlined' color='error' disabled={Boolean(actionId) || !manageAccess.allowed} onClick={() => setCancelTarget(session)}>Cancel</Button>}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </>
      )}
      <ConfirmActionDialog
        open={Boolean(cancelTarget)}
        title='Cancel Quiz room?'
        description='Participants will no longer be able to use this room. The session remains visible as Cancelled for operational history.'
        confirmLabel='Confirm Cancel'
        loading={Boolean(cancelTarget && actionId === cancelTarget.id)}
        onClose={() => {
          if (!actionId) setCancelTarget(null)
        }}
        onConfirm={async () => {
          if (!cancelTarget || actionId) return
          await updateSession(cancelTarget, 'cancel')
        }}
        details={cancelTarget ? [
          { label: 'Session', value: cancelTarget.name },
          { label: 'Room code', value: cancelTarget.roomCode },
          { label: 'Participants', value: String(cancelTarget.participantCount) },
          { label: 'Status', value: cancelTarget.status }
        ] : []}
      />
    </Box>
  )
}

export default QuizSessionWorkspace
