export const FACE_CAPTURE_WINDOW_MS = 2_000
export const MAX_FACE_PHOTO_BYTES = 400 * 1024

export class FaceDetectionRetryableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FaceDetectionRetryableError'
  }
}

export type FaceDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<unknown[]>
}

type FaceDetectorConstructor = new (options?: {
  fastMode?: boolean
  maxDetectedFaces?: number
}) => FaceDetectorLike

export const createFaceDetector = (browser: Window): FaceDetectorLike | null => {
  const Constructor = (browser as Window & { FaceDetector?: FaceDetectorConstructor }).FaceDetector
  if (!Constructor) return null

  try {
    return new Constructor({ fastMode: true, maxDetectedFaces: 2 })
  } catch {
    return null
  }
}

const cancelled = () => new DOMException('Pengambilan foto dibatalkan.', 'AbortError')

const waitForFrame = (delayMs: number, signal: AbortSignal): Promise<void> => new Promise((resolve, reject) => {
  if (signal.aborted) {
    reject(cancelled())
    return
  }

  const onAbort = () => {
    clearTimeout(timer)
    reject(cancelled())
  }
  const timer = setTimeout(() => {
    signal.removeEventListener('abort', onAbort)
    resolve()
  }, delayMs)
  signal.addEventListener('abort', onAbort, { once: true })
})

type DetectionOptions = {
  timeoutMs?: number
  now?: () => number
  wait?: (delayMs: number, signal: AbortSignal) => Promise<void>
}

export const waitForOneFace = async (
  video: HTMLVideoElement,
  detector: FaceDetectorLike,
  signal: AbortSignal,
  options: DetectionOptions = {}
): Promise<void> => {
  if (!video.videoWidth || !video.videoHeight) throw new Error('Kamera belum siap mengambil foto.')

  const timeoutMs = options.timeoutMs ?? FACE_CAPTURE_WINDOW_MS
  const now = options.now ?? Date.now
  const wait = options.wait ?? waitForFrame
  const started = now()
  let facesSeen = 0

  while (true) {
    if (signal.aborted) throw cancelled()
    const faces = await detector.detect(video)
    if (signal.aborted) throw cancelled()
    if (!Array.isArray(faces)) throw new Error('Respons deteksi wajah tidak valid.')
    facesSeen = faces.length

    const remaining = timeoutMs - (now() - started)
    if (facesSeen === 1 && remaining >= 0) return
    if (remaining <= 0) break
    await wait(Math.min(120, remaining), signal)
  }

  if (facesSeen > 1) throw new FaceDetectionRetryableError('Terdeteksi lebih dari satu wajah. Arahkan kamera ke satu peserta.')
  throw new FaceDetectionRetryableError('Wajah belum terdeteksi. Arahkan kamera ke wajah peserta.')
}

export const encodeDetectedFaceJpeg = async (
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  signal: AbortSignal
): Promise<Blob> => {
  if (signal.aborted) throw cancelled()
  if (!video.videoWidth || !video.videoHeight) throw new Error('Kamera belum siap mengambil foto.')

  const scale = Math.min(1, 640 / video.videoWidth, 640 / video.videoHeight)
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Pemrosesan foto tidak didukung browser.')
  context.drawImage(video, 0, 0, canvas.width, canvas.height)

  for (const quality of [0.75, 0.55, 0.4]) {
    if (signal.aborted) throw cancelled()
    const jpeg = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (signal.aborted) throw cancelled()
    if (jpeg?.type === 'image/jpeg' && jpeg.size >= 4 && jpeg.size <= MAX_FACE_PHOTO_BYTES) return jpeg
  }
  throw new Error('Ukuran foto melebihi batas 400 KiB. Kurangi resolusi kamera.')
}

export const faceCaptureError = (reason: unknown): string => {
  if (!(reason instanceof Error)) return 'Foto gagal diambil. Periksa kamera dan coba lagi.'
  switch (reason.name) {
    case 'NotAllowedError': return 'Izin kamera ditolak. Aktifkan izin kamera melalui pengaturan browser.'
    case 'NotFoundError': return 'Kamera tidak ditemukan pada perangkat ini.'
    case 'NotReadableError': return 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi itu lalu coba lagi.'
    case 'OverconstrainedError': return 'Kamera tidak mendukung pengaturan video yang diminta.'
    case 'SecurityError': return 'Kamera hanya dapat digunakan melalui HTTPS atau localhost.'
    default: return reason.message || 'Foto gagal diambil. Periksa kamera dan coba lagi.'
  }
}
