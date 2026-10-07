'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import MicrositeDocumentPreview from '@/components/microsite/MicrositeDocumentPreview'
import { listAdminEvents, type AdminEvent } from '@/lib/admin-events'
import {
  checkMicrositeSubdomainAvailability,
  createAdminMicrosite,
  getMicrositeTemplateCatalog,
  listAdminMicrosites,
  type MicrositeDocument,
  type MicrositeTemplate
} from '@/lib/admin-microsites'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'

type Viewport = 'desktop' | 'tablet' | 'mobile'

const viewportWidths: Record<Viewport, number> = {
  desktop: 760,
  tablet: 520,
  mobile: 320
}

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)

const templatePreviewBindings: Record<string, unknown> = {
  'event-details': {
    name: 'Nama Event Anda',
    description: 'Deskripsi singkat event akan tampil di bagian ini.',
    about: 'Ceritakan event dengan bahasa yang jelas agar peserta cepat memahami informasi penting.',
    venueAddress: 'Lokasi event'
  }
}

const TemplatePreview = ({
  document,
  viewport
}: {
  document: MicrositeDocument
  viewport: Viewport
}) => (
  <Box
    sx={{
      width: '100%',
      overflowX: 'auto',
      pb: 1
    }}
  >
    <Box
      sx={{
        width: viewportWidths[viewport],
        maxWidth: '100%',
        minHeight: 520,
        mx: 'auto',
        border: theme => `1px solid ${theme.palette.divider}`,
        bgcolor: document.theme.backgroundColor,
        transition: 'width 160ms ease',
        overflow: 'hidden'
      }}
    >
      <MicrositeDocumentPreview
        document={document}
        dataBindings={templatePreviewBindings}
      />
    </Box>
  </Box>
)

export default function Page() {
  const router = useRouter()
  const templateAccess = usePermissionAccess('microsite.template.manage')
  const domainAccess = usePermissionAccess('microsite.domain.manage')

  const [templates, setTemplates] = useState<MicrositeTemplate[]>([])
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [usedEventIds, setUsedEventIds] = useState<Set<string>>(new Set())
  const [selectedKey, setSelectedKey] = useState('')
  const [category, setCategory] = useState('All')
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [eventId, setEventId] = useState('')
  const [slug, setSlug] = useState('')
  const [slugMessage, setSlugMessage] = useState('')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      setError('')

      const [catalog, eventList, microsites] = await Promise.all([
        getMicrositeTemplateCatalog(),
        listAdminEvents(),
        listAdminMicrosites()
      ])

      const activeTemplates = catalog.templates.filter(template => template.isActive)

      setTemplates(activeTemplates)
      setEvents(eventList.filter(event => event.status !== 'Archived'))
      setUsedEventIds(new Set(microsites.map(item => item.eventId)))
      setSelectedKey(current =>
        activeTemplates.some(template => template.key === current)
          ? current
          : activeTemplates[0]?.key ?? ''
      )
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load MicroSite templates.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(templates.map(template => template.category)))],
    [templates]
  )

  const filteredTemplates = useMemo(
    () => templates.filter(template => category === 'All' || template.category === category),
    [category, templates]
  )

  const selectedTemplate =
    templates.find(template => template.key === selectedKey) ??
    filteredTemplates[0] ??
    null

  const availableEvents = useMemo(
    () => events.filter(event => !usedEventIds.has(event.id)),
    [events, usedEventIds]
  )

  const selectEvent = (nextEventId: string) => {
    setEventId(nextEventId)
    const event = events.find(item => item.id === nextEventId)
    setSlug(normalizeSlug(event?.slug || event?.name || ''))
    setSlugAvailable(null)
    setSlugMessage('')
  }

  const checkSlug = async () => {
    const value = normalizeSlug(slug)

    setSlug(value)
    setSlugAvailable(null)
    setSlugMessage('')

    if (!eventId || value.length < 3) {
      setSlugMessage('Use Gunakan 3–63 huruf kecil, angka, atau tanda hubung.')
      return false
    }

    try {
      setCheckingSlug(true)
      const result = await checkMicrositeSubdomainAvailability(eventId, value)
      setSlugAvailable(result.available)
      setSlugMessage(result.available ? 'Alamat MicroSite is available.' : result.reason || 'Alamat MicroSite is unavailable.')
      return result.available
    } catch (checkError) {
      setSlugMessage(checkError instanceof Error ? checkError.message : 'Unable to check public slug.')
      return false
    } finally {
      setCheckingSlug(false)
    }
  }

  const openCreate = () => {
    if (!selectedTemplate) return

    setEventId('')
    setSlug('')
    setSlugAvailable(null)
    setSlugMessage('')
    setCreateOpen(true)
  }

  const create = async () => {
    if (!selectedTemplate || !eventId || creating) return

    const available = await checkSlug()
    if (!available) return

    try {
      setCreating(true)
      setError('')

      await createAdminMicrosite(eventId, {
        templateKey: selectedTemplate.key,
        subdomain: slug
      })

      setCreateOpen(false)
      router.push(`/admin/microsite/sites/${encodeURIComponent(eventId)}`)
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Unable to create MicroSite.'
      setError(message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Box sx={{ display: 'grid', gap: 4 }}>
      <Box>
        <Typography component='h1' variant='h4' fontWeight={700}>
          Template Website
        </Typography>
        <Typography color='text.secondary' sx={{ mt: 1, maxWidth: 760, lineHeight: 1.7 }}>
          Pilih desain website event. Setiap template mengatur susunan bagian, gaya visual, jarak, font, tombol, dan warna — bukan hanya warna.
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center' }}>
          <Box sx={{ display: 'grid', justifyItems: 'center', gap: 1.5 }}>
            <CircularProgress size={32} />
            <Typography variant='body2' color='text.secondary'>
              Memuat template...
            </Typography>
          </Box>
        </Box>
      )}

      {!loading && error && (
        <Alert
          severity='error'
          action={
            <Button color='inherit' size='small' onClick={() => void load()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {!loading && !error && templates.length === 0 && (
        <Alert severity='info'>
          Belum ada template MicroSite yang tersedia.
        </Alert>
      )}

      {!loading && !error && templates.length > 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {categories.map(value => (
              <Button
                key={value}
                variant={category === value ? 'contained' : 'outlined'}
                size='small'
                onClick={() => {
                  setCategory(value)
                  const first = templates.find(template => value === 'All' || template.category === value)
                  if (first) setSelectedKey(first.key)
                }}
                sx={{ minHeight: 40 }}
              >
                {value}
              </Button>
            ))}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', xl: 'minmax(340px, 0.9fr) minmax(0, 1.5fr)' },
              gap: 3,
              alignItems: 'start'
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                gap: 2
              }}
            >
              {filteredTemplates.map(template => {
                const selected = template.key === selectedTemplate?.key

                return (
                  <ButtonBase
                    key={template.id}
                    onClick={() => setSelectedKey(template.key)}
                    aria-pressed={selected}
                    sx={{
                      display: 'block',
                      textAlign: 'left',
                      border: theme => `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
                      borderRadius: 1.5,
                      p: 0,
                      overflow: 'hidden',
                      bgcolor: 'background.paper',
                      minHeight: 190,
                      '&:focus-visible': {
                        outline: theme => `3px solid ${theme.palette.primary.main}`,
                        outlineOffset: 2
                      }
                    }}
                  >
                    <Box
                      sx={{
                        height: 84,
                        bgcolor: template.defaultDocument.theme.backgroundColor,
                        borderBottom: theme => `1px solid ${theme.palette.divider}`,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr'
                      }}
                    >
                      <Box sx={{ bgcolor: template.defaultDocument.theme.primaryColor, opacity: 0.92 }} />
                      <Box sx={{ bgcolor: template.defaultDocument.theme.secondaryColor, opacity: 0.86 }} />
                    </Box>

                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
                        <Typography fontWeight={700}>{template.name}</Typography>
                        <Chip size='small' label={template.category} variant='outlined' />
                      </Box>
                      <Typography variant='body2' color='text.secondary' sx={{ mt: 1, lineHeight: 1.55 }}>
                        {template.description}
                      </Typography>
                    </Box>
                  </ButtonBase>
                )
              })}
            </Box>

            {selectedTemplate && (
              <Box
                sx={{
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  bgcolor: 'background.paper'
                }}
              >
                <Box
                  sx={{
                    p: { xs: 2.5, sm: 3 },
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { md: 'center' },
                    gap: 2
                  }}
                >
                  <Box>
                    <Typography variant='h6' fontWeight={700}>
                      {selectedTemplate.name}
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                      Version {selectedTemplate.version} · {selectedTemplate.defaultDocument.sections.length} sections
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <ToggleButtonGroup
                      exclusive
                      size='small'
                      value={viewport}
                      onChange={(_, value: Viewport | null) => value && setViewport(value)}
                      aria-label='Template preview viewport'
                    >
                      <ToggleButton value='desktop' aria-label='Desktop preview'>
                        <i className='tabler-device-desktop' />
                      </ToggleButton>
                      <ToggleButton value='tablet' aria-label='Tablet preview'>
                        <i className='tabler-device-tablet' />
                      </ToggleButton>
                      <ToggleButton value='mobile' aria-label='Mobile preview'>
                        <i className='tabler-device-mobile' />
                      </ToggleButton>
                    </ToggleButtonGroup>

                    <Button
                      variant='contained'
                      onClick={openCreate}
                      disabled={
                        !templateAccess.allowed ||
                        !domainAccess.allowed ||
                        availableEvents.length === 0
                      }
                    >
                      Gunakan template ini
                    </Button>
                  </Box>
                </Box>

                <Divider />

                <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'action.hover' }}>
                  <TemplatePreview
                    document={selectedTemplate.defaultDocument}
                    viewport={viewport}
                  />
                </Box>

                <Divider />

                <Box sx={{ p: { xs: 2.5, sm: 3 }, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selectedTemplate.tags.map(tag => (
                    <Chip key={tag} label={tag} size='small' variant='outlined' />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {availableEvents.length === 0 && (
            <Alert severity='info'>
              Semua event aktif sudah memiliki MicroSite, atau belum ada event aktif yang tersedia.
            </Alert>
          )}
        </>
      )}

      <Dialog
        open={createOpen}
        onClose={creating ? undefined : () => setCreateOpen(false)}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle>Buat MicroSite</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2.5, pt: '20px !important' }}>
          <Box>
            <Typography fontWeight={700}>{selectedTemplate?.name}</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
              Pilih event yang akan menggunakan desain ini.
            </Typography>
          </Box>

          <FormControl fullWidth>
            <InputLabel id='microsite-event-label'>Event</InputLabel>
            <Select
              labelId='microsite-event-label'
              label='Event'
              value={eventId}
              onChange={event => selectEvent(String(event.target.value))}
            >
              {availableEvents.map(event => (
                <MenuItem key={event.id} value={event.id}>
                  {event.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label='Alamat MicroSite'
            value={slug}
            onChange={event => {
              setSlug(normalizeSlug(event.target.value))
              setSlugAvailable(null)
              setSlugMessage('')
            }}
            onBlur={() => void checkSlug()}
            disabled={!eventId}
            helperText={
              checkingSlug
                ? 'Memeriksa alamat...'
                : slugMessage || 'Gunakan 3–63 huruf kecil, angka, atau tanda hubung.'
            }
            color={slugAvailable === true ? 'success' : undefined}
            error={slugAvailable === false}
            slotProps={{
              input: {
                endAdornment: checkingSlug
                  ? <CircularProgress size={18} />
                  : slugAvailable === true
                    ? <i className='tabler-check' aria-hidden='true' />
                    : null
              }
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            variant='contained'
            onClick={() => void create()}
            disabled={
              creating ||
              !eventId ||
              slug.length < 3 ||
              !templateAccess.allowed ||
              !domainAccess.allowed
            }
          >
            {creating ? 'Membuat...' : 'Buat MicroSite'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
