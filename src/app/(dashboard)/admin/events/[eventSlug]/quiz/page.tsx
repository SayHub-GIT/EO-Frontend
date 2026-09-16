'use client'

import { useEffect, useMemo, useState } from 'react'
import NextLink from 'next/link'
import { useParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip, { type ChipProps } from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { getAdminEvent, type AdminEvent } from '@/lib/admin-events'
import { tryGetAdminQuiz, type QuizResponse } from '@/lib/admin-quiz'
import {
  cancelAdminQuizSession,
  createAdminQuizSession,
  getQuizRoomQrUrl,
  listAdminQuizSessions,
  openAdminQuizSession,
  type QuizSessionResponse,
  type QuizSessionStatus
} from '@/lib/quiz-rooms'

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
  const [quiz, setQuiz] = useState<QuizResponse | null>(null)
  const [sessions, setSessions] = useState<QuizSessionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [name, setName] = useState('')
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

  const allocatedQuestionCount = useMemo(
    () => sessions.filter(item => item.status !== 'Cancelled').reduce((sum, item) => sum + item.questionCount, 0),
    [sessions]
  )
  const activeQuestionCount = quiz?.activeQuestionCount ?? 0
  const estimatedAvailable = Math.max(0, activeQuestionCount - allocatedQuestionCount)

  const createSession = async () => {
    setError(null)
    setNotice(null)

    const parsedCapacity = Number(capacity)
    const parsedQuestions = Number(questionCount)
    const parsedDuration = Number(questionDuration)
    const parsedResultDelay = Number(resultDelay)
    const parsedLeaderboard = Number(leaderboardDuration)

    if (!name.trim()) return setError('Session name is required.')
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) return setError('Capacity must be at least 1.')
    if (!Number.isInteger(parsedQuestions) || parsedQuestions < 1 || parsedQuestions > 100) return setError('Question count must be between 1 and 100.')
    if (!Number.isInteger(parsedDuration) || parsedDuration < 3 || parsedDuration > 120) return setError('Question duration must be between 3 and 120 seconds.')
    if (!Number.isInteger(parsedResultDelay) || parsedResultDelay < 0 || parsedResultDelay > 30) return setError('Result delay must be between 0 and 30 seconds.')
    if (!Number.isInteger(parsedLeaderboard) || parsedLeaderboard < 0 || parsedLeaderboard > 60) return setError('Leaderboard duration must be between 0 and 60 seconds.')

    try {
      setSaving(true)
      const created = await createAdminQuizSession(eventId, {
        name: name.trim(),
        capacity: parsedCapacity,
        questionCount: parsedQuestions,
        questionDurationSeconds: parsedDuration,
        resultDelaySeconds: parsedResultDelay,
        leaderboardDurationSeconds: parsedLeaderboard
      })
      setSessions(previous => [created, ...previous])
      setName('')
      setNotice(`${created.name} created with room code ${created.roomCode}.`)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create Quiz session.')
    } finally {
      setSaving(false)
    }
  }

  const updateSession = async (session: QuizSessionResponse, action: 'open' | 'cancel') => {
    try {
      setActionId(session.id)
      setError(null)
      setNotice(null)
      const updated = action === 'open'
        ? await openAdminQuizSession(eventId, session.id)
        : await cancelAdminQuizSession(eventId, session.id)
      setSessions(previous => previous.map(item => item.id === updated.id ? updated : item))
      setNotice(action === 'open'
        ? `${updated.name} is open. Participants can join with ${updated.roomCode}.`
        : `${updated.name} was cancelled.`)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${action} Quiz session.`)
    } finally {
      setActionId(null)
    }
  }

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setNotice(`${label} copied.`)
    } catch {
      setError(`Unable to copy ${label.toLowerCase()}.`)
    }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress size={32} /></Box>
  if (!event) return <Alert severity='error'>{error ?? 'Event is unavailable.'}</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link component={NextLink} href='/admin/events' color='inherit' underline='hover'>Events</Link>
          <Link component={NextLink} href={`/admin/events/${encodeURIComponent(event.id)}/dashboard`} color='inherit' underline='hover'>{event.name}</Link>
          <Typography color='text.primary'>Quiz Sessions</Typography>
        </Breadcrumbs>
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
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>Question Bank items are allocated immediately and cannot overlap with another session.</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(240px,1.5fr) repeat(2,minmax(140px,.75fr))' }, gap: 2.5 }}>
                <TextField label='Session name' value={name} onChange={e => setName(e.target.value)} placeholder='e.g. MM Run Quiz • Session A' inputProps={{ maxLength: 160 }} />
                <TextField label='Capacity' type='number' value={capacity} onChange={e => setCapacity(e.target.value)} inputProps={{ min: 1, max: 100000 }} />
                <TextField label='Questions' type='number' value={questionCount} onChange={e => setQuestionCount(e.target.value)} inputProps={{ min: 1, max: 100 }} />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 2.5 }}>
                <TextField label='Question duration (sec)' type='number' value={questionDuration} onChange={e => setQuestionDuration(e.target.value)} inputProps={{ min: 3, max: 120 }} />
                <TextField label='Answer result delay (sec)' type='number' value={resultDelay} onChange={e => setResultDelay(e.target.value)} inputProps={{ min: 0, max: 30 }} />
                <TextField label='Leaderboard duration (sec)' type='number' value={leaderboardDuration} onChange={e => setLeaderboardDuration(e.target.value)} inputProps={{ min: 0, max: 60 }} />
              </Box>
              <Box><Button variant='contained' disabled={saving} startIcon={<i className='tabler-plus' />} onClick={() => void createSession()}>{saving ? 'Creating room...' : 'Create Room'}</Button></Box>
            </CardContent>
          </Card>

          <Box>
            <Typography variant='h5' fontWeight={700}>Rooms</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>Open a room for participants, then launch Live Host when you are ready.</Typography>
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
                      <Box component='img' src={getQuizRoomQrUrl(session.roomCode)} alt={`QR code for ${session.roomCode}`} sx={{ width: 150, height: 150, p: 1, bgcolor: 'common.white', borderRadius: 2, border: theme => `1px solid ${theme.palette.divider}` }} />
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
                        {session.status === 'Draft' && <Button variant='contained' color='success' disabled={actionId === session.id} startIcon={<i className='tabler-door-enter' />} onClick={() => void updateSession(session, 'open')}>Open Room</Button>}
                        {session.status !== 'Draft' && session.status !== 'Cancelled' && (
                          <Button component={NextLink} href={`/admin/events/${encodeURIComponent(eventId)}/quiz/${encodeURIComponent(session.id)}/live`} variant='contained' startIcon={<i className='tabler-device-gamepad-2' />}>
                            Live Host
                          </Button>
                        )}
                        {(session.status === 'Draft' || session.status === 'Open') && <Button variant='outlined' color='error' disabled={actionId === session.id} onClick={() => void updateSession(session, 'cancel')}>Cancel</Button>}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  )
}

export default QuizSessionWorkspace
