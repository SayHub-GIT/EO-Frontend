'use client'

import { useEffect, useState, type FormEvent } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { DynamicBenefitsEditor, DynamicContentSectionsEditor } from './DynamicPublicContentEditors'
import EventExperienceConfigurator from './EventExperienceConfigurator'
import {
  EVENT_ACCESS_MODES,
  type AdminEvent,
  type EventAccessMode,
  type EventKind,
  type EventUpsertRequest
} from '@/lib/admin-events'
import {
  createDefaultExperienceConfig,
  type EventExperienceConfig,
  type ModularEventKind
} from '@/lib/event-experience'

export type EventFormAssets = { logo?: File; hero?: File; registration?: File }
export type EventFormSubmission = { request: EventUpsertRequest; assets: EventFormAssets; experienceConfig: EventExperienceConfig }

type Props = {
  event?: AdminEvent | null
  experienceConfig?: EventExperienceConfig | null
  submitLabel: string
  submitting?: boolean
  error?: string | null
  onSubmit: (submission: EventFormSubmission) => Promise<void> | void
  onCancel: () => void
}

type FormState = {
  name: string
  slug: string
  description: string
  location: string
  kind: EventKind
  startAt: string
  endAt: string
  registrationOpenAt: string
  registrationCloseAt: string
  capacity: string
  accessMode: EventAccessMode
  accessValue: string
  venueAddress: string
  mapsUrl: string
  about: string
  benefits: string
  additionalInformation: string
  registrationImageTitle: string
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const SUPPORTED_EVENT_KINDS: ModularEventKind[] = ['Seminar', 'Workshop', 'Running', 'Other']

const toModularKind = (kind?: EventKind | null): ModularEventKind =>
  kind === 'Seminar' || kind === 'Workshop' || kind === 'Running' || kind === 'Other' ? kind : 'Other'

const slugify = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-+/g, '-')
  .slice(0, 240)

const toLocalDateTime = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return shifted.toISOString().slice(0, 16)
}

const createState = (event?: AdminEvent | null): FormState => ({
  name: event?.name ?? '',
  slug: event?.slug ?? '',
  description: event?.description ?? '',
  location: event?.location ?? '',
  kind: toModularKind(event?.kind),
  startAt: toLocalDateTime(event?.startAtUtc),
  endAt: toLocalDateTime(event?.endAtUtc),
  registrationOpenAt: toLocalDateTime(event?.registrationOpenAtUtc),
  registrationCloseAt: toLocalDateTime(event?.registrationCloseAtUtc),
  capacity: event?.capacity ? String(event.capacity) : '',
  accessMode: event?.accessMode ?? 'Public',
  accessValue: event?.accessValue ?? '',
  venueAddress: event?.venueAddress ?? '',
  mapsUrl: event?.mapsUrl ?? '',
  about: event?.about ?? '',
  benefits: event?.benefits ?? '',
  additionalInformation: event?.additionalInformation ?? '',
  registrationImageTitle: event?.registrationImageTitle ?? ''
})

const validateImage = (file: File | undefined, label: string) => {
  if (!file) return null
  if (!file.type.startsWith('image/')) return `${label} must be an image file.`
  if (file.size > MAX_IMAGE_BYTES) return `${label} must not exceed 10 MB.`
  return null
}

const SectionHeading = ({ title, description }: { title: string; description: string }) => (
  <Box>
    <Typography variant='h6' fontWeight={700}>{title}</Typography>
    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, lineHeight: 1.65 }}>{description}</Typography>
  </Box>
)

const AssetField = ({ label, helper, currentUrl, file, required, onChange }: {
  label: string; helper: string; currentUrl?: string | null; file?: File; required: boolean; onChange: (file?: File) => void
}) => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box><Typography variant='subtitle1' fontWeight={600}>{label}</Typography><Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>{helper}</Typography></Box>
        <Chip label={currentUrl || file ? 'Ready' : required ? 'Required' : 'Optional'} color={currentUrl || file ? 'success' : required ? 'warning' : 'default'} variant='tonal' size='small' />
      </Box>
      {currentUrl && !file && <Box component='img' src={currentUrl} alt={`${label} preview`} sx={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 1, bgcolor: 'action.hover' }} />}
      {file && <Alert severity='success' icon={<i className='tabler-photo-check' />}>{file.name}</Alert>}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 'auto' }}>
        <Button component='label' variant='outlined' startIcon={<i className='tabler-upload' />}>
          {currentUrl || file ? 'Replace Image' : 'Choose Image'}
          <input hidden type='file' accept='image/*' onChange={e => onChange(e.target.files?.[0])} />
        </Button>
        {file && <Button variant='text' color='secondary' onClick={() => onChange(undefined)}>Clear selection</Button>}
      </Box>
    </CardContent>
  </Card>
)

const EventForm = ({ event, experienceConfig, submitLabel, submitting = false, error, onSubmit, onCancel }: Props) => {
  const [form, setForm] = useState<FormState>(() => createState(event))
  const [slugTouched, setSlugTouched] = useState(Boolean(event?.slug))
  const [assets, setAssets] = useState<EventFormAssets>({})
  const [experience, setExperience] = useState<EventExperienceConfig>(() => experienceConfig ?? createDefaultExperienceConfig(toModularKind(event?.kind)))
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    setForm(createState(event))
    setSlugTouched(Boolean(event?.slug))
    setAssets({})
    setExperience(experienceConfig ?? createDefaultExperienceConfig(toModularKind(event?.kind)))
  }, [event, experienceConfig])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(previous => ({ ...previous, [key]: value }))

  const updateName = (name: string) => {
    setForm(previous => ({ ...previous, name, slug: slugTouched ? previous.slug : slugify(name) }))
  }

  const updateSlug = (value: string) => {
    setSlugTouched(true)
    update('slug', slugify(value))
  }

  const changeKind = (kind: ModularEventKind) => {
    update('kind', kind)
    setExperience(createDefaultExperienceConfig(kind))
  }

  const validateExperience = () => {
    const keys = new Set<string>()
    for (const field of experience.registrationFields) {
      const key = field.key.trim()
      if (!/^[a-z][a-zA-Z0-9_-]{0,63}$/.test(key)) return `Invalid registration field key: ${field.key}.`
      if (keys.has(key.toLowerCase())) return `Registration field key ${key} is duplicated.`
      keys.add(key.toLowerCase())
      if (!field.label.trim()) return `Registration field ${key} needs a label.`
      if (field.type === 'select' && field.options.length === 0) return `${field.label} needs at least one select option.`
    }
    return null
  }

  const handleSubmit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()
    setValidationError(null)

    const name = form.name.trim()
    const slug = slugify(form.slug || name)
    const capacity = Number(form.capacity)
    const startAt = new Date(form.startAt)
    const endAt = new Date(form.endAt)
    const registrationOpenAt = new Date(form.registrationOpenAt)
    const registrationCloseAt = new Date(form.registrationCloseAt)

    if (!name) return setValidationError('Event name is required.')
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return setValidationError('SEO slug may only contain lowercase letters, numbers, and hyphens.')
    if (!Number.isInteger(capacity) || capacity <= 0) return setValidationError('Capacity must be greater than zero.')
    if ([startAt, endAt, registrationOpenAt, registrationCloseAt].some(date => Number.isNaN(date.getTime()))) return setValidationError('Please complete all event and registration dates.')
    if (endAt <= startAt) return setValidationError('Event end time must be after the start time.')
    if (registrationCloseAt <= registrationOpenAt) return setValidationError('Registration close time must be after the open time.')
    if (registrationCloseAt > startAt) return setValidationError('Registration must close no later than the event start time.')
    if (form.accessMode !== 'Public' && !form.accessValue.trim()) return setValidationError(form.accessMode === 'EmailDomain' ? 'Email domain is required.' : 'Invitation code is required.')
    if (!form.registrationImageTitle.trim()) return setValidationError('Registration visual title is required.')
    if (form.benefits.length > 8000) return setValidationError('Event benefits are too long.')
    if (form.additionalInformation.length > 12000) return setValidationError('Additional information is too long.')

    const experienceError = validateExperience()
    if (experienceError) return setValidationError(experienceError)

    const mediaRequirements: Array<[File | undefined, string, boolean]> = [
      [assets.logo, 'Event logo', !event?.logoUrl], [assets.hero, 'Hero image', !event?.heroImageUrl], [assets.registration, 'Registration visual', !event?.registrationImageUrl]
    ]
    for (const [file, label, required] of mediaRequirements) {
      if (required && !file) return setValidationError(`${label} is required before this event can be published.`)
      const imageError = validateImage(file, label)
      if (imageError) return setValidationError(imageError)
    }

    if (form.mapsUrl.trim()) {
      try {
        const mapsUrl = new URL(form.mapsUrl.trim())
        if (!['http:', 'https:'].includes(mapsUrl.protocol)) throw new Error('Unsupported protocol')
      } catch { return setValidationError('Google Maps URL must be a valid HTTP or HTTPS URL.') }
    }

    await onSubmit({
      request: {
        name, slug,
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        kind: form.kind,
        startAt: startAt.toISOString(), endAt: endAt.toISOString(),
        registrationOpenAt: registrationOpenAt.toISOString(), registrationCloseAt: registrationCloseAt.toISOString(),
        capacity, accessMode: form.accessMode,
        accessValue: form.accessMode === 'Public' ? null : form.accessValue.trim(),
        registrationImageTitle: form.registrationImageTitle.trim(), venueAddress: form.venueAddress.trim() || null,
        mapsUrl: form.mapsUrl.trim() || null, about: form.about.trim() || null,
        benefits: form.benefits.trim() || null, additionalInformation: form.additionalInformation.trim() || null
      },
      assets,
      experienceConfig: { ...experience, kind: toModularKind(form.kind) }
    })
  }

  return (
    <Box component='form' onSubmit={handleSubmit} sx={{ display: 'grid', gap: 4 }}>
      {(error || validationError) && <Alert severity='error'>{validationError ?? error}</Alert>}
      <Card><CardContent sx={{ p: { xs: 3, md: 5 }, display: 'grid', gap: 4 }}>
        <SectionHeading title='Program / event information' description='Choose a template and control the public URL/SEO slug directly. Modules and participant fields can be customized afterward.' />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' }, gap: 3 }}>
          <FormControl fullWidth><InputLabel id='event-kind-label'>Program / event type</InputLabel><Select labelId='event-kind-label' label='Program / event type' value={toModularKind(form.kind)} onChange={e => changeKind(e.target.value as ModularEventKind)}>{SUPPORTED_EVENT_KINDS.map(kind => <MenuItem value={kind} key={kind}>{kind}</MenuItem>)}</Select></FormControl>
          <TextField label='Program / event name' value={form.name} onChange={e => updateName(e.target.value)} required fullWidth inputProps={{ maxLength: 200 }} />
        </Box>
        <TextField label='SEO slug / public URL' value={form.slug} onChange={e => updateSlug(e.target.value)} required fullWidth inputProps={{ maxLength: 240 }} helperText={`Public path: /events/${form.slug || 'your-event-slug'} — changing this changes the public event URL.`} />
        <TextField label='Short description' value={form.description} onChange={e => update('description', e.target.value)} multiline minRows={3} fullWidth inputProps={{ maxLength: 4000 }} helperText='Used for public/internal previews and short introductions.' />
        <TextField label='Venue / location name' value={form.location} onChange={e => update('location', e.target.value)} fullWidth inputProps={{ maxLength: 300 }} placeholder='e.g. Pertamina Training Center, Jakarta' />
      </CardContent></Card>

      <Card><CardContent sx={{ p: { xs: 3, md: 5 } }}><EventExperienceConfigurator kind={toModularKind(form.kind)} value={{ ...experience, kind: toModularKind(form.kind) }} disabled={submitting} onChange={setExperience} /></CardContent></Card>

      <Card><CardContent sx={{ p: { xs: 3, md: 5 }, display: 'grid', gap: 4 }}>
        <SectionHeading title='Schedule & capacity' description='Set the program schedule, registration window, and total participant capacity.' />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <TextField label='Starts' type='datetime-local' value={form.startAt} onChange={e => update('startAt', e.target.value)} InputLabelProps={{ shrink: true }} required />
          <TextField label='Ends' type='datetime-local' value={form.endAt} onChange={e => update('endAt', e.target.value)} InputLabelProps={{ shrink: true }} required />
          <TextField label='Registration opens' type='datetime-local' value={form.registrationOpenAt} onChange={e => update('registrationOpenAt', e.target.value)} InputLabelProps={{ shrink: true }} required />
          <TextField label='Registration closes' type='datetime-local' value={form.registrationCloseAt} onChange={e => update('registrationCloseAt', e.target.value)} InputLabelProps={{ shrink: true }} required />
        </Box>
        <TextField label='Participant capacity' type='number' value={form.capacity} onChange={e => update('capacity', e.target.value)} inputProps={{ min: 1, max: 1_000_000, step: 1, inputMode: 'numeric' }} required />
      </CardContent></Card>

      <Card><CardContent sx={{ p: { xs: 3, md: 5 }, display: 'grid', gap: 4 }}>
        <SectionHeading title='Branding & registration visual' description='Every program manages its own logo, cover image, and guide from admin.' />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
          <AssetField label='Logo' helper='Shown on landing and registration pages.' currentUrl={event?.logoUrl} file={assets.logo} required onChange={file => setAssets(p => ({ ...p, logo: file }))} />
          <AssetField label='Hero / cover image' helper='Main participant-facing visual.' currentUrl={event?.heroImageUrl} file={assets.hero} required onChange={file => setAssets(p => ({ ...p, hero: file }))} />
          <AssetField label='Registration / program visual' helper='Venue map, route, floor plan, schedule, or guide.' currentUrl={event?.registrationImageUrl} file={assets.registration} required onChange={file => setAssets(p => ({ ...p, registration: file }))} />
        </Box>
        <TextField label='Visual title' value={form.registrationImageTitle} onChange={e => update('registrationImageTitle', e.target.value)} inputProps={{ maxLength: 200 }} helperText='Examples: Venue Map, Program Guide, Race Route, Workshop Floor Plan.' required />
      </CardContent></Card>

      <Card><CardContent sx={{ p: { xs: 3, md: 5 }, display: 'grid', gap: 4 }}>
        <SectionHeading title='Public / participant content' description='Build the participant-facing page using reusable content managed from admin.' />
        <TextField label='About this program' value={form.about} onChange={e => update('about', e.target.value)} multiline minRows={4} inputProps={{ maxLength: 8000 }} />
        <DynamicBenefitsEditor value={form.benefits} onChange={value => update('benefits', value)} /><Divider /><DynamicContentSectionsEditor value={form.additionalInformation} onChange={value => update('additionalInformation', value)} />
      </CardContent></Card>

      <Card><CardContent sx={{ p: { xs: 3, md: 5 }, display: 'grid', gap: 4 }}>
        <SectionHeading title='Venue & access' description='Configure exact location and registration access.' />
        <TextField label='Full venue address' value={form.venueAddress} onChange={e => update('venueAddress', e.target.value)} inputProps={{ maxLength: 300 }} />
        <TextField label='Google Maps URL' value={form.mapsUrl} onChange={e => update('mapsUrl', e.target.value)} inputProps={{ maxLength: 1000 }} placeholder='https://maps.google.com/...' helperText='Participants open this location in a separate Maps tab/app.' />
        <Divider />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <FormControl fullWidth><InputLabel id='event-access-label'>Registration access</InputLabel><Select labelId='event-access-label' label='Registration access' value={form.accessMode} onChange={e => update('accessMode', e.target.value as EventAccessMode)}>{EVENT_ACCESS_MODES.map(mode => <MenuItem value={mode} key={mode}>{mode}</MenuItem>)}</Select></FormControl>
          {form.accessMode !== 'Public' && <TextField label={form.accessMode === 'EmailDomain' ? 'Allowed email domain' : 'Invitation code'} value={form.accessValue} onChange={e => update('accessValue', e.target.value)} inputProps={{ maxLength: 200 }} required />}
        </Box>
      </CardContent></Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Button variant='text' onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button type='submit' variant='contained' disabled={submitting} startIcon={<i className='tabler-device-floppy' />}>{submitting ? 'Saving...' : submitLabel}</Button>
      </Box>
    </Box>
  )
}

export default EventForm
