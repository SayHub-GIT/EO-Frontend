'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

const normalizeRoomCode = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16)

const QuizRoomCodeEntryPage = () => {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const enterRoom = () => {
    const normalized = normalizeRoomCode(roomCode)

    if (normalized.length < 6) {
      setError('Enter the room code shown by the event host.')
      return
    }

    setError(null)
    router.push(`/quiz/join/${encodeURIComponent(normalized)}`)
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
          src='/EO Navbar.png'
          alt='Pertamina Event'
          sx={{ display: 'block', maxWidth: 180, maxHeight: 58, objectFit: 'contain' }}
        />

        <Box sx={{ mt: { xs: 8, md: 12 }, borderTop: '1px solid', borderColor: 'divider', pt: 4 }}>
          <Typography sx={{ color: '#00A7E1', fontSize: '0.72rem', fontWeight: 850, letterSpacing: '.07em' }}>
            QUIZ ENTRY
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
            Enter your room code
          </Typography>
          <Typography color='text.secondary' sx={{ mt: 1.5, maxWidth: 620, lineHeight: 1.7 }}>
            Use the code shown by the host. Scanning the session QR skips this step and opens the matching event room directly.
          </Typography>

          <Box sx={{ mt: 5, maxWidth: 460, display: 'grid', gap: 2 }}>
            {error && <Alert severity='warning'>{error}</Alert>}

            <TextField
              autoFocus
              fullWidth
              label='Room code'
              value={roomCode}
              onChange={event => {
                setRoomCode(normalizeRoomCode(event.target.value))
                if (error) setError(null)
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') enterRoom()
              }}
              placeholder='AB7K92QX'
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
              disabled={roomCode.length < 6}
              onClick={enterRoom}
              endIcon={<i className='tabler-arrow-right' />}
              sx={{ justifySelf: { sm: 'start' }, minWidth: 160 }}
            >
              Continue
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default QuizRoomCodeEntryPage
