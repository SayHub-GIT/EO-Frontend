import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  FACE_CAPTURE_WINDOW_MS,
  MAX_FACE_PHOTO_BYTES,
  createFaceDetector,
  encodeDetectedFaceJpeg,
  faceCaptureError,
  waitForOneFace
} from '../src/lib/qr-face-capture'

const video = { videoWidth: 960, videoHeight: 720 } as HTMLVideoElement

test('face detector stays unavailable when browser lacks native detection support', () => {
  assert.equal(createFaceDetector({} as Window), null)
  class Detector {
    constructor(public options?: object) {}
    async detect() { return [{}] }
  }
  const available = { FaceDetector: Detector } as unknown as Window
  assert.ok(createFaceDetector(available))
})

test('waits for exactly one face before completing', async () => {
  let tries = 0
  let now = 0
  const detector = {
    detect: async () => (++tries === 3 ? [{}] : [])
  }

  await waitForOneFace(video, detector, new AbortController().signal, {
    now: () => now,
    wait: async delay => { now += delay }
  })
  assert.equal(tries, 3)
  assert.ok(now <= FACE_CAPTURE_WINDOW_MS)
})

test('rejects missing or multiple faces within the two-second window', async () => {
  for (const faces of [[], [{}, {}]]) {
    let now = 0
    await assert.rejects(
      waitForOneFace(video, { detect: async () => faces }, new AbortController().signal, {
        now: () => now,
        wait: async delay => { now += delay }
      }),
      /wajah|Wajah/
    )
    assert.equal(now, FACE_CAPTURE_WINDOW_MS)
  }
})

test('cancels without accepting a face after the operator abandons capture', async () => {
  const controller = new AbortController()
  await assert.rejects(
    waitForOneFace(video, { detect: async () => {
      controller.abort()
      return [{}]
    } }, controller.signal),
    { name: 'AbortError' }
  )
})

test('requires video dimensions before requesting detection or encoding', async () => {
  const emptyVideo = { videoWidth: 0, videoHeight: 0 } as HTMLVideoElement
  await assert.rejects(waitForOneFace(emptyVideo, { detect: async () => [{}] }, new AbortController().signal))
  await assert.rejects(encodeDetectedFaceJpeg(emptyVideo, {} as HTMLCanvasElement, new AbortController().signal))
})

test('encodes a bounded in-memory JPEG without an upload or storage URL', async () => {
  const dimensions = { width: 0, height: 0, calls: 0 }
  const canvas = {
    get width() { return dimensions.width },
    set width(value: number) { dimensions.width = value },
    get height() { return dimensions.height },
    set height(value: number) { dimensions.height = value },
    getContext: () => ({ drawImage: () => { dimensions.calls += 1 } }),
    toBlob: (callback: (blob: Blob | null) => void) =>
      callback(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }))
  } as unknown as HTMLCanvasElement

  const jpeg = await encodeDetectedFaceJpeg(video, canvas, new AbortController().signal)
  assert.equal(jpeg.type, 'image/jpeg')
  assert.equal(jpeg.size, 4)
  assert.equal(dimensions.width, 640)
  assert.equal(dimensions.height, 480)
  assert.equal(dimensions.calls, 1)
})

test('rejects oversized or wrong-type JPEG data after attempting compression', async () => {
  let calls = 0
  const canvas = {
    getContext: () => ({ drawImage: () => undefined }),
    toBlob: (callback: (blob: Blob | null) => void) => {
      calls += 1
      callback(new Blob([new Uint8Array(MAX_FACE_PHOTO_BYTES + 1)], { type: 'image/jpeg' }))
    }
  } as unknown as HTMLCanvasElement
  await assert.rejects(encodeDetectedFaceJpeg(video, canvas, new AbortController().signal), /400 KiB/)
  assert.equal(calls, 3)
})

test('maps camera permission and device failures to useful messages', () => {
  const blocked = Object.assign(new Error('blocked'), { name: 'NotAllowedError' })
  const missing = Object.assign(new Error('missing'), { name: 'NotFoundError' })
  assert.match(faceCaptureError(blocked), /Izin kamera/)
  assert.match(faceCaptureError(missing), /Kamera tidak ditemukan/)
})

test('isolated capture stage does not finalize check-in until S6.5', () => {
  const component = readFileSync('src/components/attendance/QrFaceCapture.tsx', 'utf8')
  const helper = readFileSync('src/lib/qr-face-capture.ts', 'utf8')

  assert.match(component, /consentConfirmed/)
  assert.match(component, /getUserMedia\(/)
  assert.match(component, /waitForOneFace\(/)
  assert.match(component, /URL\.revokeObjectURL\(objectUrl\)/)
  assert.match(component, /track\.stop\(\)/)
  assert.match(component, /onCaptured\(jpeg\)/)
  assert.doesNotMatch(component + helper, /checkInParticipant\(|qr-with-photo|uploadCheckInPhoto\(|localStorage|sessionStorage/)
})
