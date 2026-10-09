import { authFetch } from '@/lib/auth'
import { parseError } from '@/lib/api'

export type DashboardPeriod = 7 | 30 | 90

export type DashboardTrendDay = {
  date: string
  registrations: number
  internal: number
  external: number
}

export type DashboardTopEvent = {
  eventId: string
  name: string
  status: string
  startsAtUtc: string
  capacity: number
  reservedSeats: number
}

export type DashboardCategoryCount = {
  category: string
  count: number
}

export type DashboardAnalytics = {
  generatedAtUtc: string
  periodDays: number
  totalEvents: number
  publishedEvents: number
  draftEvents: number
  archivedEvents: number
  upcomingEvents: number
  totalCapacity: number
  reservedSeats: number
  remainingSeats: number
  activeParticipants: number
  internalParticipants: number
  externalParticipants: number
  checkedIn: number
  checkedOut: number
  currentlyOnSite: number
  awaitingCheckIn: number
  pendingPayments: number
  cancelledRegistrations: number
  failedRegistrations: number
  expiredRegistrations: number
  registrationsToday: number
  registrationsLastSevenDays: number
  registrationTrend: DashboardTrendDay[]
  topEvents: DashboardTopEvent[]
  eventCategories: DashboardCategoryCount[]
}

const requiredNumbers: (keyof DashboardAnalytics)[] = [
  'totalEvents', 'publishedEvents', 'draftEvents', 'archivedEvents',
  'upcomingEvents', 'totalCapacity', 'reservedSeats', 'remainingSeats',
  'activeParticipants', 'internalParticipants', 'externalParticipants',
  'checkedIn', 'checkedOut', 'currentlyOnSite', 'awaitingCheckIn',
  'pendingPayments', 'cancelledRegistrations', 'failedRegistrations',
  'expiredRegistrations', 'registrationsToday', 'registrationsLastSevenDays'
]

export async function getAdminDashboardAnalytics(
  period: DashboardPeriod
): Promise<DashboardAnalytics> {
  const response = await authFetch(`/admin/dashboard/analytics?days=${period}`, {
    method: 'GET',
    cache: 'no-store'
  })

  if (!response.ok) throw new Error(await parseError(response, 'Unable to load live dashboard analytics.'))

  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object') throw new Error('Invalid dashboard response.')

  const record = payload as Record<string, unknown>
  if (
    typeof record.generatedAtUtc !== 'string' ||
    record.periodDays !== period ||
    !Array.isArray(record.registrationTrend) ||
    !Array.isArray(record.topEvents) ||
    !Array.isArray(record.eventCategories) ||
    requiredNumbers.some(key => typeof record[key] !== 'number' || !Number.isFinite(record[key]))
  ) {
    throw new Error('The dashboard API returned an incomplete analytics response.')
  }

  return payload as DashboardAnalytics
}
