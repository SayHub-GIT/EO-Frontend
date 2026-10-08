type ActionState = { available: boolean; message: string }

const objectValue = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null

const dateValue = (value: unknown) => typeof value === 'string' ? Date.parse(value) : NaN
const hasNoQuota = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value <= 0

export const isMicrositeSourceAvailable = (source: string | null | undefined, bindings: Record<string, unknown>) =>
  !source || objectValue(bindings['module-access'])?.[source] !== false

export const getMicrositeActionState = (
  actionType: string | null | undefined,
  bindings: Record<string, unknown>,
  now = Date.now()
): ActionState => {
  if (actionType === 'quiz') {
    return isMicrositeSourceAvailable('event-quiz', bindings)
      ? { available: true, message: '' }
      : { available: false, message: 'Quiz belum tersedia untuk peserta' }
  }
  if (actionType !== 'registration') return { available: true, message: '' }
  const registration = objectValue(bindings['event-registration'])
  if (!registration) return { available: true, message: '' }
  if (registration.eventStatus && registration.eventStatus !== 'Published') {
    return { available: false, message: 'Pendaftaran belum tersedia' }
  }
  const opens = dateValue(registration.registrationOpenAtUtc)
  const closes = dateValue(registration.registrationCloseAtUtc)
  if (now < opens) return { available: false, message: 'Pendaftaran belum dibuka' }
  if (now > closes) return { available: false, message: 'Pendaftaran sudah ditutup' }
  if (hasNoQuota(registration.remainingQuota)) return { available: false, message: 'Kuota peserta sudah penuh' }
  if (Array.isArray(registration.packages)) {
    const packages = registration.packages.map(objectValue).filter((item): item is Record<string, unknown> => Boolean(item))
    if (packages.length === 0) return { available: false, message: 'Paket pendaftaran belum tersedia' }
    if (packages.every(item => hasNoQuota(item.remainingQuota))) {
      return { available: false, message: 'Semua paket pendaftaran sudah penuh' }
    }
  }
  return { available: true, message: '' }
}
