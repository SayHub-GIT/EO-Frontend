'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

import { getPublicQuizRoom } from '@/lib/quiz-rooms'

const LegacyQuizJoinRedirectPage = () => {
  const params = useParams<{ roomCode: string }>()
  const router = useRouter()
  const roomCode = decodeURIComponent(params.roomCode).trim().toUpperCase()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void getPublicQuizRoom(roomCode)
      .then(room => {
        if (!active) return

        router.replace(
          `/events/${encodeURIComponent(room.eventSlug)}/quiz/join/${encodeURIComponent(room.roomCode)}`
        )
      })
      .catch(loadError => {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Quiz room was not found.')
      })

    return () => {
      active = false
    }
  }, [roomCode, router])

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3, bgcolor: 'background.default' }}>
      {error
        ? <Alert severity='error' sx={{ maxWidth: 560 }}>{error}</Alert>
        : <CircularProgress size={34} />}
    </Box>
  )
}

export default LegacyQuizJoinRedirectPage
