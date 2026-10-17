export type AttendanceNavigationVisibility = {
  checkInAndOut: boolean
  listAttendance: boolean
}

export function getAttendanceNavigationVisibility(
  canCheckIn: boolean,
  canCheckOut: boolean,
  canReadAttendance: boolean,
  eventId: string | null
): AttendanceNavigationVisibility {
  return {
    checkInAndOut: canCheckIn || canCheckOut,
    listAttendance: canReadAttendance && Boolean(eventId)
  }
}
