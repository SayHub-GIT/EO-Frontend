'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { PublicEvent } from '@/lib/api'
import { getEventQuizAccess, getEventQuizRoom } from '@/lib/quiz-rooms'

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
  const [available, setAvailable] = useState(false)
  const [checking, setChecking] = useState(true)
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let timer: number | null = null

    const loadAvailability = async () => {
      try {
        const result = await getEventQuizAccess(event.id)
        if (active) setAvailable(result.available)
      } catch {
        if (active) setAvailable(false)
      } finally {
        if (active) setChecking(false)
      }
    }

    void loadAvailability()
    timer = window.setInterval(() => void loadAvailability(), 5000)

    return () => {
      active = false
      if (timer !== null) window.clearInterval(timer)
    }
  }, [event.id])

  const enterRoom = async () => {
    const normalized = normalizeRoomCode(roomCode)

    if (normalized.length < 6) {
      setError('Enter the Room Code shown by the event host.')
      return
    }

    try {
      setResolving(true)
      setError(null)

      const room = await getEventQuizRoom(event.id, normalized)

      if (room.status !== 'Open') {
        setError('This Quiz room is not accepting participants right now.')
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
          : 'Quiz room was not found for this event.'
      )
    } finally {
      setResolving(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', p: { xs: 2.5, sm: 4 }, display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
      <Box sx={{ width: '100%', maxWidth: 620 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            component='img'
            src={event.logoUrl || '/EO Navbar.png'}
            alt={`${event.name} logo`}
            sx={{ maxWidth: 220, maxHeight: 80, objectFit: 'contain' }}
          />
        </Box>

        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4.5 }, display: 'grid', gap: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant='h3' fontWeight={900}>{event.name} Quiz</Typography>
              <Typography color='text.secondary' sx={{ mt: 1.25 }}>
                Enter the Room Code shown by the host for this event.
              </Typography>
            </Box>

            {checking ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <CircularProgress size={28} />
              </Box>
            ) : !available ? (
              <Alert severity='info'>
                No Quiz room is open for this event right now. This page will update automatically when the host opens a session.
              </Alert>
            ) : null}

            {error && <Alert severity='warning'>{error}</Alert>}

            <TextField
              autoFocus
              fullWidth
              label='Room Code'
              value={roomCode}
              disabled={!available || resolving}
              onChange={e => setRoomCode(normalizeRoomCode(e.target.value))}
              onKeyDown={e => {
                if (e.key === 'Enter' && available && !resolving) void enterRoom()
              }}
              inputProps={{
                maxLength: 16,
                autoCapitalize: 'characters',
                autoComplete: 'off',
                spellCheck: false,
                style: {
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  fontWeight: 800,
                  textAlign: 'center'
                }
              }}
            />

            <Button
              variant='contained'
              size='large'
              disabled={!available || resolving || roomCode.length < 6}
              onClick={() => void enterRoom()}
            >
              {resolving ? 'Checking Room...' : 'Enter Quiz'}
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

export default EventQuizRoomEntry
