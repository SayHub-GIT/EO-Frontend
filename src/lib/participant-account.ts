import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'

export type ParticipantAccountProfile = {
  userId: string
  fullName: string
  email: string
  role: string
  createdAtUtc: string
}

export type ParticipantPointSummary = {
  balance: number
  lifetimeEarned: number
  tier: string
  nextTier: string | null
  nextTierAt: number | null
  progressPercent: number
}

export type ParticipantAccountStats = {
  totalRegistrations: number
  upcomingEvents: number
  attendedEvents: number
  completedEvents: number
  lifetimeSpend: number
  ticketsAvailable: number
  receiptsAvailable: number
}

export type ParticipantAccountRegistration = {
  registrationId: string
  eventId: string
  eventName: string
  eventSlug: string
  eventLogoUrl: string | null
  eventLocation: string | null
  eventStartAtUtc: string
  eventEndAtUtc: string
  eventPackageName: string | null
  bookingCode: string
  registrationStatus: string
  registeredAtUtc: string
  checkedInAtUtc: string | null
  checkedOutAtUtc: string | null
  paymentStatus: string
  orderId: string | null
  grossAmount: number
  paidAtUtc: string | null
  paymentType: string | null
  transactionId: string | null
  ticketAvailable: boolean
  receiptAvailable: boolean
}

export type ParticipantAccountActivity = {
  id: string
  kind: string
  title: string
  description: string
  pointsDelta: number
  occurredAtUtc: string
  eventId: string | null
  eventName: string | null
}

export type ParticipantAccountOverview = {
  profile: ParticipantAccountProfile
  points: ParticipantPointSummary
  stats: ParticipantAccountStats
  registrations: ParticipantAccountRegistration[]
  recentActivity: ParticipantAccountActivity[]
}

const ensureOk = async (response: Response, fallback: string) => {
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

export async function getParticipantAccount(): Promise<ParticipantAccountOverview> {
  const response = await authFetch('/account', { cache: 'no-store' })
  await ensureOk(response, 'Unable to load your account.')
  return response.json()
}

export async function updateParticipantProfile(fullName: string): Promise<ParticipantAccountProfile> {
  const response = await authFetch('/account/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName })
  })

  await ensureOk(response, 'Unable to update your profile.')
  return response.json()
}

const downloadAccountDocument = async (
  registrationId: string,
  type: 'ticket' | 'receipt',
  fallbackName: string
) => {
  const response = await authFetch(
    `/account/registrations/${encodeURIComponent(registrationId)}/${type}.pdf`,
    { cache: 'no-store' }
  )

  await ensureOk(response, `Unable to download ${type}.`)
  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition')
  const nameMatch = disposition?.match(/filename="?([^"]+)"?/i)
  const filename = nameMatch?.[1] ?? fallbackName
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export const downloadParticipantTicket = (registrationId: string, bookingCode: string) =>
  downloadAccountDocument(registrationId, 'ticket', `${bookingCode}-ticket.pdf`)

export const downloadParticipantReceipt = (registrationId: string, bookingCode: string) =>
  downloadAccountDocument(registrationId, 'receipt', `${bookingCode}-receipt.pdf`)
