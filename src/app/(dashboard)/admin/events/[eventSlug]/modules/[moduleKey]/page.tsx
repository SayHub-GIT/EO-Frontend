'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import NextLink from 'next/link'
import { useParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import ConfirmActionDialog from '@/components/feedback/ConfirmActionDialog'
import { dateTimeValue, hasFieldErrors, httpUrl, integerValue, requiredText, type FieldErrors } from '@/lib/form-validation'

import { getAdminEvent, type AdminEvent } from '@/lib/admin-events'
import {
  EVENT_MODULE_DEFINITIONS,
  getAdminEventExperience,
  updateAdminEventExperience,
  type EventExperienceConfig,
  type EventModuleKey,
  type EventWorkspaceItem
} from '@/lib/event-experience'
import { getEventPackages } from '../../registrations/services/event-package.service'
import type { EventPackage } from '../../registrations/services/types/event-package'
import CertificateGenerator from './CertificateGenerator'
import DoorprizeDraw from './DoorprizeDraw'

type WorkspaceField = {
  key: string
  label: string
  type?: 'text' | 'number' | 'datetime-local' | 'url' | 'package'
  multiline?: boolean
  placeholder?: string
  required?: boolean
}

type WorkspaceSchema = {
  titleLabel: string
  addLabel: string
  fields: WorkspaceField[]
}

const workspaceSchemas: Partial<Record<EventModuleKey, WorkspaceSchema>> = {
  'race-categories': {
    titleLabel: 'Race category name',
    addLabel: 'Add Race Category',
    fields: [
      { key: 'packageId', label: 'Registration package', type: 'package', required: true },
      { key: 'distance', label: 'Distance', placeholder: 'e.g. 5K, 10K, Half Marathon' },
      { key: 'startTime', label: 'Race start time', type: 'datetime-local' },
      { key: 'cutoffTime', label: 'Cut-off time', type: 'datetime-local' },
      { key: 'notes', label: 'Race notes', multiline: true }
    ]
  },
  'race-pack': {
    titleLabel: 'Race pack name',
    addLabel: 'Add Race Pack',
    fields: [
      { key: 'packageId', label: 'Registration package', type: 'package', required: true },
      { key: 'contents', label: 'Items handed to participant', multiline: true, placeholder: 'Jersey / T-shirt, bib, timing chip, tote bag, sponsor items…' },
      { key: 'pickupLocation', label: 'Pickup / handover location' },
      { key: 'pickupStart', label: 'Pickup starts', type: 'datetime-local' },
      { key: 'pickupEnd', label: 'Pickup ends', type: 'datetime-local' },
      { key: 'notes', label: 'Collection notes', multiline: true }
    ]
  },
  doorprize: {
    titleLabel: 'Prize name',
    addLabel: 'Add Doorprize',
    fields: [
      { key: 'quantity', label: 'Number of winners', type: 'number' },
      { key: 'sponsor', label: 'Sponsor' },
      { key: 'drawAt', label: 'Planned draw time', type: 'datetime-local' },
      { key: 'claimNotes', label: 'Claim notes', multiline: true }
    ]
  },
  booths: {
    titleLabel: 'Booth name',
    addLabel: 'Add Booth',
    fields: [
      { key: 'zone', label: 'Zone / location' },
      { key: 'sponsor', label: 'Brand / sponsor' },
      { key: 'description', label: 'Activity / description', multiline: true }
    ]
  },
  speakers: {
    titleLabel: 'Speaker name',
    addLabel: 'Add Speaker',
    fields: [
      { key: 'role', label: 'Role / title' },
      { key: 'organization', label: 'Organization' },
      { key: 'photoUrl', label: 'Photo URL', type: 'url' },
      { key: 'bio', label: 'Speaker bio', multiline: true }
    ]
  },
  sessions: {
    titleLabel: 'Session title',
    addLabel: 'Add Session',
    fields: [
      { key: 'speaker', label: 'Speaker' },
      { key: 'room', label: 'Room / stage' },
      { key: 'startAt', label: 'Starts', type: 'datetime-local' },
      { key: 'endAt', label: 'Ends', type: 'datetime-local' },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'description', label: 'Session description', multiline: true }
    ]
  },
  agenda: {
    titleLabel: 'Agenda item',
    addLabel: 'Add Agenda Item',
    fields: [
      { key: 'startAt', label: 'Starts', type: 'datetime-local' },
      { key: 'endAt', label: 'Ends', type: 'datetime-local' },
      { key: 'location', label: 'Location / stage' },
      { key: 'description', label: 'Description', multiline: true }
    ]
  },
  certificates: {
    titleLabel: 'Certificate title',
    addLabel: 'Add Certificate Template',
    fields: [
      { key: 'issuer', label: 'Issuer / organizer', placeholder: 'PT Pertamina (Persero)' },
      { key: 'bodyText', label: 'Certificate sentence', multiline: true, placeholder: 'has successfully participated in' },
      { key: 'signer', label: 'Signer / approver' },
      { key: 'signerTitle', label: 'Signer title' },
      { key: 'eligibility', label: 'Eligibility rule', multiline: true, placeholder: 'Checked-in participants (default) or write: All registered participants' },
      { key: 'notes', label: 'Distribution notes', multiline: true }
    ]
  }
}

const emptyDraft = () => ({ title: '' } as Record<string, string>)

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `workspace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const normalizeWorkspaceItems = (value: unknown): EventWorkspaceItem[] => {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
    const record = entry as Record<string, unknown>
    const id = typeof record.id === 'string' && record.id.trim() ? record.id : `legacy-${index}`
    const title = typeof record.title === 'string' ? record.title : ''

    return [{ ...record, id, title, active: record.active !== false } as EventWorkspaceItem]
  })
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

const ModuleWorkspacePage = () => {
  const params = useParams<{ eventSlug: string; moduleKey: string }>()
  const eventId = params.eventSlug
  const moduleKey = decodeURIComponent(params.moduleKey) as EventModuleKey

  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [experience, setExperience] = useState<EventExperienceConfig | null>(null)
  const [packages, setPackages] = useState<EventPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [packageError, setPackageError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EventWorkspaceItem | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<string>>({})
  const saveDraftLockRef = useRef(false)

  const module = useMemo(
    () => EVENT_MODULE_DEFINITIONS.find(item => item.key === moduleKey) ?? null,
    [moduleKey]
  )
  const schema = workspaceSchemas[moduleKey]
  const items = useMemo(
    () => normalizeWorkspaceItems(experience?.moduleData?.[moduleKey]),
    [experience, moduleKey]
  )

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        setPackageError(null)
        const [loadedEvent, loadedExperience] = await Promise.all([
          getAdminEvent(eventId),
          getAdminEventExperience(eventId)
        ])
        if (!mounted) return
        setEvent(loadedEvent)
        setExperience(loadedExperience)

        if (loadedEvent.kind === 'Running') {
          try {
            const loadedPackages = await getEventPackages(eventId)
            if (mounted) setPackages(loadedPackages)
          } catch (loadPackageError) {
            if (mounted) setPackageError(loadPackageError instanceof Error ? loadPackageError.message : 'Unable to load event packages.')
          }
        }
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load module workspace.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => { mounted = false }
  }, [eventId])

  const persistItems = async (nextItems: EventWorkspaceItem[]) => {
    if (!experience) return
    setSaving(true)
    setError(null)

    try {
      const updated = await updateAdminEventExperience(eventId, {
        enabledModules: experience.enabledModules,
        registrationFields: experience.registrationFields,
        moduleData: { ...experience.moduleData, [moduleKey]: nextItems }
      })
      setExperience(updated)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save workspace data.')
      throw saveError
    } finally {
      setSaving(false)
    }
  }

  const updateWorkspaceItem = async (id: string, patch: Record<string, unknown>) => {
    await persistItems(items.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  const resetDraft = () => {
    setDraft(emptyDraft())
    setEditingId(null)
    setFieldErrors({})
  }

  const saveDraft = async () => {
    if (saving || saveDraftLockRef.current) return

    setError(null)

    const title = draft.title?.trim() ?? ''
    const nextErrors: FieldErrors<string> = {
      title: requiredText(title, schema?.titleLabel ?? 'Title')
    }

    for (const field of schema?.fields ?? []) {
      const fieldValue = draft[field.key]?.trim() ?? ''

      if (field.required) {
        nextErrors[field.key] = requiredText(fieldValue, field.label)
      }

      if (fieldValue && field.type === 'number') {
        nextErrors[field.key] = integerValue(fieldValue, { label: field.label, min: 1 })
      }

      if (fieldValue && field.type === 'datetime-local') {
        nextErrors[field.key] = dateTimeValue(fieldValue, field.label)
      }

      if (fieldValue && field.type === 'url') {
        nextErrors[field.key] = httpUrl(fieldValue, field.label, false)
      }
    }

    const compareDates = (startKey: string, endKey: string, endLabel: string) => {
      const start = draft[startKey]?.trim()
      const end = draft[endKey]?.trim()
      if (!start || !end || nextErrors[startKey] || nextErrors[endKey]) return

      const startDate = new Date(start)
      const endDate = new Date(end)
      if (endDate <= startDate) nextErrors[endKey] = `${endLabel} must be after the start time.`
    }

    compareDates('startAt', 'endAt', 'End time')
    compareDates('pickupStart', 'pickupEnd', 'Pickup end')
    compareDates('startTime', 'cutoffTime', 'Cut-off time')

    setFieldErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) return

    saveDraftLockRef.current = true

    const existing = editingId ? items.find(item => item.id === editingId) : undefined
    const nextItem: EventWorkspaceItem = {
      ...(existing ?? {}),
      id: editingId ?? createId(),
      title,
      active: existing?.active !== false
    }

    for (const field of schema?.fields ?? []) {
      const value = draft[field.key]?.trim() ?? ''
      if (value) nextItem[field.key] = value
      else delete nextItem[field.key]
    }

    const nextItems = editingId
      ? items.map(item => item.id === editingId ? nextItem : item)
      : [...items, nextItem]

    try {
      await persistItems(nextItems)
      resetDraft()
    } finally {
      saveDraftLockRef.current = false
    }
  }

  const startEdit = (item: EventWorkspaceItem) => {
    const nextDraft: Record<string, string> = { title: typeof item.title === 'string' ? item.title : '' }
    for (const field of schema?.fields ?? []) {
      const value = item?.[field.key]
      nextDraft[field.key] = value === null || value === undefined ? '' : String(value)
    }
    setDraft(nextDraft)
    setEditingId(item.id)
    setFieldErrors({})
    setError(null)
  }

  const removeItem = async (id: string) => {
    await persistItems(items.filter(item => item.id !== id))
    if (editingId === id) resetDraft()
  }

  const packageFor = (packageId: unknown) => packages.find(item => item.id === String(packageId ?? ''))

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress size={32} /></Box>
  }

  if (!event || !experience) {
    return <Alert severity='error'>{error ?? 'Event module is unavailable.'}</Alert>
  }

  if (!module) {
    return (
      <Alert severity='error' action={<Button component={NextLink} href={`/admin/events/${encodeURIComponent(event.id)}/dashboard`}>Back to dashboard</Button>}>
        Unknown event module.
      </Alert>
    )
  }

  if (!experience.enabledModules.includes(module.key) && moduleKey !== 'quiz') {
    return (
      <Alert severity='warning' action={<Button component={NextLink} href={`/admin/events/${encodeURIComponent(event.id)}/edit`}>Configure event</Button>}>
        {module.label} is not enabled for this event.
      </Alert>
    )
  }

  const archived = event.status === 'Archived'
  const encodedEventId = encodeURIComponent(event.id)
  const activePackages = packages.filter(item => item.isActive)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

      {error && <Alert severity='error'>{error}</Alert>}
      {packageError && <Alert severity='warning'>{packageError}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 3, alignItems: { md: 'center' } }}>
        <Box>
          <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: 'action.hover', color: 'primary.main', display: 'grid', placeItems: 'center' }}>
              <i className={`${module.icon} text-2xl`} />
            </Box>
            <Typography variant='h4' fontWeight={750}>{module.label}</Typography>
            <Chip label={experience.kind} color='primary' variant='tonal' size='small' />
            <Chip label={moduleKey === 'quiz' ? 'Reserved' : archived ? 'Read only' : 'Live workspace'} color={moduleKey === 'quiz' ? 'warning' : archived ? 'default' : 'success'} variant='tonal' size='small' />
          </Box>
          <Typography color='text.secondary' sx={{ mt: 1.5, maxWidth: 800, lineHeight: 1.7 }}>
            {moduleKey === 'quiz' ? 'Reserved for the separate Quiz implementation. This page never calls the unfinished Quiz API.' : module.description}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button component={NextLink} href={`/admin/events/${encodedEventId}/dashboard`} variant='contained' startIcon={<i className='tabler-layout-dashboard' />}>
            Event Dashboard
          </Button>
          <Button component={NextLink} href={`/admin/events/${encodedEventId}/edit`} variant='outlined' startIcon={<i className='tabler-adjustments' />}>
            Configure
          </Button>
        </Box>
      </Box>

      {moduleKey === 'quiz' && (
        <Alert severity='info' icon={<i className='tabler-help-hexagon' />}>
          Quiz is intentionally disabled in the general event flow until its own database migration and implementation are ready. No Quiz data is changed here.
        </Alert>
      )}

      {(moduleKey === 'race-categories' || moduleKey === 'race-pack') && (
        <Card variant='outlined'>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box>
                <Typography variant='h6' fontWeight={750}>Running data model</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: .75, maxWidth: 820, lineHeight: 1.65 }}>
                  <strong>Package</strong> is what the participant selects during registration and is the source of price and quota. <strong>Race Category</strong> describes the actual race (5K, 10K, Half Marathon) and links to one Package. <strong>Race Pack</strong> also links to that Package, so check-in staff know exactly what to hand over.
                </Typography>
              </Box>
              <Button component={NextLink} href={`/admin/events/${encodedEventId}#event-packages`} variant='outlined' startIcon={<i className='tabler-package' />}>
                Manage Packages
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {moduleKey === 'race-categories' && packages.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 2 }}>
          {packages.map(pkg => {
            const linked = items.find(item => String(item.packageId ?? '') === pkg.id)
            return (
              <Card key={pkg.id} variant='outlined'>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'start' }}>
                    <Box>
                      <Typography fontWeight={750}>{pkg.name}</Typography>
                      <Typography variant='body2' color='text.secondary'>{formatMoney(pkg.price)}</Typography>
                    </Box>
                    <Chip size='small' label={pkg.isActive ? 'Active' : 'Inactive'} color={pkg.isActive ? 'success' : 'default'} variant='tonal' />
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant='body2'>Quota: {pkg.isUnlimited ? 'Unlimited' : `${pkg.registeredCount}/${pkg.capacity ?? 0}`}</Typography>
                  <Typography variant='body2' color={linked ? 'success.main' : 'warning.main'} sx={{ mt: .75 }}>
                    {linked ? `Linked to ${linked.title}` : 'No race category linked yet'}
                  </Typography>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      )}

      {moduleKey === 'reports' && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
            <Card variant='outlined'><CardContent><Typography color='text.secondary' variant='body2'>Registered</Typography><Typography variant='h4' fontWeight={750} sx={{ mt: 1 }}>{event.registeredCount.toLocaleString()}</Typography></CardContent></Card>
            <Card variant='outlined'><CardContent><Typography color='text.secondary' variant='body2'>Capacity</Typography><Typography variant='h4' fontWeight={750} sx={{ mt: 1 }}>{event.capacity.toLocaleString()}</Typography></CardContent></Card>
            <Card variant='outlined'><CardContent><Typography color='text.secondary' variant='body2'>Remaining quota</Typography><Typography variant='h4' fontWeight={750} sx={{ mt: 1 }}>{event.remainingQuota.toLocaleString()}</Typography></CardContent></Card>
          </Box>
          <Card variant='outlined'>
            <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
              <Box><Typography variant='h6' fontWeight={700}>Operational reports</Typography><Typography color='text.secondary' variant='body2' sx={{ mt: .5 }}>Use live registrations, packages and check-ins as the source of truth.</Typography></Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                <Button component={NextLink} href={`/admin/events/${encodedEventId}/registrations`} variant='contained'>Participants</Button>
                <Button component={NextLink} href={`/admin/events/${encodedEventId}#event-packages`} variant='outlined'>Packages</Button>
                <Button component={NextLink} href={`/admin/check-ins?eventId=${encodedEventId}`} variant='outlined'>Check-ins</Button>
              </Box>
            </CardContent>
          </Card>
        </>
      )}

      {schema && moduleKey !== 'quiz' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(320px, .75fr) minmax(0, 1.25fr)' }, gap: 3, alignItems: 'start' }}>
          <Card variant='outlined'>
            <CardContent sx={{ p: { xs: 3, md: 4 }, display: 'grid', gap: 2.5 }}>
              <Box>
                <Typography variant='h6' fontWeight={700}>{editingId ? `Edit ${module.label}` : schema.addLabel}</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: .75 }}>
                  {moduleKey === 'race-categories' ? 'Price and quota stay in Packages; this form only defines the race and its linked package.' : 'Saved directly to this event workspace.'}
                </Typography>
              </Box>

              <TextField
                label={schema.titleLabel}
                value={draft.title ?? ''}
                onChange={input => {
                  setDraft(current => ({ ...current, title: input.target.value }))
                  setFieldErrors(current => ({ ...current, title: undefined }))
                }}
                error={Boolean(fieldErrors.title)}
                helperText={fieldErrors.title}
                disabled={archived || saving}
                required
              />

              {schema.fields.map(field => {
                if (field.type === 'package') {
                  const currentValue = draft[field.key] ?? ''
                  const currentMissing = Boolean(currentValue) && !packages.some(pkg => pkg.id === currentValue)
                  return (
                    <TextField
                      key={field.key}
                      select
                      label={field.label}
                      value={currentValue}
                      onChange={input => {
                        setDraft(current => ({ ...current, [field.key]: input.target.value }))
                        setFieldErrors(current => ({ ...current, [field.key]: undefined }))
                      }}
                      error={Boolean(fieldErrors[field.key])}
                      disabled={archived || saving}
                      required={field.required}
                      helperText={fieldErrors[field.key] ?? (activePackages.length === 0 ? 'Create and activate a Package first.' : 'This links race operations to the participant registration/payment selection.')}
                      fullWidth
                    >
                      <MenuItem value=''><em>Select package</em></MenuItem>
                      {currentMissing && <MenuItem value={currentValue}>Unavailable / legacy package ({currentValue})</MenuItem>}
                      {activePackages.map(pkg => (
                        <MenuItem key={pkg.id} value={pkg.id}>{pkg.name} — {formatMoney(pkg.price)}</MenuItem>
                      ))}
                    </TextField>
                  )
                }

                return (
                  <TextField
                    key={field.key}
                    label={field.label}
                    type={field.type ?? 'text'}
                    value={draft[field.key] ?? ''}
                    onChange={input => {
                      setDraft(current => ({ ...current, [field.key]: input.target.value }))
                      setFieldErrors(current => ({ ...current, [field.key]: undefined }))
                    }}
                    error={Boolean(fieldErrors[field.key])}
                    helperText={fieldErrors[field.key]}
                    multiline={field.multiline}
                    minRows={field.multiline ? 3 : undefined}
                    placeholder={field.placeholder}
                    InputLabelProps={field.type === 'datetime-local' ? { shrink: true } : undefined}
                    inputProps={field.type === 'number' ? { min: 1, step: 1, inputMode: 'numeric' } : undefined}
                    disabled={archived || saving}
                    required={field.required}
                    fullWidth
                  />
                )
              })}

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button variant='contained' disabled={archived || saving} onClick={() => void saveDraft()} startIcon={saving ? <CircularProgress size={17} color='inherit' /> : <i className='tabler-device-floppy' />}>
                  {editingId ? 'Save changes' : schema.addLabel}
                </Button>
                {editingId && <Button variant='text' disabled={saving} onClick={resetDraft}>Cancel edit</Button>}
              </Box>
            </CardContent>
          </Card>

          <Card variant='outlined'>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                <Box>
                  <Typography variant='h6' fontWeight={700}>Configured {module.label}</Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: .5 }}>{items.length} item{items.length === 1 ? '' : 's'} saved.</Typography>
                </Box>
                <Chip label={`${items.length}`} variant='outlined' />
              </Box>

              <Divider sx={{ my: 3 }} />

              {items.length === 0 ? (
                <Box sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}>
                  <i className={`${module.icon} text-4xl`} />
                  <Typography sx={{ mt: 1.5 }}>Nothing configured yet.</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gap: 2 }}>
                  {items.map(item => {
                    const linkedPackage = packageFor(item.packageId)
                    return (
                      <Box key={item.id} sx={{ p: 2.5, borderRadius: 2, border: theme => `1px solid ${theme.palette.divider}` }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography fontWeight={750}>{item.title || 'Untitled item'}</Typography>
                            {linkedPackage && (
                              <Typography variant='body2' color='primary.main' sx={{ mt: .5 }}>
                                Package: {linkedPackage.name} • {formatMoney(linkedPackage.price)} • {linkedPackage.isUnlimited ? 'Unlimited quota' : `${linkedPackage.registeredCount}/${linkedPackage.capacity ?? 0}`}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', gap: .5 }}>
                            <IconButton size='small' disabled={archived || saving} onClick={() => startEdit(item)} aria-label={`Edit ${item.title}`}><i className='tabler-edit' /></IconButton>
                            <IconButton size='small' color='error' disabled={archived || saving} onClick={() => setDeleteTarget(item)} aria-label={`Delete ${item.title}`}><i className='tabler-trash' /></IconButton>
                          </Box>
                        </Box>

                        {schema.fields.filter(field => field.type !== 'package').map(field => {
                          const value = item?.[field.key]
                          if (value === null || value === undefined || String(value).trim() === '') return null
                          return (
                            <Box key={field.key} sx={{ mt: 1.25 }}>
                              <Typography variant='caption' color='text.secondary'>{field.label}</Typography>
                              <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{String(value)}</Typography>
                            </Box>
                          )
                        })}

                        {moduleKey === 'doorprize' && Array.isArray(item.winners) && item.winners.length > 0 && (
                          <Chip size='small' color='success' variant='tonal' label={`${item.winners.length} winner${item.winners.length === 1 ? '' : 's'} drawn`} sx={{ mt: 1.5 }} />
                        )}
                      </Box>
                    )
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {moduleKey === 'doorprize' && (
        <DoorprizeDraw eventId={event.id} prizes={items} disabled={archived || saving} onUpdatePrize={updateWorkspaceItem} />
      )}

      {moduleKey === 'certificates' && (
        <CertificateGenerator eventId={event.id} eventName={event.name} templates={items} disabled={archived || saving} />
      )}

      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${module.label} item?`}
        description='This configured item will be removed from the event module.'
        confirmLabel='Confirm Delete'
        loading={saving}
        onClose={() => {
          if (!saving) setDeleteTarget(null)
        }}
        onConfirm={async () => {
          if (!deleteTarget || saving) return
          await removeItem(deleteTarget.id)
          setDeleteTarget(null)
        }}
        details={deleteTarget ? [
          { label: 'Module', value: module.label },
          { label: 'Item', value: deleteTarget.title || 'Untitled item' }
        ] : []}
        warning='This removes the configured item from the event workspace. Review any participant-facing dependency before continuing.'
      />

      {!schema && moduleKey !== 'quiz' && moduleKey !== 'reports' && (
        <Card variant='outlined'>
          <CardContent sx={{ p: 4 }}>
            <Typography variant='h6' fontWeight={700}>Use the dedicated operational screen</Typography>
            <Typography color='text.secondary' sx={{ mt: 1 }}>
              This core module already has a dedicated workflow, so the event workspace links to that source of truth instead of duplicating data.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 3 }}>
              {moduleKey === 'registration' && <Button component={NextLink} href={`/events/${encodeURIComponent(event.slug)}/register`} target='_blank' variant='contained'>Open registration</Button>}
              {moduleKey === 'participants' && <Button component={NextLink} href={`/admin/events/${encodedEventId}/registrations`} variant='contained'>Open participants</Button>}
              {moduleKey === 'packages' && <Button component={NextLink} href={`/admin/events/${encodedEventId}#event-packages`} variant='contained'>Open packages</Button>}
              {moduleKey === 'checkins' && <Button component={NextLink} href={`/admin/check-ins?eventId=${encodedEventId}`} variant='contained'>Open check-ins</Button>}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

export default ModuleWorkspacePage
