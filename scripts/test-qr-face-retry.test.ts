import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { FaceDetectionRetryableError } from '../src/lib/qr-face-capture'
import {
  FACE_CAPTURE_RETRY_DELAY_MS,
  FaceCaptureSessionExpiredError,
  MAX_FACE_CAPTURE_SESSION_MS,
  detectFaceWithAutoRetry
} from '../src/lib/qr-face-retry'

const video = { videoWidth: 960, videoHeight: 720 } as HTMLVideoElement
const detector = { detect: async () => [] }

test('automatically retries missing faces without repeating a QR validation', async () => {
  let clock = 0
  let detections = 0
  const attempts: number[] = []

  const count = await detectFaceWithAutoRetry(video, detector, new AbortController().signal, {
    now: () => clock,
    onAttempt: value => attempts.push(value),
    wait: async ms => { clock += ms },
    detect: async () => {
      detections += 1
      if (detections < 3) {
        clock += 2_000
        throw new FaceDetectionRetryableError('Belum ada wajah.')
      }
    }
  })

  assert.equal(count, 3)
  assert.deepEqual(attempts, [1, 2, 3])
  assert.equal(detections, 3)
  assert.equal(clock, 4_000 + FACE_CAPTURE_RETRY_DELAY_MS * 2)
})

test('multiple faces also retry but never falsely return a capture', async () => {
  let now = 0
  let attempts = 0
  const error = await detectFaceWithAutoRetry(video, detector, new AbortController().signal, {
    now: () => now,
    maxDurationMs: 4_000,
    wait: async ms => { now += ms },
    detect: async (_video, _detector, _signal, options) => {
      attempts += 1
      now += options.timeoutMs ?? 0
      throw new FaceDetectionRetryableError('Terlalu banyak wajah.')
    }
  }).then(() => null, reason => reason)

  assert.ok(error instanceof FaceCaptureSessionExpiredError)
  assert.equal(now, 4_000)
  assert.equal(attempts, 2)
})

test('30-second session budget ends without an unlimited retry loop', async () => {
  let now = 0
  let calls = 0

  await assert.rejects(detectFaceWithAutoRetry(video, detector, new AbortController().signal, {
    now: () => now,
    wait: async ms => { now += ms },
    detect: async (_video, _detector, _signal, options) => {
      now += options.timeoutMs ?? 0
      calls += 1
      throw new FaceDetectionRetryableError('Belum ada wajah.')
    }
  }), { name: 'FaceCaptureSessionExpiredError' })

  assert.equal(now, MAX_FACE_CAPTURE_SESSION_MS)
  assert.ok(calls >= 2 && calls <= 20)
})

test('camera permission failure stops immediately without more attempts', async () => {
  let calls = 0
  let waits = 0
  const denied = Object.assign(new Error('Izin kamera ditolak.'), { name: 'NotAllowedError' })

  await assert.rejects(detectFaceWithAutoRetry(video, detector, new AbortController().signal, {
    wait: async () => { waits += 1 },
    detect: async () => { calls += 1; throw denied }
  }), denied)
  assert.equal(calls, 1)
  assert.equal(waits, 0)
})

test('aborting a capture session ends retry without showing a stale success', async () => {
  const controller = new AbortController()
  let attempt = 0

  await assert.rejects(detectFaceWithAutoRetry(video, detector, controller.signal, {
    onAttempt: () => { attempt += 1 },
    detect: async () => {
      controller.abort()
      return
    }
  }), { name: 'AbortError' })
  assert.equal(attempt, 1)
})

test('a detector response after the deadline is not accepted as a face success', async () => {
  let now = 0
  await assert.rejects(detectFaceWithAutoRetry(video, detector, new AbortController().signal, {
    now: () => now,
    detect: async () => { now = MAX_FACE_CAPTURE_SESSION_MS + 1 }
  }), { name: 'FaceCaptureSessionExpiredError' })
})

test('UI keeps capture session alive on soft errors and disposes owned media on cancellation', () => {
  const src = readFileSync('src/components/attendance/QrFaceCapture.tsx', 'utf8')
  const retry = readFileSync('src/lib/qr-face-retry.ts', 'utf8')

  assert.match(src, /detectFaceWithAutoRetry\(/)
  assert.match(src, /onAttempt: attempt/)
  assert.match(src, /setRetry\(value => value \+ 1\)/)
  assert.match(src, /onCapturedRef\.current\(jpeg\)/)
  assert.match(src, /\[consentConfirmed, retry\]/)
  assert.match(src, /controller\.abort\(\)/)
  assert.match(src, /URL\.revokeObjectURL\(objectUrl\)/)
  assert.match(src, /stream\?\.getTracks\(\)\.forEach\(track => track\.stop\(\)\)/)
  assert.match(retry, /FaceDetectionRetryableError/)
  assert.doesNotMatch(src + retry, /checkInParticipant\(|qr-with-photo|uploadCheckInPhoto\(|localStorage|sessionStorage/)
})
