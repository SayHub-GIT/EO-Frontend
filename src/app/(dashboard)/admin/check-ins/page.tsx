'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { manualCheckIn, manualCheckOut, previewCheckInParticipant, searchCheckInParticipants, type AttendanceParticipant, type CheckInResponse, type CheckOutResponse } from '@/lib/check-ins'
import QrFaceCapture from '@/components/attendance/QrFaceCapture'
import { checkInQrWithPhoto, QrPhotoCheckInConflictError, QrPhotoCheckInUncertainError } from '@/lib/qr-photo-check-in'
import { getCurrentEventWorkspace } from '@/lib/event-workspace'
import { listAdminEvents, type AdminEvent } from '@/lib/admin-events'
import { useSearchParams } from 'next/navigation'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { getAdminEventExperience, type EventExperienceConfig, type EventWorkspaceItem } from '@/lib/event-experience'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'
import { eligibleManualCheckInMatches, isEligibleManualCheckIn } from '@/lib/manual-check-in-eligibility'
import { isConfirmedManualCheckInResponse, ManualCheckInConflictError } from '@/lib/manual-check-in-confirmation'
import { eligibleManualCheckOutMatches, isConfirmedManualCheckOutResponse, isEligibleManualCheckOut, ManualCheckOutConflictError } from '@/lib/manual-check-out'
import { requiresAttendanceModeSwitchConfirmation, type AttendanceMode } from '@/lib/attendance-mode-switch'
import { publishAttendanceChange } from '@/lib/attendance-refresh'
import { onCameraTabHidden } from '@/lib/camera-tab-visibility'

type CheckInMode = AttendanceMode

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
  const [pendingModeSwitch, setPendingModeSwitch] = useState<CheckInMode | null>(null)
  const [eventId, setEventId] = useState('')
  const [availableEvents, setAvailableEvents] = useState<AdminEvent[]>([])
  const [eventError, setEventError] = useState('')
  const [searchName, setSearchName] = useState('')
  const [manualSearchRefresh, setManualSearchRefresh] = useState(0)
  const [matches, setMatches] = useState<AttendanceParticipant[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedRegistration, setSelectedRegistration] = useState<AttendanceParticipant | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [qrPreview, setQrPreview] = useState<{ participant: AttendanceParticipant; token: string } | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [cameraMessage, setCameraMessage] = useState('')
  const [photoConsent, setPhotoConsent] = useState(false)
  const [qrPhoto, setQrPhoto] = useState<{ eventId: string; registrationId: string; jpeg: Blob } | null>(null)
  const [qrAttemptBlocked, setQrAttemptBlocked] = useState(false)
  const photoCapturing = Boolean(qrPreview && photoConsent && !qrPhoto)
  const [result, setResult] = useState<CheckInResponse | null>(null)
  const [checkoutResult, setCheckoutResult] = useState<CheckOutResponse | null>(null)
  const [resultMode, setResultMode] = useState<CheckInMode | null>(null)
  const [experience, setExperience] = useState<EventExperienceConfig | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const qrPreviewHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scanBusyRef = useRef(false)
  const previewBusyRef = useRef(false)
  const previewAbortRef = useRef<AbortController | null>(null)
  const scanStartingRef = useRef(false)
  const scannerEpochRef = useRef(0)
  const submittingRef = useRef(false)
  const checkInAccess = usePermissionAccess('attendance.checkin')
  const checkoutAccess = usePermissionAccess('attendance.checkout')

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

  const cancelQrPreview = () => {
    previewAbortRef.current?.abort()
    previewAbortRef.current = null
    previewBusyRef.current = false
    setPreviewing(false)
    setQrPreview(null)
    setQrPhoto(null)
  }

  useEffect(() => () => {
    stopScanner()
    previewAbortRef.current?.abort()
  }, [])

  useEffect(() => onCameraTabHidden(document, () => {
    if (!streamRef.current && !scanStartingRef.current) return
    stopScanner()
    setCameraMessage('Tab tidak aktif. Kamera QR dihentikan; aktifkan kembali untuk memindai.')
  }), [])

  useEffect(() => {
    if (checkInMode === 'qr' && qrPreview) qrPreviewHeadingRef.current?.focus()
  }, [checkInMode, qrPreview?.participant.registrationId])

  useEffect(() => {
    setQrPreview(null)
    setQrPhoto(null)
    setPhotoConsent(false)
  }, [eventId])

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
    const controller = new AbortController()

    setMatches([])
    setSelectedRegistration(null)
    setSearchError('')

    if (checkInMode === 'qr' || (checkInMode === 'checkout' && !checkoutAccess.allowed) || !eventId || searchName.trim().length < 2) {
      setSearching(false)
      return () => { active = false; controller.abort() }
    }

    setSearching(true)
    const delay = window.setTimeout(() => {
      void searchCheckInParticipants(eventId, searchName, controller.signal)
        .then(rows => {
          if (active && !controller.signal.aborted) {
            setMatches(rows.filter(row => row.eventId === eventId))
          }
        })
        .catch(cause => {
          if (active && !controller.signal.aborted) {
            setSearchError(cause instanceof Error ? cause.message : 'Pencarian peserta gagal.')
          }
        })
        .finally(() => {
          if (active && !controller.signal.aborted) setSearching(false)
        })
    }, 350)

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(delay)
    }
  }, [checkInMode, eventId, searchName, manualSearchRefresh, checkoutAccess.allowed])

  const manualEligibleMatches = useMemo(() => eligibleManualCheckInMatches(matches, eventId), [matches, eventId])
  const checkoutEligibleMatches = useMemo(() => eligibleManualCheckOutMatches(matches, eventId), [matches, eventId])

  const raceCategory = useMemo(
    () => result ? itemForPackage(experience?.moduleData?.['race-categories'], result.eventPackageId) : null,
    [experience, result]
  )
  const racePack = useMemo(
    () => result ? itemForPackage(experience?.moduleData?.['race-pack'], result.eventPackageId) : null,
    [experience, result]
  )

  const confirmManualCheckIn = async () => {
    const candidate = selectedRegistration
    const selectedEventId = eventId

    if (
      checkInMode !== 'manual' ||
      !candidate ||
      !isEligibleManualCheckIn(candidate, selectedEventId) ||
      !checkInAccess.allowed ||
      submittingRef.current ||
      photoCapturing ||
      searching
    ) return

    submittingRef.current = true
    setSubmitting(true)
    setError('')
    setResult(null)
    setResultMode(null)
    setExperience(null)

    try {
      const response = await manualCheckIn(candidate.registrationId)

      if (!isConfirmedManualCheckInResponse(response, candidate.registrationId, selectedEventId)) {
        setSelectedRegistration(null)
        setMatches([])
        setManualSearchRefresh(value => value + 1)
        throw new Error('Respons Check-In dari server tidak sesuai. Periksa status kehadiran yang terbaru sebelum mengulangi.')
      }

      setResultMode('manual')
      setCheckoutResult(null)
      setResult(response)
      publishAttendanceChange(response.eventId)
      setMatches(current => current.map(item =>
        item.registrationId === response.registrationId
          ? { ...item, canCheckIn: false, status: 3, attendanceState: 'Checked in', checkedInAtUtc: response.checkedInAtUtc }
          : item
      ))
      setSelectedRegistration(null)
      stopScanner()

      try { setExperience(await getAdminEventExperience(response.eventId)) }
      catch { setExperience(null) }
    } catch (cause) {
      if (cause instanceof ManualCheckInConflictError) {
        setSelectedRegistration(null)
        setMatches([])
        setManualSearchRefresh(value => value + 1)
        setError('Status peserta berubah di server. Daftar sedang diperbarui; periksa kembali sebelum konfirmasi. ' + cause.message)
      } else {
        setError(cause instanceof Error ? cause.message : 'Check-In gagal. Periksa status terbaru sebelum mencoba lagi.')
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const confirmManualCheckOut = async () => {
    const candidate = selectedRegistration
    const selectedEventId = eventId

    if (
      checkInMode !== 'checkout' ||
      !candidate ||
      !isEligibleManualCheckOut(candidate, selectedEventId) ||
      !checkoutAccess.allowed ||
      submittingRef.current ||
      photoCapturing ||
      searching
    ) return

    submittingRef.current = true
    setSubmitting(true)
    setError('')
    setResult(null)
    setResultMode(null)
    setCheckoutResult(null)
    setExperience(null)

    const refreshCandidates = () => {
      setSelectedRegistration(null)
      setMatches([])
      setManualSearchRefresh(value => value + 1)
    }

    try {
      const response = await manualCheckOut(candidate.registrationId)

      if (!isConfirmedManualCheckOutResponse(response, candidate.registrationId, selectedEventId)) {
        refreshCandidates()
        throw new Error('Respons Check-Out tidak dapat diverifikasi. Periksa status peserta sebelum mencoba lagi.')
      }

      setCheckoutResult(response)
      publishAttendanceChange(response.eventId)
      setMatches(current => current.map(item =>
        item.registrationId === response.registrationId
          ? { ...item, canCheckOut: false, checkedOutAtUtc: response.checkedOutAtUtc, attendanceState: 'Checked out' }
          : item
      ))
      setSelectedRegistration(null)
    } catch (cause) {
      if (cause instanceof ManualCheckOutConflictError) {
        refreshCandidates()
        setError('Status peserta telah berubah. Daftar sedang diperbarui; pilih ulang peserta sebelum Check-Out. ' + cause.message)
      } else {
        setError(cause instanceof Error ? cause.message : 'Check-Out gagal. Verifikasi status terbaru sebelum mencoba lagi.')
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const handleDecodedToken = async (value: string) => {
    const decoded = value.trim()
    if (!decoded || previewBusyRef.current || submittingRef.current) return

    previewBusyRef.current = true
    const controller = new AbortController()
    previewAbortRef.current = controller
    stopScanner()
    setQrPreview(null)
    setQrPhoto(null)
    setPreviewing(true)
    setError('')
    setResult(null)
    setExperience(null)

    try {
      const participant = await previewCheckInParticipant(decoded, controller.signal)
      if (controller.signal.aborted) return

      if (eventId && participant.eventId !== eventId) {
        setError('QR tiket ini bukan untuk event yang dipilih.')
        return
      }

      setQrPreview({ participant, token: decoded })
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'QR tiket tidak dapat divalidasi.')
      }
    } finally {
      if (previewAbortRef.current === controller) {
        previewAbortRef.current = null
        previewBusyRef.current = false
        setPreviewing(false)
      }
    }
  }

  const confirmQrCheckIn = async () => {
    const preview = qrPreview
    const photo = qrPhoto
    if (
      checkInMode !== 'qr' || !preview?.participant.canCheckIn || !photo ||
      !photoConsent || !checkInAccess.allowed || previewing || submittingRef.current ||
      qrAttemptBlocked || preview.participant.eventId !== eventId ||
      photo.eventId !== preview.participant.eventId ||
      photo.registrationId !== preview.participant.registrationId
    ) return

    submittingRef.current = true
    setSubmitting(true)
    setError('')
    setResult(null)
    setResultMode(null)
    setCheckoutResult(null)
    setExperience(null)

    try {
      const response = await checkInQrWithPhoto(preview.token, preview.participant, photo.jpeg, photoConsent)
      setResultMode('qr')
      setResult(response)
      publishAttendanceChange(response.eventId)
      cancelQrPreview()
      stopScanner()

      try { setExperience(await getAdminEventExperience(response.eventId)) }
      catch { setExperience(null) }
    } catch (cause) {
      setQrAttemptBlocked(true)
      cancelQrPreview()
      if (cause instanceof QrPhotoCheckInConflictError || cause instanceof QrPhotoCheckInUncertainError) {
        setError(cause.message)
      } else {
        setError((cause instanceof Error ? cause.message : 'Finalisasi gagal.') +
          ' Periksa status kehadiran sebelum memindai atau mengirim ulang.')
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const startScanner = async () => {
    if (scanning || scanStartingRef.current || submittingRef.current || photoCapturing || qrAttemptBlocked || !eventId) return

    cancelQrPreview()
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

  const applyModeSwitch = (nextMode: CheckInMode) => {
    stopScanner()
    cancelQrPreview()
    setCheckInMode(nextMode)
    setPendingModeSwitch(null)
    setSearchName('')
    setMatches([])
    setSelectedRegistration(null)
    setSearchError('')
    setError('')
    setCameraMessage('')
    // Keep the last server-confirmed transaction visible while staff switches modes.
  }

  const requestModeSwitch = (nextMode: CheckInMode) => {
    if (nextMode === checkInMode || submitting || submittingRef.current || photoCapturing) return

    if (requiresAttendanceModeSwitchConfirmation({
      currentMode: checkInMode,
      targetMode: nextMode,
      hasSelectedRegistration: Boolean(selectedRegistration),
      hasQrPreview: Boolean(qrPreview),
      isScanning: scanning || Boolean(streamRef.current) || scanStartingRef.current,
      isPreviewing: previewing || previewBusyRef.current
    })) {
      setPendingModeSwitch(nextMode)
      return
    }

    applyModeSwitch(nextMode)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Dialog
        open={pendingModeSwitch !== null}
        onClose={() => setPendingModeSwitch(null)}
        aria-labelledby='attendance-mode-switch-title'
        aria-describedby='attendance-mode-switch-description'
        fullWidth
        maxWidth='xs'
      >
        <DialogTitle id='attendance-mode-switch-title'>Ganti metode kehadiran?</DialogTitle>
        <DialogContent>
          <DialogContentText id='attendance-mode-switch-description'>
            Pilihan peserta, preview QR, atau kamera yang sedang aktif akan dibatalkan.
            Check-In dan Check-Out yang sudah berhasil tercatat tidak akan dibatalkan,
            dan hasil transaksi terakhir tetap ditampilkan.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant='outlined' onClick={() => setPendingModeSwitch(null)}>
            Tetap di sini
          </Button>
          <Button variant='contained' disabled={submitting || submittingRef.current || photoCapturing}
            onClick={() => { if (pendingModeSwitch !== null) applyModeSwitch(pendingModeSwitch) }}>
            Ya, ganti metode
          </Button>
        </DialogActions>
      </Dialog>
      <Box>
        <Typography variant='h4' fontWeight={800}>Check-in peserta</Typography>
        <Typography color='text.secondary' sx={{ mt: 1, maxWidth: 760 }}>
          Scan QR tiket, catat kehadiran manual, atau proses Check-Out peserta. Informasi paket ditampilkan setelah Check-In berhasil.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.2fr) minmax(320px, .8fr)' }, gap: 4 }}>
        <Card elevation={0} sx={{ minWidth: 0, border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 }, minWidth: 0 }}>
            <Tabs
              value={checkInMode}
              variant='scrollable'
              scrollButtons='auto'
              allowScrollButtonsMobile
              aria-label='Pilih metode kehadiran'
              sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', maxWidth: '100%' }}
              onChange={(_, nextMode: CheckInMode) => requestModeSwitch(nextMode)}
            >
              <Tab value='qr' label='Scan QR' disabled={submitting || photoCapturing} sx={{ minWidth: 112, px: 1.5, fontSize: '0.875rem', minHeight: 44 }} />
              <Tab value='manual' label='Manual Check-In' disabled={submitting || photoCapturing} sx={{ minWidth: 146, px: 1.5, fontSize: '0.875rem', minHeight: 44 }} />
              <Tab value='checkout' label='Manual Check-Out' disabled={submitting || photoCapturing} sx={{ minWidth: 146, px: 1.5, fontSize: '0.875rem', minHeight: 44 }} />
            </Tabs>

            {checkInMode === 'qr' ? (
              <>
                {availableEvents.length > 0 && (
                  <TextField select fullWidth size='small' label='Event untuk Scan QR' value={eventId}
                    disabled={submitting || scanning || previewing || Boolean(qrPreview)}
                    onChange={event => {
                      cancelQrPreview()
                      setEventId(event.target.value)
                      setCameraMessage('')
                    }} sx={{ mb: 2 }}>
                    <MenuItem value=''>Pilih event</MenuItem>
                    {availableEvents.map(item => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                  </TextField>
                )}
                <Box sx={{ mb: 3, p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <FormControlLabel
                    control={<Checkbox checked={photoConsent} disabled={submitting} onChange={(_, value) => {
                      setPhotoConsent(value)
                      setQrPhoto(null)
                    }} />}
                    label='Peserta sudah menyetujui pengambilan foto wajah sebelum Check-In'
                  />
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                    Setelah QR valid dan persetujuan dikonfirmasi, kamera mendeteksi satu wajah.
                    Foto dikirim secara privat bersama konfirmasi Check-In.
                  </Typography>
                </Box>
                <Alert severity='info' sx={{ mb: 3 }}>
                  QR hanya memvalidasi peserta. Check-In baru dicatat setelah wajah terdeteksi, foto berhasil diambil,
                  dan tombol konfirmasi ditekan. Tanpa foto, Check-In QR tidak dapat diproses.
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
                    <Button variant='contained' disabled={!checkInAccess.allowed || previewing || submitting || photoCapturing || qrAttemptBlocked || !eventId} onClick={() => void startScanner()} startIcon={<i className='tabler-camera' />}>
                      {qrPreview ? 'Pindai QR lain' : 'Aktifkan kamera'}
                    </Button>
                  )}
                </Box>

                <Box
                  sx={{
                    mt: 3,
                    aspectRatio: { xs: '4 / 3', sm: '16 / 9' },
                    minWidth: 0,
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'action.hover',
                    border: theme => `1px dashed ${theme.palette.divider}`,
                    display: 'grid',
                    placeItems: 'center',
                    position: 'relative'
                  }}
                >
                  <video ref={videoRef} muted playsInline autoPlay aria-label='Pratinjau kamera pemindai QR' style={{ width: '100%', height: '100%', objectFit: 'cover', display: scanning ? 'block' : 'none' }} />
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

            {qrAttemptBlocked && (
              <Alert severity='warning' sx={{ mt: 2 }}>
                Status finalisasi QR sebelumnya harus diperiksa sebelum mulai transaksi baru.
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  <Button size='small' color='inherit' component='a'
                    href={eventId ? `/admin/events/${encodeURIComponent(eventId)}/attendance` : '/admin/events'}
                    target='_blank' rel='noopener noreferrer'>
                    Cek daftar kehadiran
                  </Button>
                  <Button size='small' color='inherit' onClick={() => {
                    setQrAttemptBlocked(false)
                    setError('')
                  }}>Sudah diperiksa, lanjut scan</Button>
                </Box>
              </Alert>
            )}
            {cameraMessage && <Alert severity={scanning ? 'success' : 'info'} role='status' sx={{ mt: 3 }}>{cameraMessage}</Alert>}
            {previewing && (
              <Stack direction='row' alignItems='center' spacing={1.5} role='status' aria-live='polite' sx={{ mt: 3 }}>
                <CircularProgress size={20} aria-label='Memvalidasi QR tiket' />
                <Typography variant='body2'>Memeriksa QR dan status peserta...</Typography>
                <Button size='small' onClick={cancelQrPreview}>Batal</Button>
              </Stack>
            )}
            {qrPreview && (
              <Box sx={{ mt: 3, p: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Alert severity={qrPreview.participant.canCheckIn ? 'success' : 'warning'} sx={{ mb: 2 }}>
                  {qrPreview.participant.canCheckIn
                    ? 'QR valid. Pastikan data peserta benar sebelum mencatat kehadiran.'
                    : qrPreview.participant.attendanceState}
                </Alert>
                <Typography ref={qrPreviewHeadingRef} component='h2' tabIndex={-1} variant='h6' fontWeight={700} sx={{ overflowWrap: 'anywhere', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 3 } }}>
                  {qrPreview.participant.fullName}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1, overflowWrap: 'anywhere' }}>
                  Kode booking: {qrPreview.participant.bookingCode}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Event: {qrPreview.participant.eventName}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Paket: {qrPreview.participant.eventPackageName || 'Tidak ada paket'}
                </Typography>
                <Typography variant='body2' sx={{ mt: 1 }}>
                  Status: {qrPreview.participant.attendanceState}
                </Typography>
                {qrPreview.participant.canCheckIn && photoConsent && checkInAccess.allowed && !submitting && (
                  <Box sx={{ mt: 2 }}>
                    <QrFaceCapture
                      key={`${qrPreview.participant.eventId}:${qrPreview.participant.registrationId}`}
                      eventId={qrPreview.participant.eventId}
                      registrationId={qrPreview.participant.registrationId}
                      participantName={qrPreview.participant.fullName}
                      consentConfirmed={photoConsent}
                      onCaptured={jpeg => setQrPhoto({
                        eventId: qrPreview.participant.eventId,
                        registrationId: qrPreview.participant.registrationId,
                        jpeg
                      })}
                      onCancel={() => { cancelQrPreview(); setError('') }}
                    />
                  </Box>
                )}
                {qrPhoto &&
                  qrPhoto.eventId === qrPreview.participant.eventId &&
                  qrPhoto.registrationId === qrPreview.participant.registrationId && (
                    <Alert severity='success' sx={{ mt: 2 }}>Foto siap dikirim bersama QR.</Alert>
                  )}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
                  <Button variant='contained'
                    disabled={!qrPreview.participant.canCheckIn || !checkInAccess.allowed || !photoConsent ||
                      !qrPhoto || qrPhoto.eventId !== qrPreview.participant.eventId ||
                      qrPhoto.registrationId !== qrPreview.participant.registrationId ||
                      submitting || qrAttemptBlocked || qrPreview.participant.eventId !== eventId}
                    onClick={() => void confirmQrCheckIn()} fullWidth>
                    {submitting ? 'Memproses Check-In...' : 'Konfirmasi Check-In dengan foto'}
                  </Button>
                  <Button variant='outlined' disabled={submitting}
                    onClick={() => { cancelQrPreview(); setError('') }} fullWidth>
                    Batalkan
                  </Button>
                </Stack>
              </Box>
            )}
              </>
            ) : checkInMode === 'manual' ? (
              <>
                <Typography variant='h6' fontWeight={700}>Cari peserta</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1, mb: 2 }}>
                  Pilih event dan pastikan data peserta sesuai sebelum mencatat kehadiran. Check-In manual tidak memerlukan kamera atau foto wajah.
                </Typography>
                {availableEvents.length > 0 && (
                  <TextField select fullWidth size='small' label='Event' value={eventId}
                    disabled={submitting || photoCapturing}
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
                  disabled={!eventId || submitting || photoCapturing}
                  value={searchName}
                  onChange={event => { setSearchName(event.target.value); setSelectedRegistration(null) }}
                  helperText='Masukkan minimal 2 karakter. Hasil pencarian terbatas pada event yang dipilih.'
                  sx={{ mb: 2 }}
                />
                {searching && (
                  <Stack direction='row' alignItems='center' spacing={1.5} role='status' aria-live='polite' sx={{ mb: 2 }}>
                    <CircularProgress size={20} aria-label='Memuat peserta' />
                    <Typography variant='body2' color='text.secondary'>Mencari peserta...</Typography>
                  </Stack>
                )}
                {searchError && <Alert severity='error' sx={{ mb: 2 }}>{searchError}</Alert>}
                {searchName.trim().length >= 2 && !searching && !searchError && manualEligibleMatches.length > 0 && (
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                    Menampilkan {manualEligibleMatches.length} peserta yang dapat check-in dari hasil pencarian.
                  </Typography>
                )}
                <Stack spacing={1} sx={{ maxHeight: 270, overflowY: 'auto' }}>
                  {manualEligibleMatches.map(person => (
                    <Box key={person.registrationId} sx={{ border: '1px solid', borderColor: selectedRegistration?.registrationId === person.registrationId ? 'primary.main' : 'divider', borderRadius: 2, p: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={700}>{person.fullName}</Typography>
                          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', overflowWrap: 'anywhere' }}>
                            {person.bookingCode} · {person.email}
                          </Typography>
                          <Chip label={person.attendanceState} color={person.canCheckIn ? 'success' : 'default'} size='small' sx={{ mt: 1 }}/>
                        </Box>
                        <Button variant='outlined' size='small' disabled={!isEligibleManualCheckIn(person, eventId) || !checkInAccess.allowed || submitting || photoCapturing}
                          onClick={() => setSelectedRegistration(person)}>
                          {selectedRegistration?.registrationId === person.registrationId ? 'Dipilih' : 'Pilih'}
                        </Button>
                      </Box>
                    </Box>
                  ))}
                  {searchName.trim().length >= 2 && !searching && !searchError && manualEligibleMatches.length === 0 && (
                    <Typography variant='body2' color='text.secondary'>
                      {matches.length > 0
                        ? 'Tidak ada peserta yang dapat check-in dalam hasil ini. Coba nama atau kode booking yang lebih spesifik.'
                        : 'Tidak ada hasil pencarian. Coba nama atau kode booking lain.'}
                    </Typography>
                  )}
                </Stack>
                {selectedRegistration && (
                  <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'primary.main', borderRadius: 2 }}>
                    <Typography fontWeight={700}>Konfirmasi: {selectedRegistration.fullName}</Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                      Kode booking {selectedRegistration.bookingCode}. Event: {selectedRegistration.eventName}.
                      Pastikan orang dan tiketnya sesuai. Kehadiran baru dicatat setelah konfirmasi.
                    </Typography>
                    <Button variant='contained' disabled={submitting || photoCapturing || searching || !checkInAccess.allowed || !isEligibleManualCheckIn(selectedRegistration, eventId)}
                      onClick={() => void confirmManualCheckIn()}>
                      {submitting ? 'Mencatat kehadiran...' : 'Konfirmasi CheckIn manual'}
                    </Button>
                  </Box>
                )}

              </>
            ) : (
              <>
                <Typography variant='h6' fontWeight={700}>Cari peserta untuk Check-Out</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1, mb: 2 }}>
                  Hanya peserta yang sudah Check-In dan belum Check-Out yang dapat dipilih.
                </Typography>
                {availableEvents.length > 0 && (
                  <TextField select fullWidth size='small' label='Event' value={eventId}
                    disabled={submitting || photoCapturing}
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
                  disabled={!eventId || submitting || photoCapturing || !checkoutAccess.allowed}
                  value={searchName}
                  onChange={event => { setSearchName(event.target.value); setSelectedRegistration(null) }}
                  helperText='Masukkan minimal 2 karakter. Hasil pencarian terbatas pada event yang dipilih.'
                  sx={{ mb: 2 }}
                />
                {!checkoutAccess.allowed && (
                  <Alert severity='warning' sx={{ mb: 2 }}>
                    Akun ini tidak memiliki izin Check-Out peserta.
                  </Alert>
                )}
                {searching && (
                  <Stack direction='row' alignItems='center' spacing={1.5} role='status' aria-live='polite' sx={{ mb: 2 }}>
                    <CircularProgress size={20} aria-label='Memuat peserta untuk Check-Out' />
                    <Typography variant='body2' color='text.secondary'>Mencari peserta...</Typography>
                  </Stack>
                )}
                {searchError && <Alert severity='error' sx={{ mb: 2 }}>{searchError}</Alert>}
                {searchName.trim().length >= 2 && !searching && !searchError && checkoutEligibleMatches.length > 0 && (
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                    Menampilkan {checkoutEligibleMatches.length} peserta yang dapat Check-Out dari hasil pencarian.
                  </Typography>
                )}
                <Stack spacing={1} sx={{ maxHeight: 270, overflowY: 'auto' }}>
                  {checkoutEligibleMatches.map(person => (
                    <Box key={person.registrationId} sx={{ border: '1px solid', borderColor: selectedRegistration?.registrationId === person.registrationId ? 'primary.main' : 'divider', borderRadius: 2, p: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{person.fullName}</Typography>
                          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', overflowWrap: 'anywhere' }}>
                            {person.bookingCode} · {person.email}
                          </Typography>
                          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.75 }}>
                            Check-In: {person.checkedInAtUtc ? formatDateTime(person.checkedInAtUtc) : 'Belum tercatat'} WIB
                          </Typography>
                        </Box>
                        <Button variant='outlined' size='small' disabled={!isEligibleManualCheckOut(person, eventId) || !checkoutAccess.allowed || submitting || searching}
                          onClick={() => setSelectedRegistration(person)}>
                          {selectedRegistration?.registrationId === person.registrationId ? 'Dipilih' : 'Pilih'}
                        </Button>
                      </Box>
                    </Box>
                  ))}
                  {searchName.trim().length >= 2 && !searching && !searchError && checkoutEligibleMatches.length === 0 && (
                    <Typography variant='body2' color='text.secondary'>
                      {matches.length > 0
                        ? 'Tidak ada peserta yang dapat Check-Out dalam hasil ini. Cari nama atau kode booking yang lebih spesifik.'
                        : 'Tidak ada hasil pencarian. Coba nama atau kode booking lain.'}
                    </Typography>
                  )}
                </Stack>
                {selectedRegistration && isEligibleManualCheckOut(selectedRegistration, eventId) && (
                  <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'primary.main', borderRadius: 2 }}>
                    <Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
                      Konfirmasi Check-Out: {selectedRegistration.fullName}
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 1, mb: 2 }}>
                      Kode booking {selectedRegistration.bookingCode} · {selectedRegistration.eventName}.
                      Check-In tercatat {selectedRegistration.checkedInAtUtc ? formatDateTime(selectedRegistration.checkedInAtUtc) : '-'} WIB.
                    </Typography>
                    <Button variant='contained' disabled={submitting || photoCapturing || searching || !checkoutAccess.allowed || !isEligibleManualCheckOut(selectedRegistration, eventId)}
                      onClick={() => void confirmManualCheckOut()}>
                      {submitting ? 'Mencatat Check-Out...' : 'Konfirmasi CheckOut'}
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
            <Typography variant='h6' fontWeight={700}>{checkoutResult ? 'Hasil Check-Out' : 'Hasil kehadiran terakhir'}</Typography>
            {checkoutResult ? (
              <Box sx={{ mt: 3 }}>
                <Alert severity='success'>Check-Out berhasil dicatat oleh server.</Alert>
                <Box sx={{ mt: 3, display: 'grid', gap: 2 }}>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Peserta</Typography>
                    <Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{checkoutResult.fullName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Kode booking</Typography>
                    <Typography sx={{ overflowWrap: 'anywhere' }}>{checkoutResult.bookingCode}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Event</Typography>
                    <Typography>{checkoutResult.eventName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Waktu Check-In</Typography>
                    <Typography>{formatDateTime(checkoutResult.checkedInAtUtc)} WIB</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Waktu Check-Out</Typography>
                    <Typography fontWeight={700}>{formatDateTime(checkoutResult.checkedOutAtUtc)} WIB</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Petugas Check-Out</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Belum tersedia: respons API belum menyertakan identitas petugas.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : !result ? (
              <Box sx={{ py: 7, textAlign: 'center', color: 'text.secondary' }}>
                <i className='tabler-scan text-5xl' />
                <Typography sx={{ mt: 1.5 }}>Belum ada hasil {checkInMode === 'checkout' ? 'Check-Out' : 'Check-In'} terbaru.</Typography>
              </Box>
            ) : (
              <Box sx={{ mt: 3 }}>
                <Alert severity='success' icon={<i className='tabler-circle-check' />}>
                  Check-in successful
                </Alert>
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
