import type { AdminEvent } from '@/lib/admin-events'

/** Frontend guidance only. The backend must independently enforce this window. */
export function getQuizEventWindow(event: Pick<AdminEvent, 'status' | 'startAtUtc' | 'endAtUtc'>, nowMs: number) {
  const start = Date.parse(event.startAtUtc)
  const end = Date.parse(event.endAtUtc)
  const validWindow = Number.isFinite(start) && Number.isFinite(end) && end > start
  const active = event.status === 'Published' && validWindow && nowMs >= start && nowMs < end

  if (active) return { active: true, message: '' }
  if (event.status !== 'Published') return { active: false, message: 'Quiz hanya dapat dimulai saat event sudah dipublikasikan dan sedang berlangsung.' }
  if (!validWindow) return { active: false, message: 'Jadwal event tidak valid. Periksa waktu mulai dan selesai event.' }
  if (nowMs < start) return { active: false, message: 'Quiz belum bisa dimulai karena waktu event belum tiba.' }

  return { active: false, message: 'Quiz tidak bisa dimulai karena waktu event sudah selesai.' }
}
