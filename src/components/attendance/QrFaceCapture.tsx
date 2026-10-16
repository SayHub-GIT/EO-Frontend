'use client'

import { useEffect, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import {
  createFaceDetector,
  encodeDetectedFaceJpeg,
  faceCaptureError,
  waitForOneFace
} from '@/lib/qr-face-capture'

export type QrFaceCaptureProps = {
  participantName: string
  consentConfirmed: boolean
  onCaptured: (jpeg: Blob) => void
  onCancel: () => void
}

export default function QrFaceCapture({
  participantName,
  consentConfirmed,
  onCaptured,
  onCancel
}: QrFaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [status, setStatus] = useState('Menyiapkan kamera wajah...')
  const [error, setError] = useState('')
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(Boolean(consentConfirmed))

  useEffect(() => {
    if (!consentConfirmed) {
      setError('Persetujuan peserta untuk pengambilan foto harus dikonfirmasi terlebih dahulu.')
      setCapturing(false)
      return
    }

    const controller = new AbortController()
    let stream: MediaStream | null = null
    let objectUrl: string | null = null

    const capture = async () => {
      try {
        setCapturing(true)
        setCapturedUrl(null)
        setError('')
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('Kamera memerlukan HTTPS atau localhost dan izin akses perangkat.')
        }

        const detector = createFaceDetector(window)
        if (!detector) throw new Error('Deteksi wajah otomatis belum didukung browser ini. Gunakan browser/perangkat yang mendukung FaceDetector.')

        setStatus('Meminta izin kamera...')
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 960 }, height: { ideal: 720 } },
          audio: false
        })
        if (controller.signal.aborted) return

        const video = videoRef.current
        if (!video) throw new Error('Pratinjau kamera belum tersedia.')
        video.srcObject = stream
        await video.play()
        if (controller.signal.aborted) return

        setStatus('Mendeteksi satu wajah. Target pengambilan hingga 2 detik setelah kamera siap.')
        await waitForOneFace(video, detector, controller.signal)
        const canvas = document.createElement('canvas')
        const jpeg = await encodeDetectedFaceJpeg(video, canvas, controller.signal)
        if (controller.signal.aborted) return

        objectUrl = URL.createObjectURL(jpeg)
        setCapturedUrl(objectUrl)
        setStatus('Wajah terdeteksi dan foto siap. Check-In belum dicatat.')
        onCaptured(jpeg)
      } catch (cause) {
        if (!controller.signal.aborted) setError(faceCaptureError(cause))
      } finally {
        stream?.getTracks().forEach(track => track.stop())
        if (videoRef.current) videoRef.current.srcObject = null
        if (!controller.signal.aborted) setCapturing(false)
      }
    }

    void capture()
    return () => {
      controller.abort()
      stream?.getTracks().forEach(track => track.stop())
      if (videoRef.current) videoRef.current.srcObject = null
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [consentConfirmed, onCaptured])

  return (
    <Box sx={{ display: 'grid', gap: 2 }} aria-label='Pengambilan foto wajah'>
      <Typography variant='subtitle1' fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
        Foto Check-In — {participantName}
      </Typography>
      <Box sx={{ aspectRatio: '4 / 3', bgcolor: 'action.hover', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-label='Pratinjau kamera wajah'
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: capturedUrl ? 'none' : 'block' }}
        />
        {capturedUrl && (
          <Box component='img' src={capturedUrl} alt={`Foto wajah peserta ${participantName}`}
            sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        )}
      </Box>
      {capturing && (
        <Stack direction='row' alignItems='center' gap={1} role='status' aria-live='polite'>
          <CircularProgress size={20} />
          <Typography variant='body2'>{status}</Typography>
        </Stack>
      )}
      {!capturing && !error && capturedUrl && <Alert severity='success'>{status}</Alert>}
      {error && <Alert severity='warning' role='status'>{error}</Alert>}
      <Button variant='outlined' onClick={onCancel}>Batalkan foto</Button>
    </Box>
  )
}
