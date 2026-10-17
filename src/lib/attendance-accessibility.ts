export type AttendancePaginationAction = 'first' | 'last' | 'next' | 'previous'

const attendancePageLabels: Record<AttendancePaginationAction, string> = {
  first: 'Ke halaman pertama',
  last: 'Ke halaman terakhir',
  next: 'Ke halaman berikutnya',
  previous: 'Ke halaman sebelumnya'
}

export const attendancePaginationActionLabel = (action: AttendancePaginationAction): string =>
  attendancePageLabels[action]

export const attendancePhotoActionLabel = (participantName: string): string =>
  `Lihat foto Check-In ${participantName.trim() || 'peserta'}`
