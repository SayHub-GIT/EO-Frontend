import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'

export type SmtpSettings = {
  enabled: boolean
  host: string
  port: number
  enableSsl: boolean
  username: string
  fromName: string
  passwordConfigured: boolean
  updatedAtUtc: string | null
}

export type UpdateSmtpSettings = {
  enabled: boolean
  host: string
  port: number
  enableSsl: boolean
  username: string
  password?: string
  fromName: string
}

const ensureOk = async (response: Response, fallback: string) => {
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

export async function getSmtpSettings(): Promise<SmtpSettings> {
  const response = await authFetch('/admin/settings/smtp', { cache: 'no-store' })
  await ensureOk(response, 'Unable to load SMTP settings.')
  return response.json()
}

export async function updateSmtpSettings(request: UpdateSmtpSettings): Promise<SmtpSettings> {
  const response = await authFetch('/admin/settings/smtp', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  await ensureOk(response, 'Unable to update SMTP settings.')
  return response.json()
}

export async function testSmtpSettings(recipientEmail: string): Promise<{ success: boolean; message: string }> {
  const response = await authFetch('/admin/settings/smtp/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientEmail })
  })
  await ensureOk(response, 'SMTP test failed.')
  return response.json()
}
