const attendanceChangeEvent = 'eo:attendance-changed'
const attendanceChannelName = 'eo:attendance-refresh'
const minimumFocusRefreshMs = 15_000
const validEventId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type AttendanceChangeMessage = {
  eventId: string
}

export const isAttendanceChangeForEvent = (message: unknown, eventId: string): boolean => {
  if (!validEventId.test(eventId) || !message || typeof message !== 'object' || Array.isArray(message)) return false
  const id = (message as Record<string, unknown>).eventId
  return typeof id === 'string' && validEventId.test(id) && id.toLowerCase() === eventId.toLowerCase()
}

export const publishAttendanceChange = (eventId: string): void => {
  if (typeof window === 'undefined' || !validEventId.test(eventId)) return

  const message: AttendanceChangeMessage = { eventId }
  if (typeof BroadcastChannel === 'undefined') {
    window.dispatchEvent(new CustomEvent(attendanceChangeEvent, { detail: message }))
    return
  }

  const channel = new BroadcastChannel(attendanceChannelName)
  try {
    channel.postMessage(message)
  } finally {
    channel.close()
  }
}

export const subscribeAttendanceRefresh = (eventId: string, onRefresh: () => void): (() => void) => {
  if (typeof window === 'undefined' || !validEventId.test(eventId)) return () => undefined

  let lastFocusRefreshAt = Date.now()
  const onChange = (message: unknown) => {
    if (!isAttendanceChangeForEvent(message, eventId)) return
    lastFocusRefreshAt = Date.now()
    onRefresh()
  }
  const onLocalChange = (event: Event) => {
    if (event instanceof CustomEvent) onChange(event.detail)
  }
  const onFocus = () => {
    if (document.visibilityState === 'hidden' || Date.now() - lastFocusRefreshAt < minimumFocusRefreshMs) return
    lastFocusRefreshAt = Date.now()
    onRefresh()
  }

  window.addEventListener(attendanceChangeEvent, onLocalChange)
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onFocus)

  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(attendanceChannelName)
  if (channel) channel.onmessage = event => onChange(event.data)

  return () => {
    window.removeEventListener(attendanceChangeEvent, onLocalChange)
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onFocus)
    if (channel) {
      channel.onmessage = null
      channel.close()
    }
  }
}
