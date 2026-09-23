'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import AdminSessionGuard from '@/components/auth/AdminSessionGuard'
import QuizRoomQrImage from '@/components/quiz/QuizRoomQrImage'
import { listAdminQuizSessions } from '@/lib/quiz-rooms'
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
  type QuizLobbyParticipant,
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

const QuizHostLiveContent = () => {
  const params = useParams<{ eventSlug: string; sessionId: string }>()
  const eventId = params.eventSlug
  const sessionId = params.sessionId

  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [sessionName, setSessionName] = useState('Quiz Session')
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [state, setState] = useState<QuizLiveState | null>(null)
  const [question, setQuestion] = useState<QuizHostQuestion | null>(null)
  const [countdown, setCountdown] = useState<QuizCountdown | null>(null)
  const [reveal, setReveal] = useState<QuizQuestionReveal | null>(null)
  const [leaderboard, setLeaderboard] = useState<QuizLeaderboardShown | null>(null)
  const [finished, setFinished] = useState<QuizFinished | null>(null)
  const [podiumRevealStage, setPodiumRevealStage] = useState(0)
  const [nextReady, setNextReady] = useState(false)
  const [serverOffsetMs, setServerOffsetMs] = useState(0)
  const [nowTick, setNowTick] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef<SignalRJsonClient | null>(null)
  const pageRef = useRef<HTMLDivElement | null>(null)
  const retryRef = useRef<number | null>(null)
  const connectingRef = useRef(false)
  const unmountedRef = useRef(false)

  const syncState = useCallback((next: QuizLiveState) => {
    setState(next)
    setQuestion(next.currentQuestion)
    setServerOffsetMs(deriveServerOffsetMs(next.serverTimeUtc))
    setNextReady(previous => next.status === 'Leaderboard' ? previous : false)

    if (next.status !== 'Countdown') setCountdown(null)

    if (next.status === 'Leaderboard') {
      setReveal(null)
      setLeaderboard(null)
      setFinished(null)
    } else if (next.status === 'Finished') {
      setReveal(null)
      setLeaderboard(null)
      setFinished({
        sessionId: next.sessionId,
        podium: next.leaderboard.slice(0, 3),
        leaderboard: next.leaderboard
      })
    } else {
      setReveal(null)
      setLeaderboard(null)
      setFinished(null)
    }
  }, [])

  const connect = useCallback(async () => {
    if (unmountedRef.current || connectingRef.current || clientRef.current?.isConnected) return

    connectingRef.current = true
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

    client.on<{ sessionId: string; participantCount: number; participants: QuizLobbyParticipant[] }>(
      'ParticipantCountUpdated',
      value => {
        if (value.sessionId !== sessionId) return
        setState(previous => previous
          ? {
              ...previous,
              participantCount: value.participantCount,
              participants: Array.isArray(value.participants) ? value.participants : previous.participants
            }
          : previous)
      }
    )

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
      if (unmountedRef.current) return

      setConnecting(true)
      connectingRef.current = false
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
      if (!unmountedRef.current) {
        if (retryRef.current) window.clearTimeout(retryRef.current)
        retryRef.current = window.setTimeout(() => void connect(), 1800)
      }
    } finally {
      connectingRef.current = false
    }
  }, [sessionId, syncState])

  useEffect(() => {
    unmountedRef.current = false

    const load = async () => {
      try {
        setLoading(true)
        const [loadedEvent, liveState, sessions] = await Promise.all([
          getAdminEvent(eventId),
          getAdminQuizLiveState(eventId, sessionId),
          listAdminQuizSessions(eventId)
        ])
        setEvent(loadedEvent)
        const currentSession = sessions.find(item => item.id === sessionId)
        setSessionName(currentSession?.name || 'Quiz Session')
        setBackgroundUrl(currentSession?.backgroundUrl ?? null)
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
      unmountedRef.current = true
      connectingRef.current = false
      if (retryRef.current) window.clearTimeout(retryRef.current)
      retryRef.current = null
      clientRef.current?.stop()
    }
  }, [connect, eventId, sessionId, syncState])

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (state?.status !== 'Finished') {
      setPodiumRevealStage(0)
      return
    }

    setPodiumRevealStage(0)

    const third = window.setTimeout(() => setPodiumRevealStage(1), 450)
    const second = window.setTimeout(() => setPodiumRevealStage(2), 1150)
    const first = window.setTimeout(() => setPodiumRevealStage(3), 1900)

    return () => {
      window.clearTimeout(third)
      window.clearTimeout(second)
      window.clearTimeout(first)
    }
  }, [state?.status])

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === pageRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === pageRef.current) {
        await document.exitFullscreen()
      } else if (pageRef.current?.requestFullscreen) {
        await pageRef.current.requestFullscreen()
      }
    } catch {
      // The page still uses the dedicated blank-layout projector view when browser fullscreen is unavailable.
    }
  }

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

  const recoveredLeaderboard =
    (state?.status === 'Leaderboard' && reveal === null) || state?.status === 'Finished'
      ? state.leaderboard
      : []
  const visibleLeaderboard = finished?.leaderboard ?? leaderboard?.leaderboard ?? recoveredLeaderboard
  const podium = finished?.podium ?? leaderboard?.podium ?? visibleLeaderboard.slice(0, 3)
  const waitingForLeaderboard = state?.status === 'Leaderboard' && visibleLeaderboard.length === 0

  if (loading || !state || !event) {
    return <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  }

  return (
    <Box
      ref={pageRef}
      sx={{
        minHeight: '100dvh',
        p: { xs: 2, md: 3.5 },
        bgcolor: 'background.default',
        backgroundImage: backgroundUrl
          ? `linear-gradient(rgba(8, 16, 28, 0.58), rgba(8, 16, 28, 0.68)), url(${JSON.stringify(backgroundUrl)})`
          : undefined,
        backgroundSize: backgroundUrl ? 'cover' : undefined,
        backgroundPosition: backgroundUrl ? 'center' : undefined,
        backgroundAttachment: backgroundUrl ? 'fixed' : undefined,
        overflowY: 'auto'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.25, minWidth: 0 }}>
          <Box
            component='img'
            src={event.logoUrl || '/EO Navbar.png'}
            alt={`${event.name} logo`}
            sx={{ width: 'auto', maxWidth: 150, height: 54, objectFit: 'contain', flexShrink: 0 }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='h4' fontWeight={850} noWrap>{event.name}</Typography>
            <Typography color='text.secondary' sx={{ mt: 0.4 }}>{sessionName}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
          {state.status === 'Leaderboard' && nextReady && state.hasMoreQuestions && (
            <Button variant='contained' disabled={busy} onClick={() => void runAction('next')}>
              Next Question
            </Button>
          )}
          {state.status === 'Leaderboard' && nextReady && !state.hasMoreQuestions && (
            <Button variant='contained' color='success' disabled={busy} onClick={() => void runAction('finish')}>
              Finish Quiz
            </Button>
          )}
          {state.status === 'Open' && (
            <Button
              variant='contained'
              disabled={busy || state.participantCount === 0}
              onClick={() => void runAction('start')}
            >
              Start Quiz
            </Button>
          )}
          <Button
            variant='outlined'
            onClick={() => void toggleFullscreen()}
            startIcon={<i className={fullscreen ? 'tabler-minimize' : 'tabler-maximize'} />}
          >
            {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
        </Box>
      </Box>

      <Chip
        size='small'
        variant='tonal'
        color={connecting ? 'warning' : 'success'}
        label={connecting ? 'Reconnecting...' : 'Realtime connected'}
        sx={{
          position: 'fixed',
          right: { xs: 14, md: 24 },
          bottom: { xs: 14, md: 24 },
          zIndex: 1400,
          boxShadow: 3
        }}
      />

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
        <Box sx={{ display: 'grid', gap: 3 }}>
          {reveal && (
            <Alert severity='success'>
              Correct answer: {['A', 'B', 'C', 'D'][reveal.correctAnswerIndex]}
              {reveal.shortExplanation ? ` • ${reveal.shortExplanation}` : ''}
            </Alert>
          )}

          {waitingForLeaderboard ? (
            <Card sx={{ minHeight: 430, display: 'grid', placeItems: 'center' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <CircularProgress size={42} />
                <Typography variant='h4' fontWeight={900} sx={{ mt: 3 }}>Scores coming up…</Typography>
                <Typography color='text.secondary' sx={{ mt: 1 }}>Waiting for the configured result delay.</Typography>
              </CardContent>
            </Card>
          ) : (
            <Leaderboard entries={visibleLeaderboard} title='Scoreboard' />
          )}

          {!nextReady && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Chip label='Result display in progress…' variant='tonal' color='info' />
            </Box>
          )}
        </Box>
      ) : state.status === 'Finished' ? (
        <Card sx={{ minHeight: '72vh', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
          <CardContent sx={{ textAlign: 'center', width: '100%', maxWidth: 1040, p: { xs: 3, md: 6 } }}>
            <Box
              component='img'
              src={event.logoUrl || '/EO Navbar.png'}
              alt={`${event.name} logo`}
              sx={{ maxWidth: 210, maxHeight: 88, width: 'auto', objectFit: 'contain' }}
            />
            <Typography variant='h3' fontWeight={950} sx={{ mt: 2 }}>{event.name}</Typography>
            <Typography color='text.secondary' sx={{ mt: 0.75 }}>{sessionName}</Typography>
            <Typography variant='overline' color='primary.main' fontWeight={900} sx={{ display: 'block', mt: 3 }}>
              FINAL PODIUM
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, alignItems: 'end', gap: 2.5, mt: 4 }}>
              {[podium[1], podium[0], podium[2]].map((entry, index) => {
                const place = [2, 1, 3][index]
                const revealAt = place === 3 ? 1 : place === 2 ? 2 : 3
                const revealed = podiumRevealStage >= revealAt
                const heights = [220, 290, 180]

                return (
                  <Box
                    key={place}
                    sx={{
                      textAlign: 'center',
                      opacity: revealed ? 1 : 0,
                      transform: revealed ? 'translateY(0) scale(1)' : 'translateY(36px) scale(.94)',
                      transition: 'opacity 420ms ease, transform 520ms cubic-bezier(.2,.8,.2,1)'
                    }}
                  >
                    <Typography variant='h5' fontWeight={900}>{entry?.displayName ?? '—'}</Typography>
                    <Typography color='text.secondary' fontWeight={750} sx={{ mt: 0.5 }}>
                      {entry ? entry.score.toLocaleString() : ''}
                    </Typography>
                    <Box
                      sx={{
                        mt: 1.5,
                        height: heights[index],
                        borderRadius: '24px 24px 0 0',
                        bgcolor: place === 1 ? 'primary.main' : 'action.selected',
                        color: place === 1 ? 'primary.contrastText' : 'text.primary',
                        display: 'grid',
                        placeItems: 'center'
                      }}
                    >
                      <Typography variant='h1' fontWeight={950}>#{place}</Typography>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ minHeight: '68vh', overflow: 'hidden' }}>
          <CardContent sx={{ p: { xs: 3, md: 5 }, height: '100%' }}>
            {state.status === 'Draft' && (
              <Alert severity='info' sx={{ mb: 3 }}>
                Open this room from the Quiz Sessions workspace before participants join.
              </Alert>
            )}
            {state.status === 'Cancelled' && (
              <Alert severity='error' sx={{ mb: 3 }}>
                This Quiz session was cancelled.
              </Alert>
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '320px minmax(0, 1fr)' },
                gap: { xs: 4, md: 6 },
                alignItems: 'stretch'
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  minHeight: { xs: 'auto', md: 500 },
                  px: { xs: 0, md: 2 }
                }}
              >
                <QuizRoomQrImage eventId={eventId} roomCode={state.roomCode} size={220} />
                <Typography variant='overline' color='text.secondary' fontWeight={800} sx={{ mt: 3 }}>
                  LOBBY CODE
                </Typography>
                <Typography
                  variant='h2'
                  fontWeight={950}
                  sx={{ mt: 0.5, letterSpacing: { xs: 3, sm: 5 }, wordBreak: 'break-word' }}
                >
                  {state.roomCode}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1.25, maxWidth: 260 }}>
                  Scan the QR code or enter this code from the event Quiz page.
                </Typography>
              </Box>

              <Box
                sx={{
                  minWidth: 0,
                  borderLeft: { xs: 0, md: theme => `1px solid ${theme.palette.divider}` },
                  pl: { xs: 0, md: 5 },
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, mb: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0
                    }}
                  >
                    <i className='tabler-users text-2xl' />
                  </Box>
                  <Box>
                    <Typography variant='h5' fontWeight={850}>Participants</Typography>
                    <Typography color='text.secondary'>
                      {state.participantCount} participant{state.participantCount === 1 ? '' : 's'} joined
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    flex: 1,
                    maxHeight: { xs: 380, md: 460 },
                    overflowY: 'auto',
                    pr: 1,
                    display: 'grid',
                    alignContent: 'start',
                    gap: 1.25
                  }}
                >
                  {(state.participants ?? []).length === 0 ? (
                    <Box
                      sx={{
                        minHeight: 240,
                        display: 'grid',
                        placeItems: 'center',
                        textAlign: 'center',
                        borderRadius: 3,
                        bgcolor: 'action.hover',
                        px: 3
                      }}
                    >
                      <Box>
                        <i className='tabler-user-plus text-4xl' />
                        <Typography variant='h6' fontWeight={800} sx={{ mt: 1.5 }}>
                          Waiting for participants
                        </Typography>
                        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                          Names will appear here automatically as participants join.
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    (state.participants ?? []).map((participant, index) => (
                      <Box
                        key={participant.id}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '42px minmax(0, 1fr)',
                          gap: 1.5,
                          alignItems: 'center',
                          px: 2,
                          py: 1.5,
                          borderRadius: 2.5,
                          bgcolor: 'action.hover'
                        }}
                      >
                        <Box
                          sx={{
                            width: 42,
                            height: 42,
                            borderRadius: '50%',
                            bgcolor: 'background.paper',
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 850
                          }}
                        >
                          {index + 1}
                        </Box>
                        <Typography fontWeight={750} noWrap title={participant.displayName}>
                          {participant.displayName}
                        </Typography>
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

const QuizHostLivePage = () => (
  <AdminSessionGuard>
    <QuizHostLiveContent />
  </AdminSessionGuard>
)

export default QuizHostLivePage
