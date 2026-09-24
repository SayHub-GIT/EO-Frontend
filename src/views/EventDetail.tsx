'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import GoogleMapPreview from '@/components/public/GoogleMapPreview'
import PublicEventQuizSection from '@/components/quiz/PublicEventQuizSection'
import { getEventPackages, type EventPackage, type PublicEvent } from '@/lib/api'
import { parseEventBenefits, parseEventContentSections, sanitizeRichHtml } from '@/lib/event-content'
import {
  EVENT_MODULE_DEFINITIONS,
  getPublicEventExperience,
  type EventExperienceConfig,
  type EventModuleKey,
  type EventWorkspaceItem
} from '@/lib/event-experience'

type Props = { event: PublicEvent }

type RegistrationAvailability = {
  enabled: boolean
  label: string
  severity: 'success' | 'info' | 'warning' | 'error'
}

const getRegistrationAvailability = (event: PublicEvent): RegistrationAvailability => {
  if (typeof event.remainingQuota === 'number' && event.remainingQuota <= 0) {
    return { enabled: false, label: 'Participant quota is full', severity: 'warning' }
  }

  const now = Date.now()
  const opensAt = event.registrationStart ? new Date(event.registrationStart).getTime() : Number.NaN
  const closesAt = event.registrationEnd ? new Date(event.registrationEnd).getTime() : Number.NaN

  if (!Number.isNaN(opensAt) && now < opensAt) {
    return { enabled: false, label: 'Registration has not opened yet', severity: 'info' }
  }

  if (!Number.isNaN(closesAt) && now > closesAt) {
    return { enabled: false, label: 'Registration is closed', severity: 'warning' }
  }

  const status = event.registrationStatus?.toLowerCase() ?? ''
  if (status.includes('archived') || status.includes('cancelled')) {
    return { enabled: false, label: 'Registration unavailable', severity: 'error' }
  }

  return { enabled: true, label: 'Registration is open', severity: 'success' }
}

const formatDateTime = (value?: string) => {
  if (!value) return 'To be announced'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

const formatPrice = (value: number) => value <= 0
  ? 'Free'
  : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

const splitLines = (value?: string) => (value ?? '').split(/\r?\n/).map(item => item.trim().replace(/^[-•]\s*/, '')).filter(Boolean)

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()

const LocationDetailRow = ({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '36px minmax(0, 1fr)', gap: 1.5, alignItems: 'start' }}>
    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'action.hover', color: 'primary.main', display: 'grid', placeItems: 'center' }}>
      <i className={icon} />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant='caption' color='text.secondary' fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '.045em' }}>{label}</Typography>
      <Typography variant='body2' sx={{ mt: .45, lineHeight: 1.7, overflowWrap: 'anywhere' }}>{value}</Typography>
    </Box>
  </Box>
)

const PackageCard = ({ event, eventPackage, registrationEnabled }: { event: PublicEvent; eventPackage: EventPackage; registrationEnabled: boolean }) => {
  const soldOut = !eventPackage.isUnlimited && typeof eventPackage.remainingQuota === 'number' && eventPackage.remainingQuota <= 0

  return (
    <Card variant='outlined' sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='h6' fontWeight={700}>{eventPackage.name}</Typography>
            <Typography variant='h5' color='primary.main' fontWeight={700} sx={{ mt: 1 }}>{formatPrice(eventPackage.price)}</Typography>
          </Box>
          {soldOut ? <Chip label='Sold out' color='warning' size='small' /> : eventPackage.price <= 0 ? <Chip label='Free' color='success' variant='tonal' size='small' /> : null}
        </Box>

        {eventPackage.benefits && (
          <Box sx={{ mt: 2.5, display: 'grid', gap: 1 }}>
            {splitLines(eventPackage.benefits).map(benefit => (
              <Box key={benefit} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <i className='tabler-circle-check text-success' />
                <Typography variant='body2' color='text.secondary'>{benefit}</Typography>
              </Box>
            ))}
          </Box>
        )}

        <Typography variant='body2' color='text.secondary' sx={{ mt: 2.5, mb: 3 }}>
          {eventPackage.isUnlimited ? 'Quota: Unlimited' : `${Math.max(0, eventPackage.remainingQuota ?? 0).toLocaleString('id-ID')} slot(s) remaining`}
        </Typography>

        <Button component={Link} href={`/events/${encodeURIComponent(event.slug)}/register`} variant='outlined' disabled={!registrationEnabled || soldOut} sx={{ mt: 'auto' }}>
          {soldOut ? 'Sold Out' : 'Choose Option'}
        </Button>
      </CardContent>
    </Card>
  )
}

const PUBLIC_MODULE_ORDER: EventModuleKey[] = [
  'race-categories', 'race-pack', 'speakers', 'sessions', 'agenda', 'doorprize', 'booths', 'certificates'
]

const WorkspacePublicSection = ({ moduleKey, items }: { moduleKey: EventModuleKey; items: EventWorkspaceItem[] }) => {
  const moduleDefinition = EVENT_MODULE_DEFINITIONS.find(item => item.key === moduleKey)
  if (!moduleDefinition || items.length === 0) return null

  return (
    <Box component='section'>
      <Box sx={{ mb: 3 }}>
        <Chip label={moduleDefinition.label} color='primary' variant='tonal' size='small' />
        <Typography variant='h4' fontWeight={700} sx={{ mt: 1.5 }}>{moduleDefinition.label}</Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>{moduleDefinition.description}</Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2.5 }}>
        {items.filter(item => item.active !== false).map(item => {
          const details = Object.entries(item).filter(([key, value]) => !['id', 'title', 'active'].includes(key) && value !== null && value !== undefined && String(value).trim())
          return (
            <Card variant='outlined' sx={{ borderRadius: 3 }} key={item.id}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: 'action.hover', color: 'primary.main', display: 'grid', placeItems: 'center', flexShrink: 0 }}><i className={moduleDefinition.icon} /></Box>
                  <Typography variant='h6' fontWeight={700} sx={{ pt: .75 }}>{item.title}</Typography>
                </Box>
                {details.length > 0 && <Divider sx={{ my: 2.5 }} />}
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  {details.map(([key, value]) => (
                    <Box key={key}>
                      <Typography variant='caption' color='text.secondary' fontWeight={700} sx={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').replace(/-/g, ' ')}</Typography>
                      <Typography variant='body2' sx={{ mt: .25, whiteSpace: 'pre-line' }}>{String(value)}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )
        })}
      </Box>
    </Box>
  )
}

const EventDetail = ({ event }: Props) => {
  const [packages, setPackages] = useState<EventPackage[]>([])
  const [experience, setExperience] = useState<EventExperienceConfig | null>(null)
  const [packageError, setPackageError] = useState('')
  const [loadingPackages, setLoadingPackages] = useState(true)
  const availability = getRegistrationAvailability(event)

  const heroUrl = event.heroImageUrl || '/back.png'
  const logoUrl = event.logoUrl || '/EO%20Navbar.png'
  const benefits = useMemo(() => parseEventBenefits(event.benefits).filter(item => item.title.trim()), [event.benefits])
  const contentSections = useMemo(
    () => parseEventContentSections(event.additionalInformation).filter(section => stripHtml(section.contentHtml)),
    [event.additionalInformation]
  )

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoadingPackages(true)
        setPackageError('')
        const [packageResult, experienceResult] = await Promise.all([
          getEventPackages(event.id),
          getPublicEventExperience(event.id).catch(() => null)
        ])
        if (!active) return
        setPackages(packageResult.filter(item => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder))
        setExperience(experienceResult)
      } catch (loadError) {
        if (active) setPackageError(loadError instanceof Error ? loadError.message : 'Unable to load registration options.')
      } finally {
        if (active) setLoadingPackages(false)
      }
    }

    void load()
    return () => { active = false }
  }, [event.id])

  return (
    <Box>
      <Box component='section' sx={{ position: 'relative', minHeight: { xs: 560, md: 680 }, display: 'flex', alignItems: 'flex-end', overflow: 'hidden', bgcolor: 'background.paper' }}>
        <Box component='img' src={heroUrl} alt={event.name} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <Box sx={theme => ({ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${alpha(theme.palette.common.black, 0.08)} 15%, ${alpha(theme.palette.common.black, 0.86)} 100%)` })} />

        <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1180, mx: 'auto', px: 3, pt: { xs: 14, md: 16 }, pb: { xs: 6, md: 8 }, color: 'common.white' }}>
          <Box component='img' src={logoUrl} alt={`${event.name} logo`} sx={{ display: 'block', maxWidth: { xs: 180, md: 250 }, maxHeight: 120, width: 'auto', height: 'auto', objectFit: 'contain', objectPosition: 'left center', mb: 2.5 }} />
          <Chip label={event.type ?? 'Program / Event'} color='primary' size='small' />
          <Typography component='h1' sx={{ mt: 2, fontWeight: 800, fontSize: { xs: '2.25rem', sm: '3rem', md: '3.65rem' }, lineHeight: 1.08, letterSpacing: '-0.025em', maxWidth: 880, color: 'inherit' }}>{event.name}</Typography>
          <Typography sx={{ mt: 1.75, maxWidth: 720, color: 'inherit', opacity: 0.92, fontSize: { xs: '1rem', md: '1.08rem' }, lineHeight: 1.65 }}>{event.description || event.about || 'Discover the program details and secure your registration.'}</Typography>

          <Box sx={{ mt: 3.5, display: 'flex', flexWrap: 'wrap', gap: { xs: 2, md: 3.5 }, color: 'inherit' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><i className='tabler-calendar-event' /><Typography color='inherit'>{formatDateTime(event.startDate)}</Typography></Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><i className='tabler-map-pin' /><Typography color='inherit'>{event.location || 'Location to be announced'}</Typography></Box>
          </Box>

          <Box sx={{ mt: 3.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <Button component={Link} href={`/events/${encodeURIComponent(event.slug)}/register`} variant='contained' size='large' disabled={!availability.enabled} endIcon={<i className='tabler-arrow-up-right' />}>
              {availability.enabled ? 'Register Now' : 'Registration Unavailable'}
            </Button>
            {experience?.enabledModules.includes('quiz') && (
              <Button
                component={Link}
                href={`/events/${encodeURIComponent(event.slug)}/quiz`}
                variant='outlined'
                size='large'
                startIcon={<i className='tabler-device-gamepad-2' />}
                sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,.72)', '&:hover': { borderColor: 'common.white', bgcolor: 'rgba(255,255,255,.08)' } }}
              >
                Join Quiz
              </Button>
            )}
            <Chip label={availability.label} color={availability.severity} variant='filled' />
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 3, py: { xs: 6, md: 8 } }}>
        <Box sx={{ width: '100%', maxWidth: 1180, mx: 'auto', display: 'grid', gap: { xs: 6, md: 8 } }}>
          <Box component='section' sx={{ maxWidth: 900 }}>
            <Chip label='About' color='primary' variant='tonal' size='small' />
            <Typography variant='h4' fontWeight={700} sx={{ mt: 1.5 }}>About this program</Typography>
            <Typography variant='body1' color='text.secondary' sx={{ mt: 2, whiteSpace: 'pre-line', lineHeight: 1.85, fontSize: '1rem', maxWidth: 820 }}>{event.about || event.description || 'More information will be available soon.'}</Typography>
          </Box>

          {benefits.length > 0 && (
            <Box component='section'>
              <Box sx={{ mb: 3 }}><Chip label='Benefits' color='primary' variant='tonal' size='small' /><Typography variant='h4' fontWeight={700} sx={{ mt: 1.5 }}>What you&apos;ll get</Typography></Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2.5 }}>
                {benefits.map(benefit => (
                  <Card key={benefit.id} variant='outlined' sx={{ borderRadius: 3 }}>
                    <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: 'action.hover', color: 'primary.main', display: 'grid', placeItems: 'center', flexShrink: 0 }}><i className={benefit.icon} /></Box>
                      <Box><Typography fontWeight={700}>{benefit.title}</Typography>{benefit.description && <Typography variant='body2' color='text.secondary' sx={{ mt: .75, lineHeight: 1.65 }}>{benefit.description}</Typography>}</Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          )}

          {experience?.enabledModules.includes('quiz') && (
            <PublicEventQuizSection event={event} />
          )}

          {experience && PUBLIC_MODULE_ORDER.map(moduleKey => {
            const items = experience.moduleData?.[moduleKey] ?? []
            return <WorkspacePublicSection key={moduleKey} moduleKey={moduleKey} items={items} />
          })}

          <Box component='section'>
            <Box sx={{ mb: 3 }}><Chip label='Registration Options' color='primary' variant='tonal' size='small' /><Typography variant='h4' fontWeight={700} sx={{ mt: 1.5 }}>Choose your registration option</Typography><Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>Choose an option below. Free options register immediately without payment.</Typography></Box>
            {loadingPackages && <Box sx={{ py: 5, display: 'grid', placeItems: 'center' }}><CircularProgress size={32} /></Box>}
            {packageError && <Alert severity='error'>{packageError}</Alert>}
            {!loadingPackages && !packageError && packages.length === 0 && <Alert severity='info'>No active registration options are currently available.</Alert>}
            {!loadingPackages && packages.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2.5 }}>
                {packages.map(eventPackage => <PackageCard key={eventPackage.id} event={event} eventPackage={eventPackage} registrationEnabled={availability.enabled} />)}
              </Box>
            )}
          </Box>

          {event.registrationImageUrl && (
            <Box component='section'>
              <Box sx={{ mb: 3 }}><Chip label='Program Guide' color='primary' variant='tonal' size='small' /><Typography variant='h4' fontWeight={700} sx={{ mt: 1.5 }}>{event.registrationImageTitle || 'Program Guide'}</Typography></Box>
              <Card variant='outlined' sx={{ overflow: 'hidden', borderRadius: 3 }}><Box component='img' src={event.registrationImageUrl} alt={event.registrationImageTitle || 'Program guide'} sx={{ width: '100%', maxHeight: 680, display: 'block', objectFit: 'contain', bgcolor: 'background.paper' }} /></Card>
            </Box>
          )}

          {(event.location || event.venueAddress || event.mapsUrl) && (
            <Box component='section'>
              <Box sx={{ mb: 3 }}><Chip label='Location' color='primary' variant='tonal' size='small' /><Typography variant='h4' fontWeight={700} sx={{ mt: 1.5 }}>Venue</Typography></Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.35fr) minmax(320px, .65fr)' }, gap: 3, alignItems: 'stretch' }}>
                <Card variant='outlined' sx={{ minHeight: 460, overflow: 'hidden', borderRadius: 3 }}><GoogleMapPreview mapsUrl={event.mapsUrl} fallbackQuery={event.mapsUrl ? null : (event.venueAddress || event.location)} title={`${event.name} venue map`} /></Card>
                <Card variant='outlined' sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ p: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Typography variant='h5' fontWeight={700}>{event.location || 'Venue'}</Typography>
                    <Divider sx={{ my: 3 }} />
                    <Box sx={{ display: 'grid', gap: 2.5 }}>
                      <LocationDetailRow icon='tabler-map-pin' label='Venue name' value={event.location || 'To be announced'} />
                      <LocationDetailRow icon='tabler-map-search' label='Full address' value={event.venueAddress || event.location || 'To be announced'} />
                      <LocationDetailRow icon='tabler-calendar-clock' label='Program time' value={formatDateTime(event.startDate)} />
                    </Box>
                    {event.mapsUrl && <Button component='a' href={event.mapsUrl} target='_blank' rel='noopener noreferrer' variant='contained' startIcon={<i className='tabler-brand-google-maps' />} sx={{ mt: 'auto', pt: 1.25, pb: 1.25 }}>Open in Google Maps</Button>}
                  </CardContent>
                </Card>
              </Box>
            </Box>
          )}

          {contentSections.map(section => (
            <Box component='section' key={section.id}>
              <Card variant='outlined' sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Chip label='Information' color='primary' variant='tonal' size='small' />
                  <Typography variant='h4' fontWeight={700} sx={{ mt: 1.5 }}>{section.title || 'Additional Information'}</Typography>
                  <Divider sx={{ my: 3 }} />
                  <Box
                    color='text.secondary'
                    sx={{ lineHeight: 1.85, maxWidth: 920, '& h1': { color: 'text.primary', fontSize: '2rem' }, '& h2': { color: 'text.primary', fontSize: '1.6rem' }, '& h3': { color: 'text.primary' }, '& ul, & ol': { pl: 3 } }}
                    dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(section.contentHtml) }}
                  />
                </CardContent>
              </Card>
            </Box>
          ))}

          <Box component='section' sx={{ textAlign: 'center', py: { xs: 3, md: 5 } }}>
            <Typography variant='h4' fontWeight={700}>Ready to join {event.name}?</Typography>
            <Typography variant='body1' color='text.secondary' sx={{ mt: 1.25 }}>{availability.enabled ? 'Choose your registration option and complete the participant form.' : availability.label}</Typography>
            <Button component={Link} href={`/events/${encodeURIComponent(event.slug)}/register`} disabled={!availability.enabled} variant='contained' size='large' endIcon={<i className='tabler-arrow-up-right' />} sx={{ mt: 3 }}>Register Now</Button>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default EventDetail
