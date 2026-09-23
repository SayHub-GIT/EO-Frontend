'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'

import { getQuizRoomQrUrl } from '@/lib/quiz-rooms'

type Props = {
  eventId: string
  roomCode: string
  size?: number
}

const QuizRoomQrImage = ({ eventId, roomCode, size = 150 }: Props) => {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null

    const load = async () => {
      try {
        setError(null)
        setSrc(null)

        const response = await fetch(getQuizRoomQrUrl(eventId, roomCode), {
          cache: 'no-store',
          headers: { Accept: 'image/png' }
        })

        if (!response.ok) {
          throw new Error(`QR endpoint returned HTTP ${response.status}.`)
        }

        const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
        if (!contentType.startsWith('image/png')) {
          throw new Error('QR endpoint did not return a PNG image.')
        }

        const blob = await response.blob()
        if (blob.size <= 8) {
          throw new Error('QR image response is empty.')
        }

        const nextUrl = URL.createObjectURL(blob)
        if (active) {
          objectUrl = nextUrl
          setSrc(nextUrl)
        } else {
          URL.revokeObjectURL(nextUrl)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to generate QR code.')
        }
      }
    }

    void load()

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [eventId, retryKey, roomCode])

  if (error) {
    return (
      <Box sx={{ width: size, minHeight: size, display: 'grid', alignContent: 'center', gap: 1.25 }}>
        <Alert severity='warning' sx={{ px: 1.25, py: 0.5 }}>
          QR unavailable
        </Alert>
        <Button size='small' variant='outlined' onClick={() => setRetryKey(value => value + 1)}>
          Retry QR
        </Button>
      </Box>
    )
  }

  if (!src) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'common.white',
          borderRadius: 2,
          border: theme => `1px solid ${theme.palette.divider}`
        }}
      >
        <CircularProgress size={28} />
      </Box>
    )
  }

  return (
    <Box
      component='img'
      src={src}
      alt={`QR code for ${roomCode}`}
      sx={{
        width: size,
        height: size,
        p: 1,
        bgcolor: 'common.white',
        borderRadius: 2,
        border: theme => `1px solid ${theme.palette.divider}`
      }}
    />
  )
}

export default QuizRoomQrImage
