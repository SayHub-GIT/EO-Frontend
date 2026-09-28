'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { exportAuditCsv, getAuditLogs, getAuditRetention, type AuditFilters, type AuditLogItem, type AuditPagedResult, type AuditRetention } from '@/lib/audit'
import { listAdminEvents, type AdminEvent } from '@/lib/admin-events'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'

type FilterDraft = {
  eventId: string
  module: string
  outcome: string
  actorType: string
  actorId: string
  keyword: string
  action: string
  entityType: string
  transactionReference: string
  correlationId: string
  dateFrom: string
  dateTo: string
}

const emptyFilters: FilterDraft = {
  eventId: '', module: '', outcome: '', actorType: '', actorId: '', keyword: '', action: '',
  entityType: '', transactionReference: '', correlationId: '', dateFrom: '', dateTo: ''
}

const moduleOptions = ['auth', 'event', 'registration', 'payment', 'attendance', 'doorprize', 'quiz', 'audit', 'users', 'settings', 'media', 'other']

const toIso = (value: string) => {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

const buildFilters = (draft: FilterDraft, page: number): AuditFilters => ({
  eventId: draft.eventId || undefined,
  module: draft.module || undefined,
  outcome: draft.outcome || undefined,
  actorType: draft.actorType || undefined,
  actorId: draft.actorId || undefined,
  keyword: draft.keyword || undefined,
  action: draft.action || undefined,
  entityType: draft.entityType || undefined,
  transactionReference: draft.transactionReference || undefined,
  correlationId: draft.correlationId || undefined,
  dateFrom: toIso(draft.dateFrom),
  dateTo: toIso(draft.dateTo),
  page,
  pageSize: 50,
  direction: 'Desc'
})

const parseMetadata = (item: AuditLogItem) => {
  if (!item.metadataJson) return {} as Record<string, unknown>
  try { return JSON.parse(item.metadataJson) as Record<string, unknown> } catch { return {} }
}

const prettyJson = (value: string | null) => {
  if (!value) return '—'
  try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value }
}

const AuditPage = () => {
  const [draft, setDraft] = useState<FilterDraft>(emptyFilters)
  const [applied, setApplied] = useState<FilterDraft>(emptyFilters)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<AuditPagedResult | null>(null)
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [retention, setRetention] = useState<AuditRetention | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const exportAccess = usePermissionAccess('audit.export')

  const filters = useMemo(() => buildFilters(applied, page), [applied, page])

  useEffect(() => {
    let active = true
    void Promise.allSettled([listAdminEvents(), getAuditRetention()]).then(([eventResult, retentionResult]) => {
      if (!active) return
      if (eventResult.status === 'fulfilled') setEvents(eventResult.value)
      if (retentionResult.status === 'fulfilled') setRetention(retentionResult.value)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getAuditLogs(filters)
        if (active) setResult(data)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load audit log.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [filters])

  const setField = (key: keyof FilterDraft, value: string) =>
    setDraft(current => ({ ...current, [key]: value }))

  const runExport = async () => {
    try {
      setExporting(true)
      setError(null)
      await exportAuditCsv(buildFilters(applied, 1))
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export audit log.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box>
          <Typography variant='h4' fontWeight={850}>Audit & Activity Report</Typography>
          <Typography color='text.secondary' sx={{ mt: .75, maxWidth: 850 }}>
            Immutable timeline of user/admin activity, database changes, payments, Midtrans flows, attendance, doorprize actions, and API access.
          </Typography>
        </Box>
        <Button variant='contained' disabled={exporting || !exportAccess.allowed} onClick={() => void runExport()} startIcon={exporting ? <CircularProgress size={17} color='inherit' /> : <i className='tabler-file-download' />}>
          Export CSV
        </Button>
      </Box>

      {retention && (
        <Alert severity='info'>
          Retention target: <strong>{retention.retentionDays} days</strong>. Automatic deletion is <strong>disabled</strong>; archival evidence is required before approved deletion.
        </Alert>
      )}
      {error && <Alert severity='error'>{error}</Alert>}

      <Card variant='outlined'>
        <CardContent sx={{ display: 'grid', gap: 2.5 }}>
          <Typography variant='h6' fontWeight={800}>Filters</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)', xl: 'repeat(4,1fr)' }, gap: 2 }}>
            <TextField select label='Event' value={draft.eventId} onChange={e => setField('eventId', e.target.value)}>
              <MenuItem value=''>All events</MenuItem>
              {events.map(event => <MenuItem key={event.id} value={event.id}>{event.name}</MenuItem>)}
            </TextField>
            <TextField select label='Module' value={draft.module} onChange={e => setField('module', e.target.value)}>
              <MenuItem value=''>All modules</MenuItem>
              {moduleOptions.map(module => <MenuItem key={module} value={module}>{module}</MenuItem>)}
            </TextField>
            <TextField select label='Outcome' value={draft.outcome} onChange={e => setField('outcome', e.target.value)}>
              <MenuItem value=''>All outcomes</MenuItem>
              <MenuItem value='succeeded'>Succeeded</MenuItem>
              <MenuItem value='failed'>Failed</MenuItem>
            </TextField>
            <TextField select label='Actor type' value={draft.actorType} onChange={e => setField('actorType', e.target.value)}>
              <MenuItem value=''>All actor types</MenuItem>
              {['User', 'Authenticated', 'Anonymous', 'System'].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField>
            <TextField label='Actor / User ID' placeholder='UUID' value={draft.actorId} onChange={e => setField('actorId', e.target.value)} />
            <TextField label='From' type='datetime-local' InputLabelProps={{ shrink: true }} value={draft.dateFrom} onChange={e => setField('dateFrom', e.target.value)} />
            <TextField label='To' type='datetime-local' InputLabelProps={{ shrink: true }} value={draft.dateTo} onChange={e => setField('dateTo', e.target.value)} />
            <TextField label='Action' placeholder='payment.status_changed' value={draft.action} onChange={e => setField('action', e.target.value)} />
            <TextField label='Entity type' placeholder='RegistrationPayment' value={draft.entityType} onChange={e => setField('entityType', e.target.value)} />
            <TextField label='Order / booking / transaction reference' value={draft.transactionReference} onChange={e => setField('transactionReference', e.target.value)} />
            <TextField label='Correlation ID' value={draft.correlationId} onChange={e => setField('correlationId', e.target.value)} />
            <TextField label='Keyword' placeholder='Action, entity, reference, correlation…' value={draft.keyword} onChange={e => setField('keyword', e.target.value)} sx={{ gridColumn: { md: 'span 2' } }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant='contained' onClick={() => { setPage(1); setApplied({ ...draft }) }} startIcon={<i className='tabler-filter' />}>Apply Filters</Button>
            <Button variant='outlined' onClick={() => { setDraft(emptyFilters); setApplied(emptyFilters); setPage(1) }}>Reset</Button>
          </Box>
        </CardContent>
      </Card>

      <Card variant='outlined'>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant='h6' fontWeight={800}>Activity Timeline</Typography>
              <Typography variant='body2' color='text.secondary'>
                {result ? result.totalCount.toLocaleString() + ' matching records' : 'Loading records…'}
              </Typography>
            </Box>
            {loading && <CircularProgress size={24} />}
          </Box>

          <TableContainer sx={{ maxHeight: '68vh' }}>
            <Table stickyHeader size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell><TableCell>Actor</TableCell><TableCell>Action</TableCell>
                  <TableCell>Entity</TableCell><TableCell>Reference</TableCell><TableCell>Correlation</TableCell><TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!loading && result?.items.length === 0 && <TableRow><TableCell colSpan={7} align='center' sx={{ py: 7 }}>No matching records.</TableCell></TableRow>}
                {result?.items.map(item => {
                  const metadata = parseMetadata(item)
                  const actorName = typeof metadata.actorName === 'string' ? metadata.actorName : null
                  const actorRole = typeof metadata.actorRole === 'string' ? metadata.actorRole : null
                  const outcome = typeof metadata.outcome === 'string' ? metadata.outcome : null
                  return (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(item.createdAtUtc).toLocaleString('id-ID')}</TableCell>
                      <TableCell>
                        <Typography variant='body2' fontWeight={650}>{actorName ?? item.actorType}</Typography>
                        <Typography variant='caption' color='text.secondary'>{actorRole ?? item.actorId ?? '—'}</Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>
                        <Typography variant='body2' fontFamily='monospace'>{item.action}</Typography>
                        {outcome && <Chip size='small' sx={{ mt: .5 }} label={outcome} color={outcome === 'failed' ? 'error' : 'success'} variant='tonal' />}
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{item.entityType}</Typography>
                        <Typography variant='caption' color='text.secondary'>{item.entityId}</Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220, overflowWrap: 'anywhere' }}>{item.transactionReference ?? '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 220, overflowWrap: 'anywhere', fontFamily: 'monospace', fontSize: 12 }}>{item.correlationId}</TableCell>
                      <TableCell>
                        <details>
                          <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Inspect</summary>
                          <Box sx={{ mt: 1.5, display: 'grid', gap: 1.5, minWidth: 360 }}>
                            {[
                              ['Before', item.oldDataJson],
                              ['After', item.newDataJson],
                              ['Metadata', item.metadataJson]
                            ].map(([label, value]) => (
                              <Box key={label}>
                                <Typography variant='caption' color='text.secondary'>{label}</Typography>
                                <Box component='pre' sx={{ m: 0, mt: .5, p: 1.25, bgcolor: 'action.hover', borderRadius: 1.5, fontSize: 11, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                                  {prettyJson(value)}
                                </Box>
                              </Box>
                            ))}
                            <Typography variant='caption'>IP: {item.ipAddress ?? '—'}</Typography>
                            <Typography variant='caption' sx={{ overflowWrap: 'anywhere' }}>User-Agent: {item.userAgent ?? '—'}</Typography>
                          </Box>
                        </details>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {result && result.totalPages > 1 && (
            <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'center' }}>
              <Pagination page={page} count={result.totalPages} onChange={(_, value) => setPage(value)} color='primary' />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default AuditPage
