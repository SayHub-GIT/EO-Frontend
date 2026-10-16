import { authFetch } from '@/lib/auth'
import { readPrivateAttendanceJpeg } from '@/lib/private-attendance-photo-contract'

const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getPrivateAttendancePhoto(
  registrationId: string,
  signal?: AbortSignal
): Promise<Blob> {
  if (!guidPattern.test(registrationId)) throw new Error('Identitas peserta tidak valid.')

  const response = await authFetch(
    `/check-ins/${encodeURIComponent(registrationId)}/photo`,
    { method: 'GET', cache: 'no-store', signal }
  )

  if (response.status === 404) throw new Error('Foto Check-In peserta belum tersedia.')
  if (response.status === 403) throw new Error('Akun ini tidak memiliki izin melihat foto Check-In.')
  if (!response.ok) throw new Error('Foto Check-In tidak dapat dimuat. Coba lagi.')

  return readPrivateAttendanceJpeg(response)
}
