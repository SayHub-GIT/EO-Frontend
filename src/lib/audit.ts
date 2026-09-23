import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'

export type AuditLogItem = {
  id: string
  eventId: string | null
  actorType: string
  actorId: string | null
  action: string
  entityType: string
  entityId: string
  transactionReference: string | null
  oldDataJson: string | null
  newDataJson: string | null
  metadataJson: string | null
  ipAddress: string | null
  userAgent: string | null
  correlationId: string
  createdAtUtc: string
}

export type AuditPagedResult = {
  items: AuditLogItem[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type AuditRetention = {
  retentionDays: number
  automaticDeletionEnabled: boolean
  archiveRequiredBeforeDeletion: boolean
}

export type AuditFilters = {
  eventId?: string
  actorId?: string
  actorType?: string
  module?: string
  outcome?: string
  action?: string
  entityType?: string
  entityId?: string
  transactionReference?: string
  correlationId?: string
  keyword?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  direction?: 'Asc' | 'Desc'
}

const buildQuery = (filters: AuditFilters) => {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, raw]) => {
    if (raw === undefined || raw === null || raw === '') return
    params.set(key, String(raw))
  })

  return params.toString()
}

const ensureOk = async (response: Response, fallback: string) => {
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

export async function getAuditLogs(filters: AuditFilters): Promise<AuditPagedResult> {
  const query = buildQuery(filters)
  const response = await authFetch(`/admin/audit${query ? `?${query}` : ''}`, { cache: 'no-store' })

  await ensureOk(response, 'Unable to load audit logs.')
  return response.json()
}

export async function getAuditRetention(): Promise<AuditRetention> {
  const response = await authFetch('/admin/audit/retention', { cache: 'no-store' })

  await ensureOk(response, 'Unable to load audit retention policy.')
  return response.json()
}

export async function exportAuditCsv(filters: AuditFilters) {
  const query = buildQuery({ ...filters, page: undefined, pageSize: undefined })
  const response = await authFetch(`/admin/audit/export.csv${query ? `?${query}` : ''}`, { cache: 'no-store' })

  await ensureOk(response, 'Unable to export audit log.')
  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition')
  const nameMatch = disposition?.match(/filename="?([^"]+)"?/i)
  const filename = nameMatch?.[1] ?? `audit-export-${new Date().toISOString().slice(0, 10)}.csv`
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
