import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'

export type LegalPolicy = {
  id: string
  eventId: string | null
  kind: 'Terms' | 'Privacy'
  version: number
  content: string
  contentHash: string
  isEventOverride: boolean
  publishedAtUtc: string
}

export type LegalPolicyBundle = {
  terms: LegalPolicy | null
  privacy: LegalPolicy | null
}

const ensureOk = async (response: Response, fallback: string) => {
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

export async function getGlobalLegalPolicies(): Promise<LegalPolicyBundle> {
  const response = await authFetch('/admin/settings/legal-policies', { cache: 'no-store' })
  await ensureOk(response, 'Unable to load legal policies.')
  return response.json()
}

export async function publishGlobalLegalPolicy(
  kind: 'Terms' | 'Privacy',
  content: string
): Promise<LegalPolicy> {
  const response = await authFetch('/admin/settings/legal-policies/' + encodeURIComponent(kind), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  })
  await ensureOk(response, 'Unable to publish legal policy.')
  return response.json()
}
