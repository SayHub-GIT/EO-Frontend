'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
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
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary' }}>
      <Box
        sx={{
          width: '100%',
          maxWidth: 760,
          mx: 'auto',
          px: { xs: 2.5, sm: 4, md: 6 },
          py: { xs: 6, md: 10 }
        }}
      >
        <Box
          component='img'
          src={event.logoUrl || '/EO Navbar.png'}
          alt={`${event.name} logo`}
          sx={{ display: 'block', maxWidth: 190, maxHeight: 72, objectFit: 'contain' }}
        />

        <Box sx={{ mt: { xs: 8, md: 12 }, borderTop: '1px solid', borderColor: 'divider', pt: 4 }}>
          <Typography sx={{ color: '#00A7E1', fontSize: '0.72rem', fontWeight: 850, letterSpacing: '.07em' }}>
            {event.name.toUpperCase()}
          </Typography>
          <Typography
            component='h1'
            sx={{
              mt: 1,
              maxWidth: 620,
              fontSize: { xs: '2rem', sm: '2.65rem' },
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-.03em'
            }}
          >
            Join the live quiz
          </Typography>
          <Typography color='text.secondary' sx={{ mt: 1.5, maxWidth: 620, lineHeight: 1.7 }}>
            Enter the room code shown by the host. If you scanned the session QR, the code is filled automatically on the next screen.
          </Typography>

          <Box sx={{ mt: 5, maxWidth: 460, display: 'grid', gap: 2 }}>
            {error && <Alert severity='warning'>{error}</Alert>}

            <TextField
              autoFocus
              fullWidth
              label='Room code'
              placeholder='Enter code'
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
                  fontWeight: 800
                }
              }}
            />

            <Button
              variant='contained'
              size='large'
              disabled={resolving || roomCode.length < 6}
              onClick={() => void enterRoom()}
              endIcon={!resolving ? <i className='tabler-arrow-right' /> : undefined}
              sx={{ justifySelf: { sm: 'start' }, minWidth: 160 }}
            >
              {resolving ? 'Checking...' : 'Continue'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default EventQuizRoomEntry
