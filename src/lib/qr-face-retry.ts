import {
  FACE_CAPTURE_WINDOW_MS,
  FaceDetectionRetryableError,
  waitForOneFace,
  type FaceDetectorLike
} from '@/lib/qr-face-capture'

export const MAX_FACE_CAPTURE_SESSION_MS = 30_000
export const FACE_CAPTURE_RETRY_DELAY_MS = 160

type RetryOptions = {
  now?: () => number
  wait?: (delayMs: number, signal: AbortSignal) => Promise<void>
  detect?: typeof waitForOneFace
  onAttempt?: (attempt: number) => void
  maxDurationMs?: number
}

export class FaceCaptureSessionExpiredError extends Error {
  constructor() {
    super('Wajah belum berhasil ditangkap dalam 30 detik. QR tetap tervalidasi; batalkan atau mulai sesi foto baru.')
    this.name = 'FaceCaptureSessionExpiredError'
  }
}

const aborted = () => new DOMException('Pengambilan foto dibatalkan.', 'AbortError')

const delay = (milliseconds: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) return reject(aborted())

    const onAbort = () => {
      clearTimeout(timer)
      reject(aborted())
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, milliseconds)
    signal.addEventListener('abort', onAbort, { once: true })
  })

export async function detectFaceWithAutoRetry(
  video: HTMLVideoElement,
  detector: FaceDetectorLike,
  signal: AbortSignal,
  options: RetryOptions = {}
): Promise<number> {
  const now = options.now ?? Date.now
  const wait = options.wait ?? delay
  const detect = options.detect ?? waitForOneFace
  const deadline = now() + (options.maxDurationMs ?? MAX_FACE_CAPTURE_SESSION_MS)
  let attempt = 0

  while (now() < deadline) {
    if (signal.aborted) throw aborted()

    attempt += 1
    options.onAttempt?.(attempt)

    const remaining = deadline - now()

    try {
      await detect(video, detector, signal, {
        timeoutMs: Math.min(FACE_CAPTURE_WINDOW_MS, remaining),
        now,
        wait
      })
      if (signal.aborted) throw aborted()
      if (now() > deadline) throw new FaceCaptureSessionExpiredError()
      return attempt
    } catch (error) {
      if (signal.aborted) throw aborted()
      if (!(error instanceof FaceDetectionRetryableError)) throw error
    }

    const timeLeft = deadline - now()
    if (timeLeft <= 0) break
    await wait(Math.min(FACE_CAPTURE_RETRY_DELAY_MS, timeLeft), signal)
  }

  if (signal.aborted) throw aborted()
  throw new FaceCaptureSessionExpiredError()
}
