'use client'

import { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

import EventPackages from './components/EventPackages'
import {
  archiveAdminEvent,
  getAdminEvent,
  publishAdminEvent,
  unarchiveAdminEvent,
  type AdminEvent
} from '@/lib/admin-events'
import { parseEventBenefits, parseEventContentSections } from '@/lib/event-content'

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date)
}

const formatPrice = (value: number) =>
  value === 0 ? 'Free / no active package' : new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(value)

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

const EventOverviewPage = () => {
  const params = useParams<{ eventSlug: string }>()
  const eventId = params.eventSlug
  const router = useRouter()
  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionDialog, setActionDialog] = useState<'publish' | 'archive' | 'unarchive' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadEvent = async () => {
    try {
      setLoading(true)
      setError(null)
      setEvent(await getAdminEvent(eventId))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load event.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const handlePublish = async () => {
    if (!event || actionLoading) return

    try {
      setActionLoading(true)
      setError(null)
      setEvent(await publishAdminEvent(event.id))
      setActionDialog(null)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to publish event.')
      setActionDialog(null)
    } finally {
      setActionLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!event || actionLoading) return

    try {
      setActionLoading(true)
      setError(null)
      await archiveAdminEvent(event.id)
      router.push('/admin/events/archived')
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to archive event.')
      setActionDialog(null)
      setActionLoading(false)
    }
  }

  const handleUnarchive = async () => {
    if (!event || actionLoading) return

    try {
      setActionLoading(true)
      setError(null)
      setEvent(await unarchiveAdminEvent(event.id))
      setActionDialog(null)
      router.refresh()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to unarchive event.')
      setActionDialog(null)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress size={32} /></Box>

  if (!event) {
    return <Alert severity='error' action={<Button onClick={loadEvent}>Retry</Button>}>{error ?? 'Event not found.'}</Alert>
  }

  const archived = event.status === 'Archived'
  const presentationItems = [
    ['Event logo', event.logoUrl],
    ['Hero image', event.heroImageUrl],
    ['Registration visual', event.registrationImageUrl],
    ['Visual title', event.registrationImageTitle]
  ] as const
  const mediaComplete = presentationItems.every(([, value]) => Boolean(value))
  const benefits = parseEventBenefits(event.benefits).filter(item => item.title.trim())
  const informationSections = parseEventContentSections(event.additionalInformation)
    .map(section => ({ ...section, plainText: stripHtml(section.contentHtml) }))
    .filter(section => section.plainText)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <Box>

        {error && <Alert severity='error' sx={{ mb: 3 }}>{error}</Alert>}
        {archived && (
          <Alert severity='info' sx={{ mb: 3 }}>
            This event is archived and read-only. Unarchive it to restore it as a Draft, then review and publish it again when ready.
          </Alert>
        )}
        {event.status === 'Draft' && !mediaComplete && (
          <Alert severity='warning' sx={{ mb: 3 }}>
            Event presentation is incomplete. Add the logo, hero image, registration visual, and visual title before publishing.
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', gap: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
              <Typography variant='h4' fontWeight={700}>{event.name}</Typography>
              <Chip label={event.status} color={event.status === 'Published' ? 'success' : 'default'} variant='tonal' size='small' />
              <Chip label={event.kind} color='primary' variant='tonal' size='small' />
            </Box>
            <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
              {archived ? 'Review event, package, and participant history.' : 'Manage event details, public presentation, packages, and registrations.'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignSelf: { xs: 'flex-start', lg: 'center' } }}>
            <Button component={NextLink} href={`/admin/events/${encodeURIComponent(event.id)}/dashboard`} variant='outlined' startIcon={<i className='tabler-layout-dashboard' />}>
              Dashboard
            </Button>
            {!archived && (
              <Button component={NextLink} href={`/admin/events/${encodeURIComponent(event.id)}/edit`} variant='outlined' startIcon={<i className='tabler-edit' />}>
                Edit Event
              </Button>
            )}
            {event.status === 'Draft' && (
              <Button
                variant='contained'
                disabled={actionLoading || !mediaComplete}
                onClick={() => setActionDialog('publish')}
                startIcon={<i className='tabler-world-upload' />}
              >
                Publish Event
              </Button>
            )}
            <Button component={NextLink} href={`/admin/events/${encodeURIComponent(event.id)}/registrations`} variant='outlined' startIcon={<i className='tabler-users' />}>
              {archived ? 'View Registrations' : 'Manage Registrations'}
            </Button>
            {archived ? (
              <Button
                color='primary'
                variant='contained'
                disabled={actionLoading}
                onClick={() => setActionDialog('unarchive')}
                startIcon={<i className='tabler-archive-off' />}
              >
                Unarchive Event
              </Button>
            ) : (
              <Button
                color='error'
                variant='outlined'
                disabled={actionLoading}
                onClick={() => setActionDialog('archive')}
                startIcon={<i className='tabler-archive' />}
              >
                Archive Event
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <Typography variant='h6' fontWeight={600}>Event overview</Typography>
          <Divider sx={{ my: 4 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 4 }}>
            <Box><Typography variant='body2' color='text.secondary'>Location</Typography><Typography fontWeight={600} sx={{ mt: .75 }}>{event.location || 'Not set'}</Typography></Box>
            <Box><Typography variant='body2' color='text.secondary'>Event starts</Typography><Typography fontWeight={600} sx={{ mt: .75 }}>{formatDateTime(event.startAtUtc)}</Typography></Box>
            <Box><Typography variant='body2' color='text.secondary'>Event ends</Typography><Typography fontWeight={600} sx={{ mt: .75 }}>{formatDateTime(event.endAtUtc)}</Typography></Box>
            <Box><Typography variant='body2' color='text.secondary'>Displayed price</Typography><Typography fontWeight={600} sx={{ mt: .75 }}>{formatPrice(event.price)}</Typography></Box>
            <Box><Typography variant='body2' color='text.secondary'>Registration opens</Typography><Typography fontWeight={600} sx={{ mt: .75 }}>{formatDateTime(event.registrationOpenAtUtc)}</Typography></Box>
            <Box><Typography variant='body2' color='text.secondary'>Registration closes</Typography><Typography fontWeight={600} sx={{ mt: .75 }}>{formatDateTime(event.registrationCloseAtUtc)}</Typography></Box>
            <Box><Typography variant='body2' color='text.secondary'>Capacity</Typography><Typography fontWeight={600} sx={{ mt: .75 }}>{event.capacity.toLocaleString()}</Typography></Box>
            <Box><Typography variant='body2' color='text.secondary'>Registered / remaining</Typography><Typography fontWeight={600} sx={{ mt: .75 }}>{event.registeredCount.toLocaleString()} / {event.remainingQuota.toLocaleString()}</Typography></Box>
          </Box>

          <Divider sx={{ my: 4 }} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip label={event.accessMode === 'InvitationCode' ? 'Invitation Code' : event.accessMode === 'EmailDomain' ? 'Email Domain' : 'Public Access'} variant='outlined' size='small' />
            {event.accessMode !== 'Public' && event.accessValue && <Chip label={event.accessValue} variant='outlined' size='small' />}
            <Chip label={`Slug: ${event.slug}`} variant='outlined' size='small' />
          </Box>

          {event.description && <Typography variant='body2' color='text.secondary' sx={{ mt: 4, whiteSpace: 'pre-line' }}>{event.description}</Typography>}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant='h6' fontWeight={600}>Public presentation</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                Media and content used by the public event microsite and registration page.
              </Typography>
            </Box>
            <Chip label={mediaComplete ? 'Ready to publish' : 'Setup required'} color={mediaComplete ? 'success' : 'warning'} variant='tonal' />
          </Box>

          <Divider sx={{ my: 4 }} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 3 }}>
            {presentationItems.map(([label, value]) => (
              <Box key={label} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant='body2' color='text.secondary'>{label}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <i className={value ? 'tabler-circle-check text-success' : 'tabler-alert-circle'} />
                  <Typography fontWeight={600}>{value ? 'Configured' : 'Missing'}</Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {(event.about || benefits.length > 0 || informationSections.length > 0 || event.venueAddress || event.mapsUrl) && (
            <Box sx={{ mt: 4, display: 'grid', gap: 3 }}>
              {event.about && <Box><Typography fontWeight={600}>About</Typography><Typography variant='body2' color='text.secondary' sx={{ mt: 1, whiteSpace: 'pre-line' }}>{event.about}</Typography></Box>}
              {benefits.length > 0 && (
                <Box>
                  <Typography fontWeight={600}>Benefits</Typography>
                  <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                    {benefits.map(benefit => (
                      <Box key={benefit.id} sx={{ display: 'flex', gap: 1.25, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <i className={benefit.icon} />
                        <Box>
                          <Typography variant='body2' fontWeight={700}>{benefit.title}</Typography>
                          {benefit.description && <Typography variant='caption' color='text.secondary'>{benefit.description}</Typography>}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              {informationSections.length > 0 && (
                <Box>
                  <Typography fontWeight={600}>Additional information</Typography>
                  <Box sx={{ mt: 1.5, display: 'grid', gap: 1.5 }}>
                    {informationSections.map(section => (
                      <Box key={section.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant='body2' fontWeight={700}>{section.title || 'Additional Information'}</Typography>
                        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: .5 }}>{section.plainText}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              {event.venueAddress && <Box><Typography fontWeight={600}>Venue address</Typography><Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>{event.venueAddress}</Typography></Box>}
              {event.mapsUrl && <Button component='a' href={event.mapsUrl} target='_blank' rel='noreferrer' variant='outlined' startIcon={<i className='tabler-map-pin' />} sx={{ justifySelf: 'start' }}>Open Google Maps</Button>}
            </Box>
          )}
        </CardContent>
      </Card>

      <EventPackages eventId={event.id} readOnly={archived} />

      <Dialog open={actionDialog === 'publish'} onClose={() => !actionLoading && setActionDialog(null)} maxWidth='xs' fullWidth>
        <DialogTitle>Publish this event?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The event will become visible on its public category page. Registration availability will still follow the configured registration dates and package quota.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant='text' onClick={() => setActionDialog(null)} disabled={actionLoading}>Cancel</Button>
          <Button variant='contained' onClick={() => void handlePublish()} disabled={actionLoading}>
            {actionLoading ? 'Publishing...' : 'Publish Event'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={actionDialog === 'archive'} onClose={() => !actionLoading && setActionDialog(null)} maxWidth='xs' fullWidth>
        <DialogTitle>Archive this event?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The event will disappear from public pages and registration, while packages, participants, and history remain stored for admin review.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant='text' onClick={() => setActionDialog(null)} disabled={actionLoading}>Cancel</Button>
          <Button color='error' variant='contained' onClick={() => void handleArchive()} disabled={actionLoading}>
            {actionLoading ? 'Archiving...' : 'Archive Event'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={actionDialog === 'unarchive'} onClose={() => !actionLoading && setActionDialog(null)} maxWidth='xs' fullWidth>
        <DialogTitle>Unarchive this event?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The event will be restored as Draft. It will stay hidden from public pages until you review it and publish it again.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant='text' onClick={() => setActionDialog(null)} disabled={actionLoading}>Cancel</Button>
          <Button variant='contained' onClick={() => void handleUnarchive()} disabled={actionLoading}>
            {actionLoading ? 'Restoring...' : 'Unarchive Event'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default EventOverviewPage
