'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { PublicEvent } from '@/lib/api'
import { getEventQuizRoom } from '@/lib/quiz-rooms'

type Props = {
  event: PublicEvent
}

const normalizeRoomCode = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16)

const EventQuizRoomEntry = ({ event }: Props) => {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('')
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enterRoom = async () => {
    const normalized = normalizeRoomCode(roomCode)

    if (normalized.length < 6) {
      setError('Enter the Quiz PIN / Room Code shown by the host.')
      return
    }

    try {
      setResolving(true)
      setError(null)

      const room = await getEventQuizRoom(event.id, normalized)

      if (room.status === 'Finished') {
        setError('This Quiz session has already finished.')
        return
      }

      if (room.status === 'Cancelled') {
        setError('This Quiz session was cancelled and can no longer be joined.')
        return
      }

      if (room.status !== 'Open') {
        setError('This Quiz room is not accepting new participants right now.')
        return
      }

      if (room.remainingCapacity <= 0) {
        setError('This Quiz room is full.')
        return
      }

      router.push(
        `/events/${encodeURIComponent(event.slug)}/quiz/join/${encodeURIComponent(room.roomCode)}`
      )
    } catch (resolveError) {
      setError(
        resolveError instanceof Error
          ? resolveError.message
          : 'Quiz PIN / Room Code was not found for this event.'
      )
    } finally {
      setResolving(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        p: { xs: 2.5, sm: 4 },
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default'
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 460 }}>
        <Box sx={{ textAlign: 'center', mb: 3.5 }}>
          <Box
            component='img'
            src={event.logoUrl || '/EO Navbar.png'}
            alt={`${event.name} logo`}
            sx={{ maxWidth: 220, maxHeight: 88, objectFit: 'contain' }}
          />
        </Box>

        <Card sx={{ boxShadow: 8 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, display: 'grid', gap: 2.25 }}>
            {error && <Alert severity='warning'>{error}</Alert>}

            <TextField
              autoFocus
              fullWidth
              label='Quiz PIN / Room Code'
              placeholder='Enter PIN'
              value={roomCode}
              disabled={resolving}
              onChange={event => {
                setRoomCode(normalizeRoomCode(event.target.value))
                if (error) setError(null)
              }}
              onKeyDown={event => {
                if (event.key === 'Enter' && !resolving) void enterRoom()
              }}
              inputProps={{
                maxLength: 16,
                autoCapitalize: 'characters',
                autoComplete: 'off',
                spellCheck: false,
                style: {
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  fontWeight: 800,
                  textAlign: 'center',
                  fontSize: '1.05rem'
                }
              }}
            />

            <Button
              variant='contained'
              size='large'
              disabled={resolving || roomCode.length < 6}
              onClick={() => void enterRoom()}
              sx={{ minHeight: 50, fontWeight: 800 }}
            >
              {resolving ? 'Checking...' : 'Join'}
            </Button>
          </CardContent>
        </Card>

        <Typography
          variant='body2'
          color='text.secondary'
          align='center'
          sx={{ mt: 2.25, fontWeight: 650 }}
        >
          {event.name}
        </Typography>
      </Box>
    </Box>
  )
}

export default EventQuizRoomEntry
