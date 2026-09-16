'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'

import {
  createParticipantQuizHubClient,
  deriveServerOffsetMs,
  getParticipantQuizState,
  secondsUntil,
  submitParticipantQuizAnswer,
  type QuizCountdown,
  type QuizParticipantFinished,
  type QuizParticipantLiveState,
  type QuizParticipantQuestion,
  type QuizParticipantReveal,
  type SubmitQuizAnswerResponse
} from '@/lib/quiz-live'
import type { JoinQuizRoomResponse, PublicQuizRoomResponse } from '@/lib/quiz-rooms'
import type { SignalRJsonClient } from '@/lib/signalr-json'

type Props = {
  room: PublicQuizRoomResponse
  participant: JoinQuizRoomResponse
}

const markerVisuals = [
  { bg: 'linear-gradient(145deg, #0077B6, #005B8D)', glow: '#53D8FB', shape: '▲' },
  { bg: 'linear-gradient(145deg, #00587A, #003F5C)', glow: '#50E3C2', shape: '◆' },
  { bg: 'linear-gradient(145deg, #00A6A6, #007F86)', glow: '#B7FFF5', shape: '●' },
  { bg: 'linear-gradient(145deg, #E04B50, #B62F43)', glow: '#FFD56A', shape: '■' }
]

const ParticipantQuizLive = ({ room, participant }: Props) => {
  const [state, setState] = useState<QuizParticipantLiveState | null>(null)
  const [question, setQuestion] = useState<QuizParticipantQuestion | null>(null)
  const [countdown, setCountdown] = useState<QuizCountdown | null>(null)
  const [reveal, setReveal] = useState<QuizParticipantReveal | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serverOffsetMs, setServerOffsetMs] = useState(0)
  const [nowTick, setNowTick] = useState(Date.now())
  const clientRef = useRef<SignalRJsonClient | null>(null)
  const retryRef = useRef<number | null>(null)
  const connectingRef = useRef(false)
  const unmountedRef = useRef(false)

  const scheduleReconnect = useCallback((callback: () => void, delay: number) => {
    if (unmountedRef.current) return
    if (retryRef.current) window.clearTimeout(retryRef.current)
    retryRef.current = window.setTimeout(callback, delay)
  }, [])

  const applyState = useCallback((next: QuizParticipantLiveState) => {
    setState(next)
    setQuestion(next.currentQuestion)
    setServerOffsetMs(deriveServerOffsetMs(next.serverTimeUtc))

    if (next.currentQuestion && next.hasAnsweredCurrentQuestion) {
      setSelected(previous => previous ?? -1)
    }

    if (next.status === 'Open') {
      setCountdown(null)
      setReveal(null)
      setSelected(null)
    }
  }, [])

  const refreshMyState = useCallback(async () => {
    const next = clientRef.current?.isConnected
      ? await clientRef.current.invoke<QuizParticipantLiveState>(
          'GetMyState',
          participant.sessionId,
          participant.participantToken
        )
      : await getParticipantQuizState(participant.sessionId, participant.participantToken)

    applyState(next)
    return next
  }, [applyState, participant.participantToken, participant.sessionId])

  const connect = useCallback(async () => {
    if (unmountedRef.current || connectingRef.current || clientRef.current?.isConnected) return

    connectingRef.current = true
    const client = createParticipantQuizHubClient()
    clientRef.current = client

    client.on<QuizCountdown>('CountdownStarted', value => {
      setCountdown(value)
      setReveal(null)
      setSelected(null)
      setState(previous => previous ? { ...previous, status: 'Countdown' } : previous)
    })

    client.on<QuizParticipantQuestion>('QuestionStarted', value => {
      setQuestion(value)
      setCountdown(null)
      setReveal(null)
      setSelected(null)
      setState(previous => previous
        ? {
            ...previous,
            status: 'Active',
            currentQuestion: value,
            hasAnsweredCurrentQuestion: false,
            lastResult: null
          }
        : previous)
    })

    client.on<QuizParticipantReveal>('QuestionRevealed', value => {
      setReveal(value)
      setState(previous => previous ? { ...previous, status: 'Leaderboard' } : previous)
    })

    client.on('ScoreReady', () => {
      void refreshMyState().catch(() => undefined)
    })

    client.on<QuizParticipantFinished>('QuizFinished', () => {
      void refreshMyState().catch(() => undefined)
    })

    client.onClose(() => {
      setConnected(false)
      connectingRef.current = false
      scheduleReconnect(() => void connect(), 1200)
    })

    try {
      await client.start()
      const next = await client.invoke<QuizParticipantLiveState>(
        'JoinParticipant',
        participant.sessionId,
        participant.participantToken
      )

      applyState(next)
      setConnected(true)
      setError(null)
    } catch (connectError) {
      client.stop()
      setConnected(false)
      setError(connectError instanceof Error ? connectError.message : 'Realtime connection interrupted.')
      scheduleReconnect(() => void connect(), 1800)
    } finally {
      connectingRef.current = false
    }
  // Recursive reconnect is scheduled through scheduleReconnect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyState, participant.participantToken, participant.sessionId, refreshMyState, scheduleReconnect])

  useEffect(() => {
    unmountedRef.current = false

    void getParticipantQuizState(participant.sessionId, participant.participantToken)
      .then(applyState)
      .catch(loadError => setError(loadError instanceof Error ? loadError.message : 'Unable to restore Quiz.'))
      .finally(() => void connect())

    return () => {
      unmountedRef.current = true
      connectingRef.current = false
      if (retryRef.current) window.clearTimeout(retryRef.current)
      retryRef.current = null
      clientRef.current?.stop()
    }
  }, [applyState, connect, participant.participantToken, participant.sessionId])

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [])

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

  const submit = async (index: number) => {
    if (!question || selected !== null || submitting || remaining <= 0) return

    try {
      setSubmitting(true)
      setError(null)
      setSelected(index)

      let response: SubmitQuizAnswerResponse

      if (clientRef.current?.isConnected) {
        try {
          response = await clientRef.current.invoke<SubmitQuizAnswerResponse>(
            'SubmitAnswer',
            participant.sessionId,
            participant.participantToken,
            index
          )
        } catch {
          // A socket can drop between the tap and invocation write. The REST
          // path uses the same server-authoritative scoring and uniqueness rules.
          response = await submitParticipantQuizAnswer(
            participant.sessionId,
            participant.participantToken,
            index
          )
        }
      } else {
        response = await submitParticipantQuizAnswer(
          participant.sessionId,
          participant.participantToken,
          index
        )
      }

      if (!response.accepted) throw new Error('The answer was not accepted.')
      setState(previous => previous ? { ...previous, hasAnsweredCurrentQuestion: true } : previous)
    } catch (submitError) {
      // If the first transport actually committed before the connection died,
      // the fallback can correctly report a duplicate. Restore state before
      // allowing another tap so we never encourage a second logical answer.
      try {
        const restored = await getParticipantQuizState(
          participant.sessionId,
          participant.participantToken
        )
        applyState(restored)

        if (!restored.hasAnsweredCurrentQuestion) setSelected(null)
      } catch {
        setSelected(null)
      }

      setError(submitError instanceof Error ? submitError.message : 'Unable to submit answer.')
    } finally {
      setSubmitting(false)
    }
  }

  const markerUrl = (index: number) => {
    if (!question || question.answerMarkerMode !== 'CustomImages') return null
    return [question.markerAUrl, question.markerBUrl, question.markerCUrl, question.markerDUrl][index]
  }

  if (!state) {
    return <Box sx={{ minHeight: 420, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  }

  const resultReady = state.status === 'Leaderboard' && state.lastResult !== null

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography variant='caption' color='text.secondary'>PLAYER</Typography>
          <Typography variant='h6' fontWeight={800}>{participant.displayName}</Typography>
        </Box>
        <Chip size='small' variant='tonal' color={connected ? 'success' : 'warning'} label={connected ? 'Live' : 'Reconnecting…'} />
      </Box>

      {error && <Alert severity='warning'>{error}</Alert>}

      {state.status === 'Open' && (
        <Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center', textAlign: 'center', py: 4 }}>
          <Box>
            <Box sx={{ width: 86, height: 86, mx: 'auto', borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center' }}>
              <i className='tabler-bolt text-5xl' />
            </Box>
            <Typography variant='h4' fontWeight={900} sx={{ mt: 3 }}>You&apos;re ready!</Typography>
            <Typography color='text.secondary' sx={{ mt: 1 }}>Keep this screen open. The host will start {room.quizName}.</Typography>
          </Box>
        </Box>
      )}

      {state.status === 'Countdown' && !countdown && (
        <Box sx={{ minHeight: 430, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <Box>
            <CircularProgress size={42} />
            <Typography variant='h4' fontWeight={900} sx={{ mt: 3 }}>Get ready…</Typography>
          </Box>
        </Box>
      )}

      {state.status === 'Countdown' && countdown && (
        <Box sx={{ minHeight: 430, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <Box>
            <Typography variant='overline' color='text.secondary'>GET READY</Typography>
            <Typography
              sx={{
                mt: 2,
                fontSize: countdownValue === 'QUIZ START!' ? '3rem' : '8rem',
                lineHeight: 1,
                fontWeight: 950,
                background: 'linear-gradient(135deg, #00AEEF, #0066A6 55%, #ED1C24)',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}
            >
              {countdownValue}
            </Typography>
          </Box>
        </Box>
      )}

      {state.status === 'Active' && question && (
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant='caption' fontWeight={800}>QUESTION {question.sequence}/{question.totalQuestions}</Typography>
              <Typography fontWeight={900}>{remaining.toFixed(1)}s</Typography>
            </Box>
            <LinearProgress variant='determinate' value={Math.max(0, Math.min(100, remaining / question.durationSeconds * 100))} sx={{ height: 8, borderRadius: 8 }} />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: { xs: 1.5, sm: 2 }, minHeight: { xs: 430, sm: 500 } }}>
            {[0, 1, 2, 3].map(index => {
              const visual = markerVisuals[index]
              const image = markerUrl(index)
              const active = selected === index
              const disabled = selected !== null || submitting || remaining <= 0

              return (
                <ButtonBase
                  key={index}
                  disabled={disabled}
                  onClick={() => void submit(index)}
                  sx={{
                    minHeight: 190,
                    borderRadius: 3,
                    overflow: 'hidden',
                    background: visual.bg,
                    color: 'common.white',
                    transform: active ? 'scale(.97)' : 'scale(1)',
                    opacity: selected !== null && !active ? 0.52 : 1,
                    transition: 'transform 150ms ease, opacity 150ms ease',
                    boxShadow: active ? `0 0 0 5px ${visual.glow}` : '0 12px 30px rgba(0,0,0,.12)'
                  }}
                >
                  {image ? (
                    <Box component='img' src={image} alt={`Answer ${index + 1}`} sx={{ width: '58%', height: '58%', objectFit: 'contain' }} />
                  ) : (
                    <Typography sx={{ fontSize: { xs: '4.6rem', sm: '6.5rem' }, lineHeight: 1, fontWeight: 950, color: visual.glow }}>{visual.shape}</Typography>
                  )}
                </ButtonBase>
              )
            })}
          </Box>

          {selected !== null && (
            <Alert severity='info' icon={<i className='tabler-lock' />}>Answer locked. Wait for the result.</Alert>
          )}
        </Box>
      )}

      {state.status === 'Leaderboard' && (
        <Box sx={{ minHeight: 420, display: 'grid', placeItems: 'center', textAlign: 'center', py: 4 }}>
          {!resultReady ? (
            <Box>
              <CircularProgress size={38} />
              <Typography variant='h5' fontWeight={850} sx={{ mt: 3 }}>Checking your answer…</Typography>
            </Box>
          ) : (
            <Box sx={{ width: '100%' }}>
              <Box sx={{ width: 88, height: 88, mx: 'auto', borderRadius: '50%', bgcolor: state.lastResult!.isCorrect ? 'success.main' : 'error.main', color: 'common.white', display: 'grid', placeItems: 'center' }}>
                <i className={`${state.lastResult!.isCorrect ? 'tabler-check' : 'tabler-x'} text-5xl`} />
              </Box>
              <Typography variant='h3' fontWeight={950} sx={{ mt: 2.5 }}>{state.lastResult!.isCorrect ? 'Correct!' : 'Not this time'}</Typography>
              {reveal?.shortExplanation && <Typography color='text.secondary' sx={{ mt: 1.5 }}>{reveal.shortExplanation}</Typography>}
              <Box sx={{ mt: 4, p: 3, borderRadius: 3, bgcolor: 'action.hover' }}>
                <Typography variant='caption' color='text.secondary'>YOUR SCORE</Typography>
                <Typography variant='h2' fontWeight={950}>{state.personalScore.toLocaleString()}</Typography>
                <Typography color={state.lastResult!.scoreAwarded > 0 ? 'success.main' : 'text.secondary'} fontWeight={800}>
                  +{state.lastResult!.scoreAwarded.toLocaleString()} this question
                </Typography>
              </Box>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 2.5 }}>Leaderboard is shown on the host screen.</Typography>
            </Box>
          )}
        </Box>
      )}

      {state.status === 'Finished' && (
        <Box sx={{ minHeight: 420, display: 'grid', placeItems: 'center', textAlign: 'center', py: 4 }}>
          <Box sx={{ width: '100%' }}>
            <Typography variant='overline' color='primary.main' fontWeight={850}>QUIZ FINISHED</Typography>
            <Typography variant='h3' fontWeight={950} sx={{ mt: 1 }}>Thanks for playing!</Typography>
            <Box sx={{ mt: 4, p: 3.5, borderRadius: 3, bgcolor: 'action.hover' }}>
              <Typography variant='caption' color='text.secondary'>FINAL SCORE</Typography>
              <Typography variant='h1' fontWeight={950}>{state.personalScore.toLocaleString()}</Typography>
            </Box>
            <Typography color='text.secondary' sx={{ mt: 2.5 }}>Final ranking and podium are displayed on the main screen.</Typography>
          </Box>
        </Box>
      )}

      {state.status === 'Cancelled' && <Alert severity='error'>This Quiz session was cancelled by the host.</Alert>}
    </Box>
  )
}

export default ParticipantQuizLive
