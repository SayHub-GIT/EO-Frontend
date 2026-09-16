'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import NextLink from 'next/link'
import { useParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'

import { getAdminEvent, type AdminEvent } from '@/lib/admin-events'
import {
  createAdminQuizHubClient,
  deriveServerOffsetMs,
  finishAdminQuiz,
  getAdminQuizLiveState,
  nextAdminQuizQuestion,
  secondsUntil,
  startAdminQuizLive,
  type QuizCountdown,
  type QuizFinished,
  type QuizHostQuestion,
  type QuizLeaderboardEntry,
  type QuizLeaderboardShown,
  type QuizLiveState,
  type QuizQuestionReveal
} from '@/lib/quiz-live'
import type { SignalRJsonClient } from '@/lib/signalr-json'

const answerStyles = [
  { bg: '#0077B6', accent: '#53D8FB', shape: '▲' },
  { bg: '#004C6D', accent: '#00B8A9', shape: '◆' },
  { bg: '#00A6A6', accent: '#C9F7F5', shape: '●' },
  { bg: '#D84A4A', accent: '#FFD66B', shape: '■' }
]

const Leaderboard = ({ entries, title = 'Top 10' }: { entries: QuizLeaderboardEntry[]; title?: string }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
      <Typography variant='h5' fontWeight={800}>{title}</Typography>
      <Box sx={{ mt: 3, display: 'grid', gap: 1.25 }}>
        {entries.length === 0 ? (
          <Typography color='text.secondary'>Scores will appear after the configured result delay.</Typography>
        ) : entries.slice(0, 10).map(entry => (
          <Box
            key={`${entry.rank}-${entry.displayName}`}
            sx={{
              display: 'grid',
              gridTemplateColumns: '46px minmax(0,1fr) auto',
              gap: 1.5,
              alignItems: 'center',
              px: 2,
              py: 1.5,
              borderRadius: 2,
              bgcolor: entry.rank <= 3 ? 'action.selected' : 'action.hover'
            }}
          >
            <Typography fontWeight={850}>#{entry.rank}</Typography>
            <Typography fontWeight={700} noWrap>{entry.displayName}</Typography>
            <Typography fontWeight={850}>{entry.score.toLocaleString()}</Typography>
          </Box>
        ))}
      </Box>
    </CardContent>
  </Card>
)

const QuizHostLivePage = () => {
  const params = useParams<{ eventSlug: string; sessionId: string }>()
  const eventId = params.eventSlug
  const sessionId = params.sessionId

  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [state, setState] = useState<QuizLiveState | null>(null)
  const [question, setQuestion] = useState<QuizHostQuestion | null>(null)
  const [countdown, setCountdown] = useState<QuizCountdown | null>(null)
  const [reveal, setReveal] = useState<QuizQuestionReveal | null>(null)
  const [leaderboard, setLeaderboard] = useState<QuizLeaderboardShown | null>(null)
  const [finished, setFinished] = useState<QuizFinished | null>(null)
  const [nextReady, setNextReady] = useState(false)
  const [serverOffsetMs, setServerOffsetMs] = useState(0)
  const [nowTick, setNowTick] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef<SignalRJsonClient | null>(null)
  const retryRef = useRef<number | null>(null)

  const syncState = useCallback((next: QuizLiveState) => {
    setState(next)
    setQuestion(next.currentQuestion)
    setServerOffsetMs(deriveServerOffsetMs(next.serverTimeUtc))

    if (next.status === 'Leaderboard') {
      setNextReady(true)
      setReveal(null)
      setLeaderboard(null)
    } else if (next.status === 'Finished') {
      setNextReady(false)
    } else {
      setNextReady(false)
    }
  }, [])

  const connect = useCallback(async () => {
    if (clientRef.current?.isConnected) return

    const client = createAdminQuizHubClient()
    clientRef.current = client
    setConnecting(true)

    client.on<QuizCountdown>('CountdownStarted', value => {
      setCountdown(value)
      setReveal(null)
      setLeaderboard(null)
      setFinished(null)
      setNextReady(false)
      setState(previous => previous ? { ...previous, status: 'Countdown' } : previous)
    })

    client.on<QuizHostQuestion>('QuestionStarted', value => {
      setQuestion(value)
      setCountdown(null)
      setReveal(null)
      setLeaderboard(null)
      setNextReady(false)
      setState(previous => previous
        ? { ...previous, status: 'Active', currentQuestion: value, answerCount: 0 }
        : previous)
    })

    client.on<{ sessionQuestionId: string; answerCount: number }>('AnswerCountUpdated', value => {
      setState(previous => previous ? { ...previous, answerCount: value.answerCount } : previous)
    })

    client.on<QuizQuestionReveal>('QuestionRevealed', value => {
      setReveal(value)
      setLeaderboard(null)
      setNextReady(false)
      setState(previous => previous
        ? { ...previous, status: 'Leaderboard', leaderboard: [] }
        : previous)
    })

    client.on<QuizLeaderboardShown>('LeaderboardShown', value => {
      setLeaderboard(value)
      setState(previous => previous
        ? { ...previous, status: 'Leaderboard', leaderboard: value.leaderboard }
        : previous)
    })

    client.on<{ hasMoreQuestions: boolean }>('NextActionReady', value => {
      setNextReady(true)
      setState(previous => previous ? { ...previous, hasMoreQuestions: value.hasMoreQuestions } : previous)
    })

    client.on<QuizFinished>('QuizFinished', value => {
      setFinished(value)
      setState(previous => previous
        ? { ...previous, status: 'Finished', leaderboard: value.leaderboard }
        : previous)
      setNextReady(false)
    })

    client.onClose(() => {
      setConnecting(true)
      if (retryRef.current) window.clearTimeout(retryRef.current)
      retryRef.current = window.setTimeout(() => void connect(), 1200)
    })

    try {
      await client.start()
      const liveState = await client.invoke<QuizLiveState>('JoinHost', sessionId)
      syncState(liveState)
      setConnecting(false)
      setError(null)
    } catch (connectError) {
      client.stop()
      setError(connectError instanceof Error ? connectError.message : 'Unable to connect to realtime Quiz.')
      if (retryRef.current) window.clearTimeout(retryRef.current)
      retryRef.current = window.setTimeout(() => void connect(), 1800)
    }
  }, [sessionId, syncState])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [loadedEvent, liveState] = await Promise.all([
          getAdminEvent(eventId),
          getAdminQuizLiveState(eventId, sessionId)
        ])
        setEvent(loadedEvent)
        syncState(liveState)
        await connect()
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load Quiz host screen.')
      } finally {
        setLoading(false)
      }
    }

    void load()

    return () => {
      if (retryRef.current) window.clearTimeout(retryRef.current)
      clientRef.current?.stop()
    }
  }, [connect, eventId, sessionId, syncState])

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [])

  const runAction = async (action: 'start' | 'next' | 'finish') => {
    try {
      setBusy(true)
      setError(null)

      if (action === 'start') {
        const result = await startAdminQuizLive(eventId, sessionId)
        setCountdown(result)
        setState(previous => previous ? { ...previous, status: 'Countdown' } : previous)
      } else if (action === 'next') {
        const result = await nextAdminQuizQuestion(eventId, sessionId)
        setQuestion(result)
        setReveal(null)
        setLeaderboard(null)
        setNextReady(false)
        setState(previous => previous
          ? { ...previous, status: 'Active', currentQuestion: result, answerCount: 0 }
          : previous)
      } else {
        const result = await finishAdminQuiz(eventId, sessionId)
        setFinished(result)
        setState(previous => previous
          ? { ...previous, status: 'Finished', leaderboard: result.leaderboard }
          : previous)
        setNextReady(false)
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Quiz action failed.')
    } finally {
      setBusy(false)
    }
  }

  const remaining = useMemo(() => {
    if (!question) return 0
    void nowTick
    return secondsUntil(question.deadlineAtUtc, serverOffsetMs)
  }, [nowTick, question, serverOffsetMs])

  const countdownValue = useMemo(() => {
    if (!countdown) return null
    void nowTick
    const seconds = secondsUntil(countdown.startsAtUtc, serverOffsetMs)
    if (seconds <= 0.45) return 'QUIZ START!'
    return String(Math.max(1, Math.ceil(seconds)))
  }, [countdown, nowTick, serverOffsetMs])

  const recoveredLeaderboard = state.status === 'Leaderboard' && reveal === null
    ? state.leaderboard
    : []
  const visibleLeaderboard = finished?.leaderboard ?? leaderboard?.leaderboard ?? recoveredLeaderboard
  const podium = finished?.podium ?? leaderboard?.podium ?? visibleLeaderboard.slice(0, 3)
  const waitingForLeaderboard = state.status === 'Leaderboard' && visibleLeaderboard.length === 0

  if (loading || !state || !event) {
    return <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  }

  return (
    <Box sx={{ minHeight: '100dvh', pb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant='overline' color='primary.main' fontWeight={800}>PERTAMINA EVENT • LIVE QUIZ</Typography>
          <Typography variant='h4' fontWeight={850}>{event.name}</Typography>
          <Typography color='text.secondary' sx={{ mt: 0.75 }}>Room {state.roomCode} • {state.participantCount} participant(s)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            size='small'
            variant='tonal'
            color={connecting ? 'warning' : 'success'}
            label={connecting ? 'Reconnecting...' : 'Realtime connected'}
          />
          <Button component={NextLink} href={`/admin/events/${encodeURIComponent(eventId)}/quiz`} variant='outlined'>Rooms</Button>
        </Box>
      </Box>

      {error && <Alert severity='error' sx={{ mb: 3 }}>{error}</Alert>}

      {countdown && state.status === 'Countdown' ? (
        <Card sx={{ minHeight: '68vh', display: 'grid', placeItems: 'center', overflow: 'hidden', position: 'relative' }}>
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Typography variant='overline' color='text.secondary'>GET READY</Typography>
            <Typography
              sx={{
                mt: 2,
                fontSize: countdownValue === 'QUIZ START!' ? { xs: '3rem', md: '6rem' } : { xs: '7rem', md: '12rem' },
                lineHeight: 1,
                fontWeight: 950,
                letterSpacing: -4,
                background: 'linear-gradient(135deg, #00AEEF 5%, #0066A6 45%, #ED1C24 100%)',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}
            >
              {countdownValue}
            </Typography>
          </Box>
        </Card>
      ) : state.status === 'Countdown' ? (
        <Card sx={{ minHeight: 520, display: 'grid', placeItems: 'center' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <CircularProgress size={44} />
            <Typography variant='h4' fontWeight={900} sx={{ mt: 3 }}>Countdown in progress…</Typography>
            <Typography color='text.secondary' sx={{ mt: 1 }}>Realtime state will resume automatically.</Typography>
          </CardContent>
        </Card>
      ) : state.status === 'Active' && question ? (
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Card sx={{ overflow: 'hidden' }}>
            <CardContent sx={{ p: { xs: 3, md: 5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                <Typography variant='overline' color='text.secondary'>QUESTION {question.sequence} / {question.totalQuestions}</Typography>
                <Chip label={`${state.answerCount} / ${state.participantCount} answered`} color='primary' variant='tonal' />
              </Box>
              <Typography variant='h3' fontWeight={850} sx={{ mt: 2, maxWidth: 1100 }}>{question.questionText}</Typography>
              {question.questionImageUrl && (
                <Box component='img' src={question.questionImageUrl} alt='' sx={{ display: 'block', maxWidth: 680, maxHeight: 320, width: '100%', objectFit: 'contain', mx: 'auto', mt: 3, borderRadius: 3 }} />
              )}

              <Box sx={{ mt: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography fontWeight={800}>{remaining.toFixed(1)}s</Typography>
                  <Typography color='text.secondary'>Server timer</Typography>
                </Box>
                <LinearProgress variant='determinate' value={Math.max(0, Math.min(100, remaining / question.durationSeconds * 100))} sx={{ height: 10, borderRadius: 10 }} />
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
            {question.answers.map((answer, index) => {
              const visual = answerStyles[index]

              return (
                <Box key={index} sx={{ minHeight: 132, p: 3, borderRadius: 3, bgcolor: visual.bg, color: 'common.white', display: 'flex', gap: 2.5, alignItems: 'center' }}>
                  <Box sx={{ width: 64, height: 64, flex: '0 0 auto', borderRadius: 2, bgcolor: 'rgba(255,255,255,.13)', color: visual.accent, display: 'grid', placeItems: 'center', fontSize: 32, fontWeight: 900 }}>{visual.shape}</Box>
                  <Typography variant='h5' fontWeight={800}>{answer}</Typography>
                </Box>
              )
            })}
          </Box>
        </Box>
      ) : state.status === 'Leaderboard' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0,1.4fr) minmax(340px,.6fr)' }, gap: 3 }}>
          <Card>
            <CardContent sx={{ p: { xs: 3, md: 5 } }}>
              <Typography variant='overline' color='primary.main' fontWeight={800}>PODIUM</Typography>

              {waitingForLeaderboard ? (
                <Box sx={{ minHeight: 330, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                  <Box>
                    <CircularProgress size={42} />
                    <Typography variant='h4' fontWeight={900} sx={{ mt: 3 }}>Scores coming up…</Typography>
                    <Typography color='text.secondary' sx={{ mt: 1 }}>Waiting for the configured result delay.</Typography>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, alignItems: 'end', gap: 2, mt: 4 }}>
                  {[podium[1], podium[0], podium[2]].map((entry, index) => {
                    const place = [2, 1, 3][index]
                    const heights = [150, 210, 120]

                    return (
                      <Box key={place} sx={{ textAlign: 'center' }}>
                        <Typography variant='h5' fontWeight={850}>{entry?.displayName ?? '—'}</Typography>
                        <Typography color='text.secondary'>{entry ? entry.score.toLocaleString() : ''}</Typography>
                        <Box sx={{ mt: 1.5, height: heights[index], borderRadius: '18px 18px 0 0', bgcolor: place === 1 ? 'primary.main' : 'action.selected', display: 'grid', placeItems: 'center' }}>
                          <Typography variant='h2' fontWeight={950}>#{place}</Typography>
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              )}

              {reveal && (
                <Alert severity='success' sx={{ mt: 4 }}>
                  Correct answer: {['A', 'B', 'C', 'D'][reveal.correctAnswerIndex]}
                  {reveal.shortExplanation ? ` • ${reveal.shortExplanation}` : ''}
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 1.5, mt: 4, flexWrap: 'wrap' }}>
                {nextReady && state.hasMoreQuestions && (
                  <Button variant='contained' size='large' disabled={busy} onClick={() => void runAction('next')}>Next Question</Button>
                )}
                {nextReady && !state.hasMoreQuestions && (
                  <Button variant='contained' color='success' size='large' disabled={busy} onClick={() => void runAction('finish')}>Finish Quiz</Button>
                )}
                {!nextReady && <Chip label='Result display in progress…' variant='tonal' color='info' />}
              </Box>
            </CardContent>
          </Card>
          <Leaderboard entries={visibleLeaderboard} />
        </Box>
      ) : state.status === 'Finished' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0,1.4fr) minmax(340px,.6fr)' }, gap: 3 }}>
          <Card sx={{ display: 'grid', placeItems: 'center', minHeight: 560 }}>
            <CardContent sx={{ textAlign: 'center', width: '100%', p: { xs: 3, md: 5 } }}>
              <Typography variant='overline' color='primary.main' fontWeight={800}>FINAL PODIUM</Typography>
              <Typography variant='h2' fontWeight={950} sx={{ mt: 1 }}>Quiz Complete!</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, alignItems: 'end', gap: 2, mt: 5 }}>
                {[podium[1], podium[0], podium[2]].map((entry, index) => {
                  const place = [2, 1, 3][index]

                  return (
                    <Box key={place} sx={{ p: 3, borderRadius: 3, bgcolor: place === 1 ? 'primary.main' : 'action.selected', color: place === 1 ? 'primary.contrastText' : 'text.primary' }}>
                      <Typography variant='h3' fontWeight={950}>#{place}</Typography>
                      <Typography variant='h5' fontWeight={850} sx={{ mt: 1 }}>{entry?.displayName ?? '—'}</Typography>
                      <Typography>{entry?.score.toLocaleString() ?? ''}</Typography>
                    </Box>
                  )
                })}
              </Box>
            </CardContent>
          </Card>
          <Leaderboard entries={visibleLeaderboard} title='Final Top 10' />
        </Box>
      ) : (
        <Card sx={{ minHeight: 520, display: 'grid', placeItems: 'center' }}>
          <CardContent sx={{ textAlign: 'center', maxWidth: 620 }}>
            <Box sx={{ width: 94, height: 94, borderRadius: '50%', mx: 'auto', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center' }}><i className='tabler-device-gamepad-2 text-5xl' /></Box>
            <Typography variant='h3' fontWeight={900} sx={{ mt: 3 }}>Room {state.roomCode}</Typography>
            <Typography color='text.secondary' sx={{ mt: 1.5, fontSize: 18 }}>{state.participantCount} participant(s) ready</Typography>
            {state.status === 'Open' && <Button variant='contained' size='large' disabled={busy || state.participantCount === 0} onClick={() => void runAction('start')} sx={{ mt: 4, px: 5 }}>Start Quiz</Button>}
            {state.status === 'Draft' && <Alert severity='info' sx={{ mt: 4 }}>Open this room from the Quiz Sessions workspace before starting.</Alert>}
            {state.status === 'Cancelled' && <Alert severity='error' sx={{ mt: 4 }}>This Quiz session was cancelled.</Alert>}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

export default QuizHostLivePage
