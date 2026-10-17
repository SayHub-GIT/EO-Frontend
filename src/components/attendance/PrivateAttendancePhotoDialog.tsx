'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getPrivateAttendancePhoto } from '@/lib/private-attendance-photo'

type PrivateAttendancePhotoDialogProps = {
  registrationId: string
  participantName: string
  onClose: () => void
}

const PrivateAttendancePhotoDialog = ({
  registrationId,
  participantName,
  onClose
}: PrivateAttendancePhotoDialogProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | null = null
    setLoading(true)
    setImageUrl(null)
    setError('')

    void getPrivateAttendancePhoto(registrationId, controller.signal)
      .then(blob => {
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(blob)
        if (!controller.signal.aborted) setImageUrl(objectUrl)
      })
      .catch(cause => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Foto tidak dapat dimuat.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [registrationId, retry])

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='sm' aria-labelledby='attendance-photo-title' aria-describedby='attendance-photo-description'>
      <DialogTitle id='attendance-photo-title'>Foto Check-In</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography id='attendance-photo-description' variant='body2' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
            {participantName}
          </Typography>
          {loading && (
            <Box role='status' aria-live='polite' sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, justifyContent: 'center', alignItems: 'center', minHeight: 180 }}>
              <CircularProgress size={30} aria-label='Memuat foto Check-In' />
              <Typography variant='body2' color='text.secondary'>Memuat foto Check-In...</Typography>
            </Box>
          )}
          {error && (
            <Alert severity='warning' role='alert'>
              {error}
            </Alert>
          )}
          {imageUrl && !loading && (
            <Box
              component='img'
              src={imageUrl}
              alt={`Foto bukti Check-In ${participantName}`}
              sx={{ width: '100%', maxHeight: 480, objectFit: 'contain', borderRadius: 1, bgcolor: 'action.hover' }}
            />
          )}
          <Typography variant='caption' color='text.secondary'>
            Foto hanya ditampilkan selama dialog ini dibuka.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {error && <Button sx={{ minHeight: 44 }} onClick={() => setRetry(value => value + 1)}>Coba lagi</Button>}
        <Button onClick={onClose} variant='contained' sx={{ minHeight: 44 }}>Tutup</Button>
      </DialogActions>
    </Dialog>
  )
}

export default PrivateAttendancePhotoDialog
