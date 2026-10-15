import assert from 'node:assert/strict'
import test from 'node:test'

import { requiresAttendanceModeSwitchConfirmation, type ModeSwitchContext } from '../src/lib/attendance-mode-switch'

const context = (overrides: Partial<ModeSwitchContext> = {}): ModeSwitchContext => ({
  currentMode: 'manual',
  targetMode: 'checkout',
  hasSelectedRegistration: false,
  hasQrPreview: false,
  isScanning: false,
  isPreviewing: false,
  ...overrides
})

test('no confirmation on same tab or when nothing is pending', () => {
  assert.equal(requiresAttendanceModeSwitchConfirmation(context()), false)
  assert.equal(requiresAttendanceModeSwitchConfirmation(context({ currentMode: 'checkout', targetMode: 'checkout', hasSelectedRegistration: true })), false)
  assert.equal(requiresAttendanceModeSwitchConfirmation(context({ currentMode: 'qr', targetMode: 'manual' })), false)
})

test('selected manual Check-In or Check-Out registration requires confirmation before changing modes', () => {
  assert.equal(requiresAttendanceModeSwitchConfirmation(context({ hasSelectedRegistration: true })), true)
  assert.equal(requiresAttendanceModeSwitchConfirmation(context({ currentMode: 'checkout', targetMode: 'qr', hasSelectedRegistration: true })), true)
})

test('validated QR preview must not disappear without confirmation', () => {
  assert.equal(requiresAttendanceModeSwitchConfirmation(context({ currentMode: 'qr', targetMode: 'checkout', hasQrPreview: true })), true)
})

test('active QR camera or pending preview requires explicit confirmation', () => {
  assert.equal(requiresAttendanceModeSwitchConfirmation(context({ currentMode: 'qr', targetMode: 'manual', isScanning: true })), true)
  assert.equal(requiresAttendanceModeSwitchConfirmation(context({ currentMode: 'qr', targetMode: 'manual', isPreviewing: true })), true)
})

test('a completed transaction alone never requires a switch confirmation', () => {
  const done = context()
  assert.equal(requiresAttendanceModeSwitchConfirmation(done), false)
})
