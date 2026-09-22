'use client'

import { useEffect, useState } from 'react'

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
              </Box>

              {!roomOpen && (
                <Alert severity={room.status === 'Cancelled' ? 'error' : 'info'}>
                  {room.remainingCapacity <= 0
                    ? 'This Quiz room is full.'
                    : room.status === 'Finished'
                      ? 'This Quiz session has finished.'
                      : room.status === 'Cancelled'
                        ? 'This Quiz session was cancelled.'
                        : 'This Quiz room is not accepting new participants right now.'}
                </Alert>
              )}

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

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
                <Box sx={{ textAlign: 'right', display: 'grid', gap: 1 }}>
                  <Box>
                    <Typography variant='caption' color='text.secondary' fontWeight={800}>ROOM CODE</Typography>
                    <Typography variant='body2' fontWeight={900} letterSpacing='.16em'>{room.roomCode}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary' fontWeight={800}>SESI</Typography>
                    <Typography variant='body2' fontWeight={800}>{room.sessionName}</Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  )
}

export default EventScopedQuizJoin
