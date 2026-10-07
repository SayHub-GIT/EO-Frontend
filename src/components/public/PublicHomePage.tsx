
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { getPublicEvents, type PublicEvent } from '@/lib/api'

const experienceLinks = [
  { label: 'Running', href: '/events/category/running', accent: '#00A7E1' },
  { label: 'Seminar', href: '/events/category/seminar', accent: '#9BCB3B' },
  { label: 'Workshop', href: '/events/category/workshop', accent: '#F2B134' },
  { label: 'Other', href: '/events/category/other', accent: '#7F95B4' }
]

const parseDate = (value?: string) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const compareEvents = (a: PublicEvent, b: PublicEvent) =>
  (parseDate(a.startDate)?.getTime() ?? Number.MAX_SAFE_INTEGER) -
  (parseDate(b.startDate)?.getTime() ?? Number.MAX_SAFE_INTEGER)

const isCurrentOrUpcomingEvent = (event: PublicEvent) => {
  const referenceDate = parseDate(event.endDate) || parseDate(event.startDate)

  if (!referenceDate) return true

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return referenceDate.getTime() >= today.getTime()
}

const eventLocation = (event: PublicEvent) =>
  event.location || event.venue || event.city || event.venueAddress || 'Location to be announced'

const eventImage = (event: PublicEvent) => {
  if (event.heroImageUrl) return event.heroImageUrl
  if (event.imageUrl) return event.imageUrl

  const type = event.type?.toLowerCase() ?? ''
  if (type.includes('run')) return '/runn.png'
  if (type.includes('seminar')) return '/seminar.png'
  if (type.includes('workshop')) return '/workshop.png'
  return '/others.png'
}

const formatDate = (value?: string) => {
  const date = parseDate(value)
  if (!date) return 'Date to be announced'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

const compactDate = (value?: string) => {
  const date = parseDate(value)
  if (!date) return { day: '--', month: 'TBA', year: '' }

  return {
    day: new Intl.DateTimeFormat('en-GB', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date).toUpperCase(),
    year: new Intl.DateTimeFormat('en-GB', { year: 'numeric' }).format(date)
  }
}

const normalizeStatus = (event: PublicEvent) => {
  const raw = event.registrationStatus?.trim()
  if (!raw) return { label: 'View event', tone: 'neutral' as const }

  const value = raw.toLowerCase().replace(/[\s_-]/g, '')

  if (['open', 'openregistration', 'registrationopen', 'available'].includes(value)) {
    return { label: 'Open for registration', tone: 'open' as const }
  }

  if (['soldout', 'full'].includes(value)) {
    return { label: 'Sold out', tone: 'closed' as const }
  }

  if (['closed', 'registrationclosed', 'ended'].includes(value)) {
    return { label: 'Registration closed', tone: 'closed' as const }
  }

  return { label: raw, tone: 'neutral' as const }
}

const StatusText = ({ event }: { event: PublicEvent }) => {
  const status = normalizeStatus(event)

  return (
    <Typography
      component='span'
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        color: status.tone === 'open' ? '#5F9F00' : 'text.secondary',
        fontSize: '0.72rem',
        fontWeight: 750
      }}
    >
      <Box
        component='span'
        aria-hidden='true'
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: status.tone === 'open' ? '#83C900' : 'text.disabled'
        }}
      />
      {status.label}
    </Typography>
  )
}

const HomeEventCard = ({ event }: { event: PublicEvent }) => {
  const date = compactDate(event.startDate)

  return (
    <Box
      component={Link}
      href={'/events/' + encodeURIComponent(event.slug)}
      sx={theme => ({
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'text.primary',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        transition: theme.transitions.create(['border-color', 'transform'], {
          duration: theme.transitions.duration.shorter
        }),
        '&:hover': {
          borderColor: alpha(theme.palette.primary.main, 0.42),
          transform: 'translateY(-2px)'
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 3
        }
      })}
    >
      <Box sx={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden', bgcolor: 'action.hover' }}>
        <Box
          component='img'
          src={eventImage(event)}
          alt=''
          sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {event.type && (
          <Typography
            component='span'
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              px: 1.1,
              py: 0.45,
              borderRadius: 999,
              bgcolor: 'rgba(7,23,43,.8)',
              color: '#fff',
              fontSize: '0.68rem',
              fontWeight: 750
            }}
          >
            {event.type}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '42px minmax(0,1fr)', gap: 1.25, p: 1.7 }}>
        <Box>
          <Typography sx={{ fontSize: '1rem', lineHeight: 1, fontWeight: 850 }}>{date.day}</Typography>
          <Typography sx={{ mt: 0.4, fontSize: '0.63rem', fontWeight: 750, color: 'text.secondary' }}>
            {date.month}
          </Typography>
          {date.year && <Typography sx={{ fontSize: '0.58rem', color: 'text.disabled' }}>{date.year}</Typography>}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography component='h3' sx={{ fontSize: '0.84rem', fontWeight: 800, lineHeight: 1.32 }}>
            {event.name}
          </Typography>
          <Typography
            color='text.secondary'
            sx={{
              mt: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.55,
              fontSize: '0.68rem',
              lineHeight: 1.4
            }}
          >
            <i className='tabler-map-pin text-sm' aria-hidden='true' />
            <Box component='span' sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {eventLocation(event)}
            </Box>
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mt: 'auto', px: 1.7, pb: 1.55, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        <StatusText event={event} />
        <i className='tabler-arrow-right text-sm' aria-hidden='true' />
      </Box>
    </Box>
  )
}

const FeaturedEvent = ({ event }: { event: PublicEvent }) => {
  const status = normalizeStatus(event)
  const ctaLabel = status.tone === 'open' ? 'Register now' : 'View details'

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1.08fr) minmax(260px,.92fr)' },
        overflow: 'hidden',
        borderRadius: 2,
        bgcolor: '#07172B',
        color: '#fff',
        minHeight: { md: 318 },
        boxShadow: '0 16px 34px rgba(7,23,43,.12)'
      }}
    >
      <Box sx={{ position: 'relative', minHeight: { xs: 250, sm: 300, md: '100%' }, overflow: 'hidden' }}>
        <Box
          component='img'
          src={eventImage(event)}
          alt=''
          sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <Box
          aria-hidden='true'
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(4,16,30,.08) 0%, rgba(4,16,30,.34) 72%, rgba(7,23,43,.88) 100%)'
          }}
        />
      </Box>

      <Box sx={{ p: { xs: 2.5, sm: 2.8 }, pr: { xs: 2.5, sm: 3.4 }, display: 'flex', flexDirection: 'column' }}>
        <Typography sx={{ color: '#3EC9FF', fontSize: '0.66rem', fontWeight: 850, letterSpacing: '.09em' }}>
          FEATURED EVENT
        </Typography>
        <Typography
          component='h2'
          sx={{ mt: 0.9, maxWidth: 270, fontSize: { xs: '1.45rem', sm: '1.62rem' }, lineHeight: 1.13, fontWeight: 900 }}
        >
          {event.name}
        </Typography>

        <Box sx={{ mt: 1.8, display: 'grid', gap: 1.05 }}>
          <Typography sx={{ display: 'flex', gap: 0.9, alignItems: 'center', color: 'rgba(255,255,255,.8)', fontSize: '0.76rem' }}>
            <i className='tabler-calendar-event' aria-hidden='true' />
            {formatDate(event.startDate)}
          </Typography>
          <Typography sx={{ display: 'flex', gap: 0.9, alignItems: 'center', color: 'rgba(255,255,255,.8)', fontSize: '0.76rem' }}>
            <i className='tabler-map-pin' aria-hidden='true' />
            {eventLocation(event)}
          </Typography>
        </Box>

        <Box sx={{ mt: 'auto', pt: 3.2, borderTop: '1px solid rgba(255,255,255,.14)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          {event.type ? (
            <Typography
              component='span'
              sx={{
                px: 1.25,
                py: 0.5,
                border: '1px solid rgba(255,255,255,.2)',
                borderRadius: 999,
                color: 'rgba(255,255,255,.78)',
                fontSize: '0.66rem',
                fontWeight: 750
              }}
            >
              {event.type}
            </Typography>
          ) : <Box />}
          <Button
            component={Link}
            href={'/events/' + encodeURIComponent(event.slug)}
            variant='contained'
            size='small'
            endIcon={<i className='tabler-arrow-right text-sm' aria-hidden='true' />}
            sx={{ bgcolor: '#fff', color: '#07172B', fontWeight: 800, px: 1.7, '&:hover': { bgcolor: '#F3F7FA' } }}
          >
            {ctaLabel}
          </Button>
        </Box>
      </Box>

      <Box
        aria-hidden='true'
        sx={{
          position: 'absolute',
          insetBlock: 0,
          right: 0,
          width: 7,
          display: 'grid',
          gridTemplateRows: '1fr 1fr 1fr'
        }}
      >
        <Box sx={{ bgcolor: '#00A7E1' }} />
        <Box sx={{ bgcolor: '#83C900' }} />
        <Box sx={{ bgcolor: '#F04A3A' }} />
      </Box>
    </Box>
  )
}

const PublicHomePage = () => {
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedType, setSelectedType] = useState('All')
  const [dateFilter, setDateFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const result = await getPublicEvents()
        if (active) setEvents(result.slice().sort(compareEvents))
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load published events.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [])

  const currentEvents = useMemo(
    () => events.filter(isCurrentOrUpcomingEvent),
    [events]
  )

  const featured = currentEvents[0] ?? null
  const happening = currentEvents[1] ?? currentEvents[0] ?? null
  const happeningSide = currentEvents.slice(2, 5)

  const types = useMemo(
    () => [
      'All',
      ...Array.from(
        new Set(
          currentEvents
            .map(event => event.type)
            .filter((value): value is string => Boolean(value))
        )
      ).slice(0, 6)
    ],
    [currentEvents]
  )

  const locations = useMemo(
    () => Array.from(
      new Set(
        currentEvents
          .map(event => event.location || event.city || event.venue)
          .filter((value): value is string => Boolean(value))
      )
    ).sort().slice(0, 20),
    [currentEvents]
  )

  const filtered = useMemo(() => {
    const now = Date.now()

    return currentEvents.filter(event => {
      if (selectedType !== 'All' && event.type !== selectedType) return false

      const location = event.location || event.city || event.venue
      if (locationFilter !== 'all' && location !== locationFilter) return false

      if (dateFilter !== 'all') {
        const start = parseDate(event.startDate)?.getTime()
        if (!start) return false

        const days = dateFilter === '30' ? 30 : 90
        const horizon = days * 24 * 60 * 60 * 1000
        if (start < now || start > now + horizon) return false
      }

      return true
    })
  }, [currentEvents, dateFilter, locationFilter, selectedType])

  const upcoming = filtered.slice(0, 4)
  const journeyEvents = currentEvents.slice(0, 7)

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        color: 'text.primary'
      }}
    >
      <Box
        component='section'
        sx={{
          px: { xs: 2.5, sm: 3.5, lg: 4 },
          pt: { xs: 5, sm: 5.5, md: 3.5 },
          pb: { xs: 5, sm: 5.5, md: 4.5 },
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1440,
            mx: 'auto',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(300px,.76fr) minmax(0,1.24fr)' },
            alignItems: 'center',
            gap: { xs: 4.5, lg: 5.5 }
          }}
        >
          <Box sx={{ maxWidth: 500 }}>
            <Typography sx={{ color: '#00A7E1', fontSize: '0.72rem', fontWeight: 850, letterSpacing: '.08em' }}>
              PERTAMINA EVENT
            </Typography>
            <Typography
              component='h1'
              sx={{
                mt: 1.15,
                maxWidth: 470,
                fontSize: { xs: '2.3rem', sm: '2.8rem', lg: '3.05rem' },
                lineHeight: 1.01,
                letterSpacing: '-.04em',
                color: '#07172B',
                fontWeight: 900
              }}
            >
              Find your next Pertamina experience.
            </Typography>
            <Typography color='text.secondary' sx={{ mt: 1.6, maxWidth: 470, fontSize: { xs: '0.94rem', md: '0.96rem' }, lineHeight: 1.62 }}>
              Browse published events, workshops, learning sessions, and community experiences in one place.
            </Typography>
            <Button
              component={Link}
              href='#upcoming-events'
              variant='contained'
              endIcon={<i className='tabler-arrow-right text-sm' aria-hidden='true' />}
              sx={{ mt: 2.5, minHeight: 42, px: 2.25, bgcolor: '#07172B', color: '#fff', '&:hover': { bgcolor: '#0B2748' } }}
            >
              Browse events
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ minHeight: 318, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, display: 'grid', placeItems: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress size={28} />
                <Typography color='text.secondary' sx={{ mt: 1.5, fontSize: '0.85rem' }}>Loading published events...</Typography>
              </Box>
            </Box>
          ) : featured ? (
            <FeaturedEvent event={featured} />
          ) : (
            <Box sx={{ minHeight: 300, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, display: 'grid', placeItems: 'center', p: 4, textAlign: 'center' }}>
              <Box>
                <Typography fontWeight={800}>No published event is available yet.</Typography>
                <Typography color='text.secondary' sx={{ mt: 1, fontSize: '0.85rem' }}>Published events will appear here automatically.</Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <Box
        id='upcoming-events'
        component='section'
        sx={{
          px: { xs: 2.5, sm: 3.5, lg: 4 },
          py: { xs: 5, md: 4.5 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          scrollMarginTop: { xs: '72px', md: '80px' }
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 1440, mx: 'auto' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'auto minmax(0,1fr) auto' },
              alignItems: { md: 'center' },
              gap: { xs: 2.5, md: 3 }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap' }}>
              <Typography component='h2' sx={{ fontSize: { xs: '1.5rem', md: '1.65rem' }, fontWeight: 850 }}>
                Upcoming events
              </Typography>
              <Button
                component={Link}
                href='#event-categories'
                variant='text'
                endIcon={<i className='tabler-arrow-right text-xs' aria-hidden='true' />}
                sx={{ p: 0, minWidth: 0, fontSize: '0.68rem', fontWeight: 800 }}
              >
                Browse categories
              </Button>
            </Box>

            {types.length > 1 ? (
              <Box
                role='tablist'
                aria-label='Filter events by type'
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: { xs: 'flex-start', md: 'center' },
                  gap: 0.45,
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': { display: 'none' }
                }}
              >
                {types.map(type => {
                  const active = selectedType === type

                  return (
                    <Button
                      key={type}
                      role='tab'
                      aria-selected={active}
                      variant='text'
                      onClick={() => setSelectedType(type)}
                      sx={{
                        flexShrink: 0,
                        minHeight: 30,
                        minWidth: 0,
                        px: active ? 1.35 : 1,
                        borderRadius: 999,
                        bgcolor: active ? '#07172B' : 'transparent',
                        color: active ? '#fff' : 'text.secondary',
                        fontSize: '0.7rem',
                        fontWeight: active ? 800 : 650,
                        '&:hover': {
                          bgcolor: active ? '#0B2748' : 'action.hover',
                          color: active ? '#fff' : 'text.primary'
                        }
                      }}
                    >
                      {type}
                    </Button>
                  )
                })}
              </Box>
            ) : <Box />}

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 0.8, justifyContent: { md: 'flex-end' } }}>
              <FormControl size='small' sx={{ minWidth: { xs: '100%', sm: 128 } }}>
                <Select value={dateFilter} onChange={event => setDateFilter(String(event.target.value))} sx={{ fontSize: '0.76rem' }}>
                  <MenuItem value='all'>Any date</MenuItem>
                  <MenuItem value='30'>Next 30 days</MenuItem>
                  <MenuItem value='90'>Next 90 days</MenuItem>
                </Select>
              </FormControl>

              <FormControl size='small' sx={{ minWidth: { xs: '100%', sm: 148 } }}>
                <Select value={locationFilter} onChange={event => setLocationFilter(String(event.target.value))} sx={{ fontSize: '0.76rem' }}>
                  <MenuItem value='all'>All locations</MenuItem>
                  {locations.map(location => <MenuItem key={location} value={location}>{location}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {error && <Alert severity='error' sx={{ mt: 3 }}>{error}</Alert>}

          {!loading && !error && upcoming.length === 0 && (
            <Box sx={{ mt: 3, py: 5, borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography fontWeight={800}>No events match these filters.</Typography>
              <Typography color='text.secondary' sx={{ mt: 0.6, fontSize: '0.85rem' }}>Try another event type, date range, or location.</Typography>
            </Box>
          )}

          {!loading && !error && upcoming.length > 0 && (
            <Box sx={{ mt: 2.6, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))', md: 'repeat(4,minmax(0,1fr))' }, gap: { xs: 1.5, md: 1.6 } }}>
              {upcoming.map(event => <HomeEventCard key={event.id} event={event} />)}
            </Box>
          )}
        </Box>
      </Box>

      {happening && (
        <Box
          component='section'
          sx={{
            px: { xs: 2.5, sm: 3.5, lg: 4 },
            py: { xs: 5.5, md: 5.8 },
            bgcolor: theme => theme.palette.mode === 'dark' ? '#0B1726' : '#F5F8FB',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 1440, mx: 'auto', display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1.4fr) minmax(260px,.55fr)' }, gap: { xs: 3.5, lg: 4.5 }, alignItems: 'center' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1.05fr) minmax(280px,.95fr)' }, gap: { xs: 3, md: 4 }, alignItems: 'center' }}>
              <Box component='img' src={eventImage(happening)} alt='' sx={{ display: 'block', width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', borderRadius: 1.5 }} />

              <Box>
                <Typography sx={{ color: '#00A7E1', fontSize: '0.7rem', fontWeight: 850, letterSpacing: '.08em' }}>WHAT&apos;S HAPPENING</Typography>
                <Typography component='h2' sx={{ mt: 1.3, fontSize: { xs: '1.55rem', md: '1.8rem' }, lineHeight: 1.08, fontWeight: 900 }}>{happening.name}</Typography>
                <Typography color='text.secondary' sx={{ mt: 1.5, fontSize: '0.92rem', lineHeight: 1.65 }}>
                  {happening.description || happening.about || 'Open the event page for the latest schedule, venue, and registration information.'}
                </Typography>
                <Button component={Link} href={'/events/' + encodeURIComponent(happening.slug)} variant='text' sx={{ mt: 2, px: 0, fontWeight: 800 }}>View event</Button>
              </Box>
            </Box>

            {happeningSide.length > 0 && (
              <Box sx={{ display: 'grid', gap: 1.6 }}>
                {happeningSide.map(event => (
                  <Box
                    key={event.id}
                    component={Link}
                    href={'/events/' + encodeURIComponent(event.slug)}
                    sx={{ display: 'grid', gridTemplateColumns: '54px minmax(0,1fr)', gap: 1.5, color: 'text.primary', textDecoration: 'none', alignItems: 'center', '&:hover h3': { color: 'primary.main' } }}
                  >
                    <Box component='img' src={eventImage(event)} alt='' sx={{ width: 54, height: 44, objectFit: 'cover', borderRadius: 1 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography component='h3' sx={{ fontSize: '0.8rem', lineHeight: 1.35, fontWeight: 800 }}>{event.name}</Typography>
                      <Typography color='text.secondary' sx={{ mt: 0.35, fontSize: '0.67rem' }}>{formatDate(event.startDate)}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      )}

      <Box
        id='event-categories'
        component='section'
        sx={{
          px: { xs: 2.5, sm: 3.5, lg: 4 },
          py: { xs: 5.5, md: 5.5 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          scrollMarginTop: { xs: '72px', md: '80px' }
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 1440, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
            <Typography component='h2' sx={{ fontSize: { xs: '1.55rem', md: '1.8rem' }, fontWeight: 850 }}>Browse by experience</Typography>
            <Button
              component={Link}
              href='#upcoming-events'
              variant='text'
              endIcon={<i className='tabler-arrow-right text-xs' aria-hidden='true' />}
              sx={{ p: 0, minWidth: 0, fontSize: '0.72rem', fontWeight: 800 }}
            >
              Browse events
            </Button>
          </Box>

          <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: { xs: 1.5, lg: 2.5 } }}>
            {experienceLinks.map(category => (
              <Box
                key={category.href}
                component={Link}
                href={category.href}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: '2px solid', borderColor: category.accent, color: 'text.primary', textDecoration: 'none', fontWeight: 800, '&:hover': { color: 'primary.main' } }}
              >
                {category.label}
                <i className='tabler-arrow-right text-sm' aria-hidden='true' />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box
        component='section'
        aria-label='Follow our journey'
        sx={{
          px: { xs: 2.5, sm: 3.5, lg: 4 },
          py: { xs: 4, md: 4.5 },
          bgcolor: theme => theme.palette.mode === 'dark' ? '#0B1726' : '#F7F9FB'
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1440,
            mx: 'auto',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '220px minmax(0,1fr) auto' },
            gap: { xs: 2.5, md: 3.5 },
            alignItems: 'center'
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '0.92rem', fontWeight: 850 }}>Follow our journey</Typography>
            <Typography color='text.secondary' sx={{ mt: 0.4, fontSize: '0.72rem', lineHeight: 1.5 }}>
              Highlights from published Pertamina Event experiences.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: 0.8,
              overflowX: 'auto',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' }
            }}
          >
            {(journeyEvents.length > 0 ? journeyEvents : currentEvents).map(event => (
              <Box
                key={event.id}
                component={Link}
                href={'/events/' + encodeURIComponent(event.slug)}
                sx={{
                  width: 58,
                  height: 46,
                  flexShrink: 0,
                  overflow: 'hidden',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Box
                  component='img'
                  src={eventImage(event)}
                  alt=''
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </Box>
            ))}
          </Box>

          <Button
            component={Link}
            href='#upcoming-events'
            variant='outlined'
            size='small'
            endIcon={<i className='tabler-arrow-right text-xs' aria-hidden='true' />}
            sx={{ whiteSpace: 'nowrap', borderRadius: 999, fontSize: '0.72rem' }}
          >
            Browse events
          </Button>
        </Box>
      </Box>
      </Box>
    </Box>
  )
}

export default PublicHomePage
