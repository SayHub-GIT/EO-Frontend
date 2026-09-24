import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'

export async function exportRegistrationsCsv(
  eventId: string,
  dateFrom?: string,
  dateTo?: string
) {
  const params = new URLSearchParams()

  if (dateFrom) params.set('dateFrom', new Date(dateFrom + 'T00:00:00Z').toISOString())
  if (dateTo) params.set('dateTo', new Date(dateTo + 'T23:59:59.999Z').toISOString())

  const query = params.toString() ? '?' + params.toString() : ''
  const response = await authFetch(
    '/admin/events/' + encodeURIComponent(eventId) + '/registrations/export.csv' + query,
    { cache: 'no-store' }
  )

  if (!response.ok) {
    throw new Error(await parseError(response, 'Unable to export registrations.'))
  }

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition')
  const match = disposition?.match(/filename="?([^"]+)"?/i)
  const filename = match?.[1] ?? 'registrations-export.csv'
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
