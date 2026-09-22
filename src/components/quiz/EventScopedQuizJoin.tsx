'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
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

  const statusMessage = useMemo(() => {
    if (!room) return ''

    switch (room.status) {
      case 'Draft': return 'The host is preparing this Quiz session.'
      case 'Open': return 'The room is open. Enter your display name to join.'
      case 'Countdown': return 'The Quiz is about to start and no longer accepts new participants.'
      case 'Active': return 'The Quiz has already started.'
      case 'Leaderboard': return 'This Quiz is between questions.'
      case 'Finished': return 'This Quiz session has finished.'
      case 'Cancelled': return 'This Quiz session was cancelled.'
      default: return ''
    }
  }, [room])

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
    <Box sx={{ minHeight: '100dvh', p: { xs: 2.5, sm: 4 }, display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
      <Box sx={{ width: '100%', maxWidth: participant ? 760 : 620 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            component='img'
            src={event.logoUrl || '/EO Navbar.png'}
            alt={`${event.name} logo`}
            sx={{ maxWidth: 220, maxHeight: 80, objectFit: 'contain' }}
          />
        </Box>

        {participant ? (
          <Card>
            <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              <ParticipantQuizLive room={room} participant={participant} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent sx={{ p: { xs: 3, sm: 4.5 }, display: 'grid', gap: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant='h3' fontWeight={900}>{event.name} Quiz</Typography>
                <Typography color='text.secondary' sx={{ mt: 1 }}>{room.sessionName}</Typography>
              </Box>

              <Alert severity={room.status === 'Open' ? 'success' : 'info'}>
                {statusMessage}
              </Alert>

              {error && <Alert severity='warning'>{error}</Alert>}

              <TextField
                label='Display name'
                value={displayName}
                disabled={!roomOpen || joining}
                onChange={e => setDisplayName(e.target.value)}
                inputProps={{ maxLength: 120 }}
                autoComplete='off'
                onKeyDown={e => {
                  if (e.key === 'Enter' && roomOpen && !joining) void joinRoom()
                }}
              />

              <Button
                variant='contained'
                size='large'
                disabled={!roomOpen || joining}
                onClick={() => void joinRoom()}
              >
                {joining
                  ? 'Joining...'
                  : room.remainingCapacity <= 0
                    ? 'Room Full'
                    : room.status === 'Open'
                      ? 'Join Quiz'
                      : 'Room Closed'}
              </Button>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  )
}

export default EventScopedQuizJoin
