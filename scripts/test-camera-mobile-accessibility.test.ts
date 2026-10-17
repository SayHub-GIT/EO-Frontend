import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { onCameraTabHidden, type CameraVisibilityTarget } from '../src/lib/camera-tab-visibility'

class FakeDocument extends EventTarget {
  visibilityState: DocumentVisibilityState = 'visible'
  hide() {
    this.visibilityState = 'hidden'
    this.dispatchEvent(new Event('visibilitychange'))
  }
  show() {
    this.visibilityState = 'visible'
    this.dispatchEvent(new Event('visibilitychange'))
  }
}

test('camera keeps running while visible, but receives stop on hiding a tab', () => {
  const document = new FakeDocument()
  let stops = 0
  const unsubscribe = onCameraTabHidden(document as unknown as CameraVisibilityTarget, () => { stops += 1 })
  document.show()
  assert.equal(stops, 0)
  document.hide()
  assert.equal(stops, 1)
  unsubscribe()
  document.show()
  document.hide()
  assert.equal(stops, 1)
})

test('hidden-at-mount cannot start a camera unnoticed', () => {
  const document = new FakeDocument()
  document.visibilityState = 'hidden'
  let stops = 0
  const unsubscribe = onCameraTabHidden(document as unknown as CameraVisibilityTarget, () => { stops += 1 })
  assert.equal(stops, 1)
  unsubscribe()
})

test('Face Capture cancels only pending media on hidden tab and requires explicit restart', () => {
  const component = readFileSync('src/components/attendance/QrFaceCapture.tsx', 'utf8')
  assert.match(component, /onCameraTabHidden\(document, stopForHiddenTab\)/)
  assert.match(component, /if \(controller\.signal\.aborted \|\| completed\) return/)
  assert.match(component, /controller\.abort\(\)/)
  assert.match(component, /stopOwnedCamera\(\)/)
  assert.match(component, /unsubscribe\(\)/)
  assert.match(component, /Tab tidak aktif\. Kamera dihentikan/)
  assert.match(component, /setRetry\(value => value \+ 1\)/)
  assert.match(component, /role='alert'/)
  assert.match(component, /role='group'/)
  assert.match(component, /minHeight: 44/)
  assert.doesNotMatch(component, /localStorage|sessionStorage|window\.open\(/)
})

test('QR scanning also stops on hidden tab without discarding a validated QR token', () => {
  const page = readFileSync('src/app/(dashboard)/admin/check-ins/page.tsx', 'utf8')
  assert.match(page, /onCameraTabHidden\(document, \(\) => \{/)
  assert.match(page, /if \(!streamRef\.current && !scanStartingRef\.current\) return/)
  assert.match(page, /stopScanner\(\)/)
  assert.match(page, /Tab tidak aktif\. Kamera QR dihentikan/)
  assert.match(page, /role='status' sx=\{\{ mt: 3 \}\}>\{cameraMessage\}/)
  assert.match(page, /qrPreviewHeadingRef\.current\?\.focus\(\)/)
  assert.match(page, /tabIndex=\{-1\}/)
})

test('check-in method tabs remain readable and scroll horizontally at mobile widths', () => {
  const page = readFileSync('src/app/(dashboard)/admin/check-ins/page.tsx', 'utf8')
  assert.match(page, /variant='scrollable'/)
  assert.match(page, /allowScrollButtonsMobile/)
  assert.match(page, /aria-label='Pilih metode kehadiran'/)
  assert.match(page, /fontSize: '0\.875rem'/)
  assert.match(page, /minHeight: 44/)
  assert.match(page, /aspectRatio: \{ xs: '4 \/ 3', sm: '16 \/ 9' \}/)
  assert.match(page, /overflowWrap: 'anywhere'/)
  assert.doesNotMatch(page, /0\.68rem/)
})

test('unsupported native face detectors continue to fail closed, never skip a photo', () => {
  const component = readFileSync('src/components/attendance/QrFaceCapture.tsx', 'utf8')
  const page = readFileSync('src/app/(dashboard)/admin/check-ins/page.tsx', 'utf8')
  assert.match(component, /if \(!detector\) throw new Error/)
  assert.match(page, /!qrPhoto \|\| qrPhoto\.eventId/)
  assert.match(page, /checkInQrWithPhoto\(preview\.token, preview\.participant, photo\.jpeg, photoConsent\)/)
  assert.doesNotMatch(page, /checkInParticipant\(/)
})
