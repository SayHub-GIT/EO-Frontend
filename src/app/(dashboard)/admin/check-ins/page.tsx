'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { checkInParticipant, manualCheckIn, searchCheckInParticipants, uploadCheckInPhoto, type AttendanceParticipant, type CheckInResponse } from '@/lib/check-ins'
import { getCurrentEventWorkspace } from '@/lib/event-workspace'
import { listAdminEvents, type AdminEvent } from '@/lib/admin-events'
import { useSearchParams } from 'next/navigation'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { getAdminEventExperience, type EventExperienceConfig, type EventWorkspaceItem } from '@/lib/event-experience'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'

type CheckInMode = 'qr' | 'manual'

type BarcodeResult = { rawValue?: string }
type BarcodeDetectorInstance = { detect: (source: CanvasImageSource) => Promise<BarcodeResult[]> }
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance

type JsQrResult = { data: string }
type JsQrDecoder = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' }
) => JsQrResult | null

type ScannerWindow = typeof window & {
  BarcodeDetector?: BarcodeDetectorConstructor
  jsQR?: JsQrDecoder
}

const JSQR_SCRIPT_ID = 'eo-jsqr-fallback'
const JSQR_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta'
  }).format(new Date(value))

const itemForPackage = (items: EventWorkspaceItem[] | undefined, packageId: string | null) => {
  const safeItems = Array.isArray(items) ? items.filter(item => item && typeof item === 'object') : []
  if (!safeItems.length) return null

  if (packageId) {
    const matched = safeItems.find(item => String(item.packageId ?? '') === packageId)
    if (matched) return matched
  }

  return safeItems.length === 1 ? safeItems[0] : null
}

const loadJsQrFallback = async (): Promise<JsQrDecoder> => {
  const scannerWindow = window as ScannerWindow

  if (scannerWindow.jsQR) return scannerWindow.jsQR

  await new Promise<void>((resolve, reject) => {
    let script = document.getElementById(JSQR_SCRIPT_ID) as HTMLScriptElement | null

    const handleLoad = () => {
      cleanup()
      resolve()
    }

    const handleError = () => {
      cleanup()
      reject(new Error('Unable to load the compatible QR scanner. Check your internet connection and try again.'))
    }

    const cleanup = () => {
      script?.removeEventListener('load', handleLoad)
      script?.removeEventListener('error', handleError)
    }

    if (!script) {
      script = document.createElement('script')
      script.id = JSQR_SCRIPT_ID
      script.src = JSQR_SCRIPT_URL
      script.async = true
      script.crossOrigin = 'anonymous'
      document.head.appendChild(script)
    }

    if ((window as ScannerWindow).jsQR) {
      cleanup()
      resolve()
      return
    }

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
  })

  const decoder = (window as ScannerWindow).jsQR
  if (!decoder) throw new Error('Compatible QR scanner failed to initialize.')

  return decoder
}

const cameraErrorMessage = (error: unknown) => {
  if (!(error instanceof DOMException)) {
    return error instanceof Error ? error.message : 'Unable to access the camera.'
  }

  switch (error.name) {
    case 'NotAllowedError':
      return 'Camera permission was denied. Allow camera access for this site, then press Start camera again.'
    case 'NotFoundError':
      return 'No camera was found on this device.'
    case 'NotReadableError':
      return 'The camera is unavailable or is being used by another application.'
    case 'SecurityError':
      return 'Camera access is blocked by the browser. Open this page over HTTPS or localhost.'
    default:
      return error.message || 'Unable to access the camera.'
  }
}

export default function Page() {
  const searchParams = useSearchParams()
  const [checkInMode, setCheckInMode] = useState<CheckInMode>('qr')
  const [eventId, setEventId] = useState('')
  const [availableEvents, setAvailableEvents] = useState<AdminEvent[]>([])
  const [eventError, setEventError] = useState('')
  const [searchName, setSearchName] = useState('')
  const [matches, setMatches] = useState<AttendanceParticipant[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedRegistration, setSelectedRegistration] = useState<AttendanceParticipant | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [cameraMessage, setCameraMessage] = useState('')
  const [photoConsent, setPhotoConsent] = useState(false)
  const [photoStatus, setPhotoStatus] = useState('')
  const [photoCapturing, setPhotoCapturing] = useState(false)
  const [photoRetry, setPhotoRetry] = useState(0)
  const photoVideoRef = useRef<HTMLVideoElement | null>(null)
  const [result, setResult] = useState<CheckInResponse | null>(null)
  const [experience, setExperience] = useState<EventExperienceConfig | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scanBusyRef = useRef(false)
  const scanStartingRef = useRef(false)
  const scannerEpochRef = useRef(0)
  const submittingRef = useRef(false)
  const checkInAccess = usePermissionAccess('attendance.checkin')

  const stopScanner = () => {
    scannerEpochRef.current += 1
    scanStartingRef.current = false

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    scanBusyRef.current = false
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }

    setScanning(false)
  }

  useEffect(() => stopScanner, [])

  useEffect(() => {
    if (!result || !photoConsent) return

    const registrationId = result.registrationId
    let active = true
    let stream: MediaStream | null = null
    setPhotoStatus('Mengaktifkan kamera foto kehadiran...')
    setPhotoCapturing(true)

    const capture = async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('Foto memerlukan HTTPS dan izin kamera browser.')
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 960 }, height: { ideal: 720 } },
          audio: false
        })
        if (!active) return

        const video = photoVideoRef.current
        if (!video) throw new Error('Pratinjau kamera foto tidak tersedia.')
        video.srcObject = stream
        await video.play()
        if (!active) return

        setPhotoStatus('Foto otomatis dalam 2 detik. Arahkan kamera ke peserta yang setuju.')
        await new Promise(resolve => window.setTimeout(resolve, 2000))
        if (!active) return

        const canvas = document.createElement('canvas')
        if (!video.videoWidth || !video.videoHeight) throw new Error('Kamera belum siap mengambil foto.')
        const scale = Math.min(1, 720 / video.videoWidth)
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Pemrosesan gambar tidak tersedia.')

        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const jpeg = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.67))
        if (!jpeg || !active) throw new Error('Foto gagal diambil.')

        setPhotoStatus('Menyimpan foto ke penyimpanan privat...')
        await uploadCheckInPhoto(registrationId, jpeg, true)
        if (active) setPhotoStatus('Foto kehadiran berhasil tersimpan secara privat.')
      } catch (reason) {
        if (active) setPhotoStatus('Check-in tercatat, tetapi foto BELUM tersimpan: ' +
          (reason instanceof Error ? reason.message : 'Periksa koneksi dan izin kamera.'))
      } finally {
        stream?.getTracks().forEach(track => track.stop())
        if (active) {
          setPhotoCapturing(false)
          if (photoVideoRef.current) photoVideoRef.current.srcObject = null
        }
      }
    }
    void capture()
    return () => {
      active = false
      stream?.getTracks().forEach(track => track.stop())
    }
  }, [result?.registrationId, photoConsent, photoRetry])

  useEffect(() => {
    let active = true
    const resolveEvent = async () => {
      try {
        const context = await getCurrentEventWorkspace()
        if (!active) return
        if (context.isGlobalAdmin) {
          const events = await listAdminEvents()
          if (!active) return
          setAvailableEvents(events)
          const requested = searchParams.get('eventId')
          setEventId(events.find(e => e.id === requested)?.id ?? '')
        } else if (context.status === 'assigned' && context.eventId) {
          setEventId(context.eventId)
        } else {
          setEventError('Your account is not assigned to an event for attendance operations.')
        }
      } catch (cause) {
        if (active) setEventError(cause instanceof Error ? cause.message : 'Unable to resolve your event.')
      }
    }
    void resolveEvent()
    return () => { active = false }
  }, [searchParams])

  useEffect(() => {
    let active = true
    setMatches([])
    setSelectedRegistration(null)
    if (!eventId || searchName.trim().length < 2) {
      setSearching(false)
      setSearchError('')
      return () => { active = false }
    }
    const controller = new AbortController()
    const delay = window.setTimeout(() => {
      setSearching(true)
      setSearchError('')
      void searchCheckInParticipants(eventId, searchName)
        .then(rows => { if (active) setMatches(rows) })
        .catch(cause => {
          if (active) setSearchError(cause instanceof Error ? cause.message : 'Search failed.')
        })
        .finally(() => { if (active) setSearching(false) })
    }, 350)
    return () => { active = false; controller.abort(); window.clearTimeout(delay) }
  }, [eventId, searchName])

  const raceCategory = useMemo(
    () => result ? itemForPackage(experience?.moduleData?.['race-categories'], result.eventPackageId) : null,
    [experience, result]
  )
  const racePack = useMemo(
    () => result ? itemForPackage(experience?.moduleData?.['race-pack'], result.eventPackageId) : null,
    [experience, result]
  )

  const submitToken = async (value: string) => {
    const qrToken = value.trim()
    if (!qrToken || submittingRef.current) return

    submittingRef.current = true
    setSubmitting(true)
    setError('')
    setResult(null)
    setExperience(null)

    try {
      const response = await checkInParticipant(qrToken)
      setResult(response)
      stopScanner()

      try {
        const loadedExperience = await getAdminEventExperience(response.eventId)
        setExperience(loadedExperience)
      } catch {
        // Check-in itself succeeded. Entitlement context is optional and must never turn success into failure.
        setExperience(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to check in participant.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const confirmManualCheckIn = async () => {
    if (!selectedRegistration?.canCheckIn || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setError('')
    setResult(null)
    setExperience(null)
    try {
      const response = await manualCheckIn(selectedRegistration.registrationId)
      setResult(response)
      setMatches(current => current.map(item =>
        item.registrationId === response.registrationId
          ? { ...item, canCheckIn: false, attendanceState: 'Checked in', checkedInAtUtc: response.checkedInAtUtc }
          : item
      ))
      setSelectedRegistration(null)
      stopScanner()
      try { setExperience(await getAdminEventExperience(response.eventId)) }
      catch { setExperience(null) }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Manual check-in failed.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const handleDecodedToken = async (value: string) => {
    const decoded = value.trim()
    if (!decoded || submittingRef.current) return

    stopScanner()
    await submitToken(decoded)
  }

  const startScanner = async () => {
    if (scanning || scanStartingRef.current) return

    setCameraMessage('')
    setError('')
    setResult(null)
    setExperience(null)

    if (!window.isSecureContext) {
      setCameraMessage('Camera access requires a secure page. Open the app over HTTPS or use localhost during development.')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage('Camera access is not available in this browser. Make sure the page is opened over HTTPS and camera permission is enabled.')
      return
    }

    scanStartingRef.current = true
    const scannerEpoch = ++scannerEpochRef.current

    const detectorCtor = (window as ScannerWindow).BarcodeDetector
    let detector: BarcodeDetectorInstance | null = null
    let jsQrDecoder: JsQrDecoder | null = null

    try {
      if (detectorCtor) {
        detector = new detectorCtor({ formats: ['qr_code'] })
      } else {
        setCameraMessage('Preparing compatible QR scanner...')
        jsQrDecoder = await loadJsQrFallback()
      }

      if (scannerEpoch !== scannerEpochRef.current) return

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })

      if (scannerEpoch !== scannerEpochRef.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      streamRef.current = stream
      setScanning(true)

      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
        throw new Error('Camera preview could not be initialized.')
      }

      video.srcObject = stream
      await video.play()
      if (scannerEpoch !== scannerEpochRef.current) return

      setCameraMessage('Camera is active. Place the ticket QR code inside the frame and hold it steady.')

      timerRef.current = setInterval(async () => {
        const currentVideo = videoRef.current
        if (scannerEpoch !== scannerEpochRef.current || !currentVideo || currentVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || scanBusyRef.current) return

        scanBusyRef.current = true

        try {
          let decodedValue = ''

          if (detector) {
            const codes = await detector.detect(currentVideo)
            decodedValue = codes.find(item => item.rawValue)?.rawValue?.trim() ?? ''
          } else if (jsQrDecoder) {
            const sourceWidth = currentVideo.videoWidth
            const sourceHeight = currentVideo.videoHeight
            if (!sourceWidth || !sourceHeight) return

            const canvas = canvasRef.current ?? document.createElement('canvas')
            canvasRef.current = canvas

            const maxScanWidth = 960
            const scale = Math.min(1, maxScanWidth / sourceWidth)
            canvas.width = Math.max(1, Math.round(sourceWidth * scale))
            canvas.height = Math.max(1, Math.round(sourceHeight * scale))

            const context = canvas.getContext('2d', { willReadFrequently: true })
            if (!context) return

            context.drawImage(currentVideo, 0, 0, canvas.width, canvas.height)
            const frame = context.getImageData(0, 0, canvas.width, canvas.height)
            decodedValue = jsQrDecoder(frame.data, frame.width, frame.height, {
              inversionAttempts: 'attemptBoth'
            })?.data?.trim() ?? ''
          }

          if (decodedValue && scannerEpoch === scannerEpochRef.current) await handleDecodedToken(decodedValue)
        } catch {
          // A camera frame can fail while autofocus/exposure is changing. Keep scanning.
        } finally {
          scanBusyRef.current = false
        }
      }, 300)
    } catch (err) {
      if (scannerEpoch === scannerEpochRef.current) {
        setCameraMessage(cameraErrorMessage(err))
        stopScanner()
      }
    } finally {
      if (scannerEpoch === scannerEpochRef.current) scanStartingRef.current = false
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant='h4' fontWeight={800}>Check-in peserta</Typography>
        <Typography color='text.secondary' sx={{ mt: 1, maxWidth: 760 }}>
          Scan QR tiket atau cari peserta secara manual. Informasi paket peserta ditampilkan setelah check-in berhasil.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.2fr) minmax(320px, .8fr)' }, gap: 4 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Tabs
              value={checkInMode}
              variant='fullWidth'
              aria-label='Pilih metode check-in'
              sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
              onChange={(_, nextMode: CheckInMode) => {
                if (submitting || photoCapturing) return

                stopScanner()
                setCheckInMode(nextMode)
                setSelectedRegistration(null)
                setError('')
                setCameraMessage('')
              }}
            >
              <Tab value='qr' label='Scan CheckIn' disabled={submitting || photoCapturing} />
              <Tab value='manual' label='Manual CheckIn' disabled={submitting || photoCapturing} />
            </Tabs>

            <Box sx={{ mb: 3, p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <FormControlLabel
                control={<Checkbox checked={photoConsent} onChange={(_, value) => setPhotoConsent(value)} />}
                label='Foto otomatis setelah check-in (peserta telah memberikan persetujuan)'
              />
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                Kamera foto otomatis aktif setelah check-in berhasil. Pastikan peserta sudah memberi
                persetujuan terlebih dahulu; foto disimpan secara privat.
              </Typography>
            </Box>

            {checkInMode === 'qr' ? (
              <>
                <Alert severity='info' sx={{ mb: 3 }}>
                  Pemindaian QR saat ini langsung mencatat check-in. Konfirmasi sebelum check-in dan
                  foto wajib sebelum finalisasi akan mengikuti pembaruan API attendance.
                </Alert>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant='h6' fontWeight={700}>Scan QR tiket</Typography>
                    <Typography variant='body2' color='text.secondary'>Arahkan kamera ke QR tiket peserta.</Typography>
                  </Box>
                  {scanning ? (
                    <Button color='error' variant='outlined' onClick={stopScanner} startIcon={<i className='tabler-camera-off' />}>
                      Hentikan kamera
                    </Button>
                  ) : (
                    <Button variant='contained' disabled={!checkInAccess.allowed} onClick={() => void startScanner()} startIcon={<i className='tabler-camera' />}>
                      Aktifkan kamera
                    </Button>
                  )}
                </Box>

                <Box
                  sx={{
                    mt: 3,
                    aspectRatio: '16 / 9',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'action.hover',
                    border: theme => `1px dashed ${theme.palette.divider}`,
                    display: 'grid',
                    placeItems: 'center',
                    position: 'relative'
                  }}
                >
                  <video ref={videoRef} muted playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', display: scanning ? 'block' : 'none' }} />
                  {!scanning && (
                    <Box sx={{ textAlign: 'center', px: 3, color: 'text.secondary' }}>
                      <i className='tabler-qrcode text-5xl' />
                      <Typography sx={{ mt: 1 }}>Aktifkan kamera dan izinkan akses, lalu arahkan ke QR tiket.</Typography>
                    </Box>
                  )}
                  {scanning && (
                    <>
                      <Box sx={{ position: 'absolute', inset: '18%', border: '2px solid', borderColor: 'primary.main', borderRadius: 2, pointerEvents: 'none', boxShadow: '0 0 0 9999px rgba(0,0,0,.12)' }} />
                      <Box sx={{ position: 'absolute', left: '50%', bottom: 18, transform: 'translateX(-50%)', bgcolor: 'rgba(0,0,0,.62)', color: 'common.white', px: 2, py: .75, borderRadius: 10, fontSize: 12, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                        Posisikan QR di dalam bingkai
                      </Box>
                </>
              )}
            </Box>

            {cameraMessage && <Alert severity={scanning ? 'success' : 'info'} sx={{ mt: 3 }}>{cameraMessage}</Alert>}
              </>
            ) : (
              <>
                <Typography variant='h6' fontWeight={700}>Cari peserta</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1, mb: 2 }}>
                  Pilih event dan pastikan data peserta sesuai sebelum mencatat kehadiran.
                </Typography>
                {availableEvents.length > 0 && (
                  <TextField select fullWidth size='small' label='Event' value={eventId}
                    onChange={event => { setEventId(event.target.value); setSearchName(''); setMatches([]) }}
                    sx={{ mb: 2 }}>
                    <MenuItem value=''>Pilih event</MenuItem>
                    {availableEvents.map(event => <MenuItem key={event.id} value={event.id}>{event.name}</MenuItem>)}
                  </TextField>
                )}
                {eventError && <Alert severity='warning' sx={{ mb: 2 }}>{eventError}</Alert>}
                <TextField
                  label='Nama, email, atau kode booking'
                  fullWidth
                  disabled={!eventId || submitting}
                  value={searchName}
                  onChange={event => { setSearchName(event.target.value); setSelectedRegistration(null) }}
                  helperText='Masukkan minimal 2 karakter. Hasil pencarian terbatas pada event yang dipilih.'
                  sx={{ mb: 2 }}
                />
                {searching && <CircularProgress size={22} sx={{ mb: 2 }} />}
                {searchError && <Alert severity='error' sx={{ mb: 2 }}>{searchError}</Alert>}
                <Stack spacing={1} sx={{ maxHeight: 270, overflowY: 'auto' }}>
                  {matches.map(person => (
                    <Box key={person.registrationId} sx={{ border: '1px solid', borderColor: selectedRegistration?.registrationId === person.registrationId ? 'primary.main' : 'divider', borderRadius: 2, p: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={700}>{person.fullName}</Typography>
                          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', overflowWrap: 'anywhere' }}>
                            {person.bookingCode} · {person.email}
                          </Typography>
                          <Chip label={person.attendanceState} color={person.canCheckIn ? 'success' : 'default'} size='small' sx={{ mt: 1 }}/>
                        </Box>
                        <Button variant='outlined' size='small' disabled={!person.canCheckIn || !checkInAccess.allowed || submitting}
                          onClick={() => setSelectedRegistration(person)}>
                          {selectedRegistration?.registrationId === person.registrationId ? 'Dipilih' : 'Pilih'}
                        </Button>
                      </Box>
                    </Box>
                  ))}
                  {searchName.trim().length >= 2 && !searching && !searchError && matches.length === 0 && (
                    <Typography variant='body2' color='text.secondary'>Tidak ada peserta yang cocok di event ini.</Typography>
                  )}
                </Stack>
                {selectedRegistration && (
                  <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'primary.main', borderRadius: 2 }}>
                    <Typography fontWeight={700}>Konfirmasi: {selectedRegistration.fullName}</Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                      Kode booking {selectedRegistration.bookingCode}. Tindakan ini akan mencatat kehadiran peserta.
                    </Typography>
                    <Button variant='contained' disabled={submitting || !checkInAccess.allowed || !selectedRegistration.canCheckIn}
                      onClick={() => void confirmManualCheckIn()}>
                      {submitting ? 'Memproses...' : 'Konfirmasi CheckIn manual'}
                    </Button>
                  </Box>
                )}

              </>
            )}
            {error && <Alert severity='error' sx={{ mt: 3 }}>{error}</Alert>}
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, alignSelf: 'start' }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Typography variant='h6' fontWeight={700}>Latest result</Typography>
            {!result ? (
              <Box sx={{ py: 7, textAlign: 'center', color: 'text.secondary' }}>
                <i className='tabler-scan text-5xl' />
                <Typography sx={{ mt: 1.5 }}>No participant checked in yet.</Typography>
              </Box>
            ) : (
              <Box sx={{ mt: 3 }}>
                <Alert severity='success' icon={<i className='tabler-circle-check' />}>
                  Check-in successful
                </Alert>
                {photoConsent && (
                  <Box sx={{ mt: 2, display: 'grid', gap: 1.5 }}>
                    {photoCapturing && (
                      <Box sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: 'action.hover' }}>
                        <video ref={photoVideoRef} autoPlay playsInline muted
                          style={{ display: 'block', width: '100%', maxHeight: 220, objectFit: 'cover' }} />
                      </Box>
                    )}
                    <Alert severity={photoStatus.includes('berhasil tersimpan') ? 'success'
                      : photoStatus.includes('BELUM tersimpan') ? 'warning' : 'info'}>
                      {photoStatus || 'Menyiapkan foto otomatis...'}
                    </Alert>
                    {photoStatus.includes('BELUM tersimpan') && (
                      <Button variant='outlined' disabled={photoCapturing}
                        onClick={() => setPhotoRetry(retry => retry + 1)}>
                        Coba simpan foto lagi
                      </Button>
                    )}
                  </Box>
                )}
                <Box sx={{ mt: 3, display: 'grid', gap: 2 }}>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Participant</Typography>
                    <Typography fontWeight={700}>{result.fullName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Booking code</Typography>
                    <Typography>{result.bookingCode}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Event</Typography>
                    <Typography>{result.eventName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Package / payment selection</Typography>
                    <Typography fontWeight={650}>{result.eventPackageName || 'No package assigned'}</Typography>
                  </Box>
                  {raceCategory && (
                    <Box>
                      <Typography variant='caption' color='text.secondary'>Race category</Typography>
                      <Typography fontWeight={650}>{raceCategory.title}</Typography>
                      {raceCategory.distance && <Typography variant='body2' color='text.secondary'>{String(raceCategory.distance)}</Typography>}
                    </Box>
                  )}
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Checked in</Typography>
                    <Typography>{formatDateTime(result.checkedInAtUtc)} WIB</Typography>
                  </Box>
                </Box>

                {racePack && (
                  <Box sx={{ mt: 3, p: 2.5, borderRadius: 2, bgcolor: 'action.hover', border: theme => `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                      <i className='tabler-package text-xl' />
                      <Typography fontWeight={750}>Hand over at check-in</Typography>
                    </Box>
                    <Typography fontWeight={650}>{racePack.title}</Typography>
                    <Typography variant='body2' sx={{ mt: .75, whiteSpace: 'pre-wrap' }}>
                      {String(racePack.contents || 'Race pack configured for this package.')}
                    </Typography>
                    {racePack.pickupLocation && (
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                        Pickup: {String(racePack.pickupLocation)}
                      </Typography>
                    )}
                  </Box>
                )}

                {experience && !racePack && result.eventPackageId && (
                  <Alert severity='info' sx={{ mt: 3 }}>
                    This participant is checked in, but no Race Pack is linked to the selected package yet. Configure it from the event workspace.
                  </Alert>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
