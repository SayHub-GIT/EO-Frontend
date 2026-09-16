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
      setError('Enter the Room Code shown by the event host.')
      return
    }

    setError(null)
    router.push(`/quiz/join/${encodeURIComponent(normalized)}`)
  }

  return (
    <Box
      sx={theme => ({
        minHeight: '100dvh',
        p: { xs: 2.5, sm: 4 },
        display: 'grid',
        placeItems: 'center',
        background: theme.palette.mode === 'dark'
          ? 'radial-gradient(circle at 18% 8%, rgba(0,174,239,.18), transparent 34%), radial-gradient(circle at 88% 88%, rgba(237,28,36,.14), transparent 36%), #07111f'
          : 'radial-gradient(circle at 18% 8%, rgba(0,174,239,.15), transparent 34%), radial-gradient(circle at 88% 88%, rgba(237,28,36,.09), transparent 36%), #eef8ff'
      })}
    >
      <Box sx={{ width: '100%', maxWidth: 560 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            component='img'
            src='/EO Navbar.png'
            alt='Pertamina Event'
            sx={{ maxWidth: 190, maxHeight: 58, objectFit: 'contain' }}
          />
        </Box>

        <Card sx={{ overflow: 'hidden' }}>
          <Box
            sx={{
              px: { xs: 3, sm: 4 },
              py: { xs: 3.5, sm: 4.5 },
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              textAlign: 'center'
            }}
          >
            <Box
              sx={{
                width: 78,
                height: 78,
                mx: 'auto',
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,.14)',
                display: 'grid',
                placeItems: 'center'
              }}
            >
              <i className='tabler-device-gamepad-2 text-4xl' />
            </Box>
            <Typography variant='h3' fontWeight={900} sx={{ mt: 2.5 }}>
              Join Quiz
            </Typography>
            <Typography sx={{ mt: 1, opacity: 0.9 }}>
              Enter the Room Code shown on the event screen, or scan the host&apos;s QR code.
            </Typography>
          </Box>

          <CardContent sx={{ p: { xs: 3, sm: 4 }, display: 'grid', gap: 2.5 }}>
            {error && <Alert severity='warning'>{error}</Alert>}

            <TextField
              autoFocus
              fullWidth
              label='Room Code'
              value={roomCode}
              onChange={event => setRoomCode(normalizeRoomCode(event.target.value))}
              onKeyDown={event => {
                if (event.key === 'Enter') enterRoom()
              }}
              placeholder='e.g. AB7K92QX'
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
              disabled={roomCode.length < 6}
              onClick={enterRoom}
              startIcon={<i className='tabler-door-enter' />}
            >
              Enter Room
            </Button>

            <Typography variant='body2' color='text.secondary' textAlign='center'>
              The room must be open and the event must already be in progress before you can join.
            </Typography>
          </CardContent>
        </Card>

        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', textAlign: 'center', mt: 2.5 }}>
          Pertamina Event • Realtime Quiz
        </Typography>
      </Box>
    </Box>
  )
}

export default QuizRoomCodeEntryPage
