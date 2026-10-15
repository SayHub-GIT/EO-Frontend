export type AttendanceMode = 'qr' | 'manual' | 'checkout'

export type ModeSwitchContext = {
  currentMode: AttendanceMode
  targetMode: AttendanceMode
  hasSelectedRegistration: boolean
  hasQrPreview: boolean
  isScanning: boolean
  isPreviewing: boolean
}

/**
 * Only unsaved state or active camera/preview work needs confirmation.
 * A completed attendance result remains available after changing tabs.
 */
export const requiresAttendanceModeSwitchConfirmation = ({
  currentMode,
  targetMode,
  hasSelectedRegistration,
  hasQrPreview,
  isScanning,
  isPreviewing
}: ModeSwitchContext): boolean =>
  currentMode !== targetMode &&
  (hasSelectedRegistration || hasQrPreview || isScanning || isPreviewing)
