import { parseError } from '@/lib/api'
import { storeRegistrationAccessToken } from './registration-public.service'

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5174/api').replace(/\/$/, '')

export type CreateExternalRegistrationPaymentRequest = {
  eventPackageId: string
  termsPolicyId: string
  privacyPolicyId: string
  accessCode?: string | null
  fullName: string
  email: string
  phone: string
  organization?: string | null
  department?: string | null
  customFields?: Record<string, string | null>
}

export type RegistrationPaymentResponse = {
  registrationId: string
  eventId: string
  eventPackageId: string
  eventPackageName: string
  price: number
  bookingCode: string
  paymentRequired: boolean
  snapToken: string | null
  redirectUrl: string | null
  accessToken: string
}

export async function createExternalRegistrationPayment(
  eventId: string,
  payload: CreateExternalRegistrationPaymentRequest
): Promise<RegistrationPaymentResponse> {
  const response = await fetch(`${apiUrl}/events/${encodeURIComponent(eventId)}/registrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(await parseError(response, `Registration failed (${response.status}).`))
  }

  const result = (await response.json()) as RegistrationPaymentResponse

  if (!result.registrationId || !result.bookingCode || !result.accessToken) {
    throw new Error('Backend returned an invalid registration response.')
  }

  if (result.paymentRequired && !result.snapToken) {
    throw new Error('Backend did not return a payment token for this paid package.')
  }

  storeRegistrationAccessToken(result.bookingCode, result.accessToken)

  return result
}
