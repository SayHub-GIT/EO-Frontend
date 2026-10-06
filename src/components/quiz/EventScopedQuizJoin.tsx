'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import ParticipantQuizLive from '@/components/quiz/ParticipantQuizLive'
import type { PublicEvent } from '@/lib/api'
import {
  getEventQuizRoom,
  joinEventQuizRoom,
  quizParticipantStorageKey,
  type JoinQuizRoomResponse,
  type PublicQuizRoomResponse
} from '@/lib/quiz-rooms'

type Props = {
  event: PublicEvent
  roomCode: string
}

const EventScopedQuizJoin = ({ event, roomCode }: Props) => {
  const normalizedRoomCode = roomCode.trim().toUpperCase()
  const [room, setRoom] = useState<PublicQuizRoomResponse | null>(null)
  const [participant, setParticipant] = useState<JoinQuizRoomResponse | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRoom = async () => {
    try {
      setError(null)
      const loaded = await getEventQuizRoom(event.id, normalizedRoomCode)
      setRoom(loaded)
    } catch (loadError) {
      setRoom(null)
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Quiz room.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(quizParticipantStorageKey(normalizedRoomCode))
      if (raw) setParticipant(JSON.parse(raw) as JoinQuizRoomResponse)
    } catch {
      window.sessionStorage.removeItem(quizParticipantStorageKey(normalizedRoomCode))
    }

    void loadRoom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, normalizedRoomCode])

  const joinRoom = async () => {
    const name = displayName.trim()

    if (name.length < 2) {
      setError('Enter a display name with at least 2 characters.')
      return
    }

    try {
      setJoining(true)
      setError(null)
      const joined = await joinEventQuizRoom(event.id, normalizedRoomCode, name)
      window.sessionStorage.setItem(
        quizParticipantStorageKey(normalizedRoomCode),
        JSON.stringify(joined)
      )
      setParticipant(joined)
      await loadRoom()
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : 'Unable to join Quiz room.')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
        <CircularProgress size={34} />
      </Box>
    )
  }

  if (!room) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3, bgcolor: 'background.default' }}>
        <Alert severity='error' sx={{ maxWidth: 560 }}>
          {error ?? 'Quiz room was not found for this event.'}
        </Alert>
      </Box>
    )
  }

  const roomOpen = room.status === 'Open' && room.remainingCapacity > 0

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: 'background.default',
        color: 'text.primary',
        backgroundImage: room.backgroundUrl
          ? `linear-gradient(rgba(8, 16, 28, 0.58), rgba(8, 16, 28, 0.72)), url(${JSON.stringify(room.backgroundUrl)})`
          : undefined,
        backgroundSize: room.backgroundUrl ? 'cover' : undefined,
        backgroundPosition: room.backgroundUrl ? 'center' : undefined
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: participant ? 960 : 760,
          mx: 'auto',
          px: { xs: 2.5, sm: 4, md: 6 },
          py: { xs: 6, md: 9 }
        }}
      >
        <Box
          component='img'
          src={event.logoUrl || '/EO Navbar.png'}
          alt={`${event.name} logo`}
          sx={{ display: 'block', maxWidth: 190, maxHeight: 72, objectFit: 'contain' }}
        />

        {participant ? (
          <Box sx={{ mt: { xs: 5, md: 7 } }}>
            <ParticipantQuizLive room={room} participant={participant} />
          </Box>
        ) : (
          <Box sx={{ mt: { xs: 8, md: 11 }, borderTop: '1px solid', borderColor: 'divider', pt: 4, maxWidth: 620 }}>
            <Typography sx={{ color: '#00A7E1', fontSize: '0.72rem', fontWeight: 850, letterSpacing: '.07em' }}>
              LIVE QUIZ
            </Typography>
            <Typography
              component='h1'
              sx={{
                mt: 1,
                fontSize: { xs: '2rem', sm: '2.65rem' },
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: '-.03em'
              }}
            >
              Enter your name
            </Typography>
            <Typography color='text.secondary' sx={{ mt: 1.5, lineHeight: 1.7 }}>
              You&apos;re joining {event.name}. Your name is used on the host screen and your personal quiz result.
            </Typography>

            <Box sx={{ mt: 4, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontSize: '0.66rem', fontWeight: 800, color: 'text.secondary', letterSpacing: '.05em' }}>ROOM CODE</Typography>
                <Typography sx={{ mt: 0.3, fontSize: '0.82rem', fontWeight: 800, letterSpacing: '.12em' }}>{room.roomCode}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.66rem', fontWeight: 800, color: 'text.secondary', letterSpacing: '.05em' }}>SESI</Typography>
                <Typography sx={{ mt: 0.3, fontSize: '0.82rem', fontWeight: 700 }}>{room.sessionName}</Typography>
              </Box>
            </Box>

            {!roomOpen && (
              <Alert severity={room.status === 'Cancelled' ? 'error' : 'info'} sx={{ mt: 4 }}>
                {room.remainingCapacity <= 0
                  ? 'This quiz room is full.'
                  : room.status === 'Finished'
                    ? 'This quiz session has finished.'
                    : room.status === 'Cancelled'
                      ? 'This quiz session was cancelled.'
                      : 'This quiz session is not accepting new participants yet.'}
              </Alert>
            )}

            {error && <Alert severity='warning' sx={{ mt: 3 }}>{error}</Alert>}

            <Box sx={{ mt: 4, display: 'grid', gap: 2.25 }}>
              <TextField
                autoFocus
                fullWidth
                label='Name'
                placeholder='Enter your name'
                value={displayName}
                disabled={!roomOpen || joining}
                onChange={e => {
                  setDisplayName(e.target.value)
                  if (error) setError(null)
                }}
                inputProps={{ maxLength: 120 }}
                autoComplete='name'
                onKeyDown={e => {
                  if (e.key === 'Enter' && roomOpen && !joining) void joinRoom()
                }}
              />

              <Button
                variant='contained'
                size='large'
                disabled={!roomOpen || joining}
                onClick={() => void joinRoom()}
                endIcon={roomOpen && !joining ? <i className='tabler-arrow-right' /> : undefined}
                sx={{ justifySelf: { sm: 'start' }, minWidth: 160 }}
              >
                {joining
                  ? 'Joining...'
                  : room.remainingCapacity <= 0
                    ? 'Room full'
                    : roomOpen
                      ? 'Join'
                      : 'Not available'}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default EventScopedQuizJoin
