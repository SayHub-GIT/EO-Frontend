
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import { getPublicEvents, type PublicEvent } from '@/lib/api'

const experienceLinks = [
  { label: 'Running', href: '/events/category/running', accent: '#00A7E1', foreground: '#FFFFFF' },
  { label: 'Seminar', href: '/events/category/seminar', accent: '#9BCB3B', foreground: '#07172B' },
  { label: 'Workshop', href: '/events/category/workshop', accent: '#F2B134', foreground: '#07172B' },
  { label: 'Other', href: '/events/category/other', accent: '#7F95B4', foreground: '#FFFFFF' }
]

const ecosystemLogos = [
  { name: 'Pertamina', src: '/pertamina.png' },
  { name: 'Pertamina Training & Consulting', src: '/ptc.png' }
]

const figmaUpcomingTypes = ['All', 'Community', 'Sport', 'Music', 'Learning', 'Corporate'] as const

type HomeUpcomingCategory = Exclude<(typeof figmaUpcomingTypes)[number], 'All'>
type HomeUpcomingStatusTone = 'open' | 'soon' | 'closed' | 'neutral'

type HomeUpcomingEvent = {
  id: string
  slug: string
  name: string
  category: HomeUpcomingCategory
  monthKey: string
  day: string
  month: string
  year: string
  location: string
  image: string
  status: string
  statusTone: HomeUpcomingStatusTone
}

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

const normalizeHomeCategory = (event: PublicEvent): HomeUpcomingCategory => {
  const value = event.type?.trim().toLowerCase() ?? ''

  if (/(run|running|race|marathon|sport|fitness)/.test(value)) return 'Sport'
  if (/(music|festival|concert|gig|performance)/.test(value)) return 'Music'
  if (/(seminar|workshop|training|learning|class|course|education)/.test(value)) return 'Learning'
  if (/(corporate|business|company|internal|conference|forum)/.test(value)) return 'Corporate'

  return 'Community'
}

const formatUpcomingDateParts = (value?: string) => {
  const date = parseDate(value)

  if (!date) {
    return {
      monthKey: '',
      day: '--',
      month: 'TBA',
      year: ''
    }
  }

  return {
    monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    day: new Intl.DateTimeFormat('en-GB', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase(),
    year: String(date.getFullYear())
  }
}

const normalizeUpcomingStatus = (event: PublicEvent) => {
  const status = normalizeStatus(event)

  if (status.tone === 'open') return { label: status.label, tone: 'open' as const }
  if (status.tone === 'closed') return { label: status.label, tone: 'closed' as const }

  const raw = event.registrationStatus?.trim() ?? ''
  const value = raw.toLowerCase().replace(/[\s_-]/g, '')

  if (['comingsoon', 'upcoming', 'notstarted', 'scheduled'].includes(value)) {
    return { label: raw || 'Coming soon', tone: 'soon' as const }
  }

  return { label: status.label, tone: 'neutral' as const }
}

const toHomeUpcomingEvent = (event: PublicEvent): HomeUpcomingEvent => {
  const date = formatUpcomingDateParts(event.startDate)
  const status = normalizeUpcomingStatus(event)

  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    category: normalizeHomeCategory(event),
    monthKey: date.monthKey,
    day: date.day,
    month: date.month,
    year: date.year,
    location: eventLocation(event),
    image: eventImage(event),
    status: status.label,
    statusTone: status.tone
  }
}

const upcomingStatusColor = (tone: HomeUpcomingStatusTone) => {
  if (tone === 'open') return '#63A600'
  if (tone === 'soon') return 'warning.main'
  if (tone === 'closed') return 'error.main'

  return 'text.disabled'
}

const FigmaUpcomingCard = ({ event }: { event: HomeUpcomingEvent }) => (
  <Box
    component={Link}
    href={'/events/' + encodeURIComponent(event.slug)}
    aria-label={`View ${event.name}`}
    sx={theme => ({
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      bgcolor: 'background.paper',
      color: 'text.primary',
      textDecoration: 'none',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1.75,
      transition: theme.transitions.create(['border-color', 'transform', 'box-shadow'], {
        duration: theme.transitions.duration.shorter
      }),
      '&:hover': {
        borderColor: 'text.disabled',
        transform: 'translateY(-2px)',
        boxShadow: '0 12px 28px rgba(7,23,43,.08)'
      },
      '&:focus-visible': {
        outline: '2px solid',
        outlineColor: 'primary.main',
        outlineOffset: 3
      }
    })}
  >
    <Box sx={{ position: 'relative', aspectRatio: '1.9 / 1', overflow: 'hidden', bgcolor: 'action.hover' }}>
      <Box
        component='img'
        src={event.image}
        alt=''
        sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <Typography
        component='span'
        sx={{
          position: 'absolute',
          top: 12,
          left: 12,
          px: 1.15,
          py: 0.45,
          borderRadius: 999,
          bgcolor: 'rgba(7,23,43,.82)',
          color: '#fff',
          fontSize: '0.69rem',
          lineHeight: 1,
          fontWeight: 750
        }}
      >
        {event.category}
      </Typography>
    </Box>

    <Box sx={{ display: 'grid', gridTemplateColumns: '34px minmax(0,1fr)', gap: 1.2, px: 1.8, pt: 1.85 }}>
      <Box>
        <Typography sx={{ fontSize: '1.08rem', lineHeight: 1, fontWeight: 850 }}>{event.day}</Typography>
        <Typography sx={{ mt: 0.4, fontSize: '0.68rem', fontWeight: 800, color: 'primary.main' }}>{event.month}</Typography>
        <Typography sx={{ mt: 0.2, fontSize: '0.62rem', color: 'text.secondary' }}>{event.year}</Typography>
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography component='h3' sx={{ fontSize: { xs: '0.94rem', md: '0.96rem' }, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-.015em' }}>
          {event.name}
        </Typography>
        <Typography
          color='text.secondary'
          sx={{
            mt: 0.55,
            display: 'flex',
            alignItems: 'center',
            gap: 0.55,
            fontSize: '0.75rem',
            lineHeight: 1.4
          }}
        >
          <i className='tabler-map-pin text-sm' aria-hidden='true' />
          <Box component='span' sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.location}
          </Box>
        </Typography>
      </Box>
    </Box>

    <Box
      sx={{
        mt: 'auto',
        px: 1.8,
        pt: 1.9,
        pb: 1.7,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1
      }}
    >
      <Typography
        component='span'
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          color: upcomingStatusColor(event.statusTone),
          fontSize: '0.75rem',
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
            bgcolor: upcomingStatusColor(event.statusTone)
          }}
        />
        {event.status}
      </Typography>

      <i className='tabler-arrow-right text-sm' aria-hidden='true' />
    </Box>
  </Box>
)

const homeHeroVideoPlaceholder = {
  src: '',
  poster: '/seminar.png'
}

const HomeHeroMediaPlayer = () => (
  <Box
    sx={{
      position: 'relative',
      width: '100%',
      aspectRatio: '16 / 9',
      overflow: 'hidden',
      borderRadius: { xs: 2, md: 2.5 },
      bgcolor: '#07172B',
      boxShadow: '0 16px 38px rgba(7,23,43,.16)'
    }}
  >
    <Box
      component='video'
      controls
      playsInline
      preload='metadata'
      poster={homeHeroVideoPlaceholder.poster}
      src={homeHeroVideoPlaceholder.src || undefined}
      aria-label='Featured event video placeholder'
      sx={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        bgcolor: '#07172B'
      }}
    />
  </Box>
)

const PublicHomePage = () => {
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [selectedType, setSelectedType] = useState('All')
  const [dateFilter, setDateFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const result = await getPublicEvents()
        if (active) setEvents(result.slice().sort(compareEvents))
      } catch {
        if (active) setEvents([])
      }
    }

    void load()
    return () => { active = false }
  }, [])

  const currentEvents = useMemo(
    () => events.filter(isCurrentOrUpcomingEvent),
    [events]
  )

  const happening = currentEvents[1] ?? currentEvents[0] ?? null
  const happeningSide = currentEvents.slice(2, 5)

  const upcomingSource = useMemo(
    () => currentEvents.map(toHomeUpcomingEvent),
    [currentEvents]
  )

  const upcomingMonths = useMemo(() => {
    const values = Array.from(new Set(upcomingSource.map(event => event.monthKey).filter(Boolean))).sort()

    return values.map(value => {
      const [year, month] = value.split('-').map(Number)
      const date = new Date(year, month - 1, 1)

      return {
        value,
        label: new Intl.DateTimeFormat('en-US', {
          month: 'long',
          year: 'numeric'
        }).format(date)
      }
    })
  }, [upcomingSource])

  const upcomingLocations = useMemo(
    () => Array.from(new Set(upcomingSource.map(event => event.location))).sort((a, b) => a.localeCompare(b)),
    [upcomingSource]
  )

  const upcoming = useMemo(() => {
    return upcomingSource
      .filter(event => {
        if (selectedType !== 'All' && event.category !== selectedType) return false
        if (locationFilter !== 'all' && event.location !== locationFilter) return false
        if (dateFilter !== 'all' && event.monthKey !== dateFilter) return false

        return true
      })
      .slice(0, 4)
  }, [dateFilter, locationFilter, selectedType, upcomingSource])

  return (
    <Box
      sx={{
        bgcolor: theme => theme.palette.mode === 'dark' ? 'background.default' : '#fff',
        color: 'text.primary',
        overflowX: 'clip',
        '@keyframes ecosystemMarquee': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' }
        }
      }}
    >
      <Box
        component='section'
        sx={{
          minHeight: { xs: 'auto', lg: 'clamp(600px, 74vh, 740px)' },
          boxSizing: 'border-box',
          px: { xs: 2.5, sm: 3.5, lg: 4 },
          py: { xs: 6, sm: 7, md: 8, lg: 7 },
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1600,
            mx: 'auto',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,.82fr) minmax(0,1.18fr)' },
            alignItems: 'center',
            gap: { xs: 4.5, lg: 5.5 }
          }}
        >
          <Box sx={{ maxWidth: 560, transform: { lg: 'translateY(-24px)' } }}>
            <Typography sx={{ color: '#00A7E1', fontSize: '0.72rem', fontWeight: 850, letterSpacing: '.08em' }}>
              PERTAMINA EVENT
            </Typography>
            <Typography
              component='h1'
              sx={{
                mt: 1.6,
                maxWidth: 520,
                fontSize: { xs: '2.45rem', sm: '2.95rem', lg: '3.35rem' },
                lineHeight: 1.01,
                letterSpacing: '-.04em',
                color: theme => theme.palette.mode === 'dark' ? '#F4F7FB' : '#07172B',
                fontWeight: 900
              }}
            >
              Find your next Pertamina experience.
            </Typography>
            <Typography color='text.secondary' sx={{ mt: 2, maxWidth: 545, fontSize: { xs: '0.98rem', md: '1.08rem', lg: '1.12rem' }, lineHeight: 1.58 }}>
              From inspiring talks to unforgettable performances, explore events, workshops, and experiences that bring people, ideas, and communities together.
            </Typography>
            <Button
              component={Link}
              href='#upcoming-events'
              variant='contained'
              endIcon={<i className='tabler-arrow-right text-sm' aria-hidden='true' />}
              sx={{ mt: 3.6, minHeight: 50, px: 3.2, fontSize: '0.84rem', fontWeight: 750, borderRadius: 1.25, bgcolor: '#07172B', color: '#fff', '&:hover': { bgcolor: '#0B2748' } }}
            >
              Explore events
            </Button>
          </Box>

          <HomeHeroMediaPlayer />
        </Box>
      </Box>

      <Box
        id='upcoming-events'
        component='section'
        sx={{
          px: { xs: 2.5, sm: 3.5, lg: 4 },
          py: { xs: 5.5, md: 6.5 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          scrollMarginTop: { xs: '72px', md: '80px' }
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 1440, mx: 'auto' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: 'auto minmax(0,1fr) auto' },
              alignItems: { lg: 'center' },
              gap: { xs: 2.25, lg: 2.5 }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap' }}>
              <Typography component='h2' sx={{ fontSize: { xs: '1.55rem', md: '1.75rem' }, fontWeight: 850, letterSpacing: '-.025em' }}>
                Upcoming events
              </Typography>
              <Button
                component={Link}
                href='#event-categories'
                variant='text'
                endIcon={<i className='tabler-arrow-right text-xs' aria-hidden='true' />}
                sx={{ p: 0, minWidth: 0, fontSize: '0.76rem', fontWeight: 750 }}
              >
                View all events
              </Button>
            </Box>

            {figmaUpcomingTypes.length > 1 ? (
              <Box
                role='group'
                aria-label='Filter events by type'
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: { xs: 'flex-start', lg: 'center' },
                  gap: 0.65,
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': { display: 'none' }
                }}
              >
                {figmaUpcomingTypes.map(type => {
                  const active = selectedType === type

                  return (
                    <Button
                      key={type}
                      aria-pressed={active}
                      variant='text'
                      onClick={() => setSelectedType(type)}
                      sx={{
                        flexShrink: 0,
                        minHeight: 36,
                        minWidth: 0,
                        px: active ? 1.6 : 1.05,
                        borderRadius: 999,
                        bgcolor: active ? '#07172B' : 'transparent',
                        color: active ? '#fff' : 'text.secondary',
                        fontSize: '0.8rem',
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

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, justifyContent: { lg: 'flex-end' } }}>
              <FormControl size='small' sx={{ flex: { xs: 1, sm: '0 1 auto' }, minWidth: 0, width: { sm: 150 } }}>
                <Select
                  value={dateFilter}
                  onChange={event => setDateFilter(String(event.target.value))}
                  inputProps={{ 'aria-label': 'Filter by event month' }}
                  startAdornment={
                    <InputAdornment position='start' sx={{ mr: 0.3, color: 'text.secondary' }}>
                      <i className='tabler-calendar-event text-sm' aria-hidden='true' />
                    </InputAdornment>
                  }
                  sx={{
                    height: 38,
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    fontSize: '0.78rem',
                    '& .MuiSelect-select': { py: 0.75, pl: 0, minWidth: 0, textOverflow: 'ellipsis' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }
                  }}
                >
                  <MenuItem value='all'>Any date</MenuItem>
                  {upcomingMonths.map(month => (
                    <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size='small' sx={{ flex: { xs: 1, sm: '0 1 auto' }, minWidth: 0, width: { sm: 160 } }}>
                <Select
                  value={locationFilter}
                  onChange={event => setLocationFilter(String(event.target.value))}
                  inputProps={{ 'aria-label': 'Filter by event location' }}
                  startAdornment={
                    <InputAdornment position='start' sx={{ mr: 0.3, color: 'text.secondary' }}>
                      <i className='tabler-map-pin text-sm' aria-hidden='true' />
                    </InputAdornment>
                  }
                  sx={{
                    height: 38,
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    fontSize: '0.78rem',
                    '& .MuiSelect-select': { py: 0.75, pl: 0, minWidth: 0, textOverflow: 'ellipsis' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' }
                  }}
                >
                  <MenuItem value='all'>All locations</MenuItem>
                  {upcomingLocations.map(location => <MenuItem key={location} value={location}>{location}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {upcoming.length === 0 ? (
            <Box sx={{ mt: 3, py: 5, borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography fontWeight={800}>No events match these filters.</Typography>
              <Typography color='text.secondary' sx={{ mt: 0.6, fontSize: '0.85rem' }}>
                Try another category, month, or location.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                mt: { xs: 2.75, md: 3.1 },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))', lg: 'repeat(4,minmax(0,1fr))' },
                gap: { xs: 1.75, lg: 2.25 }
              }}
            >
              {upcoming.map(event => <FigmaUpcomingCard key={event.id} event={event} />)}
            </Box>
          )}
        </Box>
      </Box>

      {happening && (
        <Box
          component='section'
          aria-label="What's happening"
          sx={{
            px: { xs: 2.5, sm: 3.5, lg: 4 },
            py: { xs: 6, md: 7.5, xl: 8 },
            bgcolor: theme => theme.palette.mode === 'dark' ? '#0B1726' : '#F5F8FB',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 1600,
              mx: 'auto',
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0,1fr)',
                md: 'minmax(0,1.08fr) minmax(0,.92fr)',
                xl: happeningSide.length > 0
                  ? 'minmax(0,1.4fr) minmax(0,1fr) minmax(235px,.65fr)'
                  : 'minmax(0,1.1fr) minmax(0,1fr)'
              },
              columnGap: { md: 4.5, xl: 5.5 },
              rowGap: { xs: 3, md: 4 },
              alignItems: 'center'
            }}
          >
            <Box
              sx={{
                position: 'relative',
                overflow: 'hidden',
                aspectRatio: '16 / 10',
                borderRadius: 2,
                bgcolor: 'action.hover'
              }}
            >
              <Box
                component='img'
                src={eventImage(happening)}
                alt={happening.name}
                loading='lazy'
                sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  left: { xs: 14, md: 20 },
                  bottom: { xs: 14, md: 20 },
                  width: { xs: 136, md: 154 },
                  height: { xs: 45, md: 48 },
                  px: 1.4,
                  py: 1,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 1.25,
                  bgcolor: '#fff',
                  boxShadow: '0 5px 16px rgba(7,23,43,.12)'
                }}
              >
                <Box component='img' src='/EO%20Navbar.png' alt='Pertamina Event' sx={{ display: 'block', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </Box>
            </Box>

            <Box sx={{ minWidth: 0, maxWidth: { xl: 470 } }}>
              <Typography sx={{ color: '#00A7E1', fontSize: '0.74rem', fontWeight: 850, letterSpacing: '.085em' }}>
                WHAT&apos;S HAPPENING
              </Typography>
              <Typography
                component='h2'
                sx={{
                  mt: 1.9,
                  fontSize: { xs: '1.75rem', md: '1.9rem', xl: '2.05rem' },
                  lineHeight: 1.14,
                  fontWeight: 850,
                  letterSpacing: '-.035em'
                }}
              >
                {happening.name}
              </Typography>
              <Typography
                color='text.secondary'
                sx={{
                  mt: 1.75,
                  fontSize: { xs: '0.92rem', md: '1rem' },
                  lineHeight: 1.58,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 4
                }}
              >
                {happening.description || happening.about || 'Open the event page for the latest schedule, venue, and registration information.'}
              </Typography>
              <Button
                component={Link}
                href={'/events/' + encodeURIComponent(happening.slug)}
                variant='text'
                endIcon={<i className='tabler-arrow-right text-sm' aria-hidden='true' />}
                sx={{ mt: 2.7, px: 0, fontWeight: 800, fontSize: '0.87rem', textTransform: 'none' }}
              >
                Learn more
              </Button>
            </Box>

            {happeningSide.length > 0 && (
              <Box
                component='nav'
                aria-label='More upcoming events'
                sx={{
                  gridColumn: { md: '1 / -1', xl: 'auto' },
                  minWidth: 0,
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,minmax(0,1fr))', xl: '1fr' },
                  gap: { xs: 1.5, sm: 2, xl: 3 }
                }}
              >
                {happeningSide.map(event => (
                  <Box
                    key={event.id}
                    component={Link}
                    href={'/events/' + encodeURIComponent(event.slug)}
                    aria-label={`Read more about ${event.name}`}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '64px minmax(0,1fr)',
                      gap: 1.5,
                      minWidth: 0,
                      color: 'text.primary',
                      textDecoration: 'none',
                      alignItems: 'center',
                      '&:hover h3': { color: 'primary.main' },
                      '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 4, borderRadius: 1 }
                    }}
                  >
                    <Box
                      component='img'
                      src={eventImage(event)}
                      alt=''
                      loading='lazy'
                      sx={{ display: 'block', width: 64, height: 64, objectFit: 'cover', borderRadius: 1.5, bgcolor: 'action.hover' }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        component='h3'
                        sx={{
                          fontSize: { xs: '0.88rem', xl: '0.82rem' },
                          lineHeight: 1.35,
                          fontWeight: 800,
                          transition: 'color .15s ease',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2
                        }}
                      >
                        {event.name}
                      </Typography>
                      <Typography color='text.secondary' sx={{ mt: 0.4, fontSize: '0.72rem', lineHeight: 1.35 }}>
                        {formatDate(event.startDate)}
                      </Typography>
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
                sx={theme => ({
                  position: 'relative',
                  isolation: 'isolate',
                  minHeight: { xs: 50, md: 54 },
                  px: { xs: 1.25, md: 1.5 },
                  py: { xs: 1.35, md: 1.5 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  overflow: 'hidden',
                  color: 'text.primary',
                  textDecoration: 'none',
                  fontSize: { xs: '0.9rem', md: '0.96rem' },
                  fontWeight: 850,
                  transition: theme.transitions.create(['color', 'transform'], {
                    duration: theme.transitions.duration.shorter
                  }),
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    zIndex: -1,
                    insetInline: 0,
                    bottom: 0,
                    height: 2,
                    bgcolor: category.accent,
                    transition: theme.transitions.create('height', {
                      duration: theme.transitions.duration.shorter
                    })
                  },
                  '& i': {
                    flexShrink: 0,
                    transition: theme.transitions.create('transform', {
                      duration: theme.transitions.duration.shorter
                    })
                  },
                  '&:hover, &:focus-visible': {
                    color: category.foreground,
                    '&::before': {
                      height: '100%'
                    },
                    '& i': {
                      transform: 'rotate(-45deg)'
                    }
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${category.accent}`,
                    outlineOffset: 2
                  },
                  '&:active': {
                    color: category.foreground,
                    transform: 'scale(.99)',
                    '&::before': {
                      height: '100%'
                    },
                    '& i': {
                      transform: 'rotate(-45deg)'
                    }
                  }
                })}
              >
                <Box component='span' sx={{ position: 'relative', zIndex: 1 }}>
                  {category.label}
                </Box>
                <i className='tabler-arrow-right text-sm' aria-hidden='true' />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box
        component='section'
        aria-label='Pertamina ecosystem partners'
        sx={{
          px: { xs: 2.5, sm: 3.5, lg: 4 },
          py: { xs: 4.5, md: 5 },
          bgcolor: theme => theme.palette.mode === 'dark' ? '#0B1726' : '#F7F9FB'
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1440,
            mx: 'auto',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '280px minmax(0,1fr)' },
            gap: { xs: 2.5, lg: 4 },
            alignItems: 'center'
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '0.92rem', fontWeight: 850 }}>
              Pertamina ecosystem
            </Typography>
            <Typography color='text.secondary' sx={{ mt: 0.45, maxWidth: 250, fontSize: '0.74rem', lineHeight: 1.55 }}>
              Partners and brand ecosystem supporting Pertamina Event experiences.
            </Typography>
          </Box>

          <Box
            sx={{
              overflow: 'hidden',
              maskImage: 'linear-gradient(to right,transparent,#000 7%,#000 93%,transparent)',
              WebkitMaskImage: 'linear-gradient(to right,transparent,#000 7%,#000 93%,transparent)'
            }}
          >
            <Box
              sx={{
                display: 'flex',
                width: 'max-content',
                animation: 'ecosystemMarquee 22s linear infinite',
                '@media (prefers-reduced-motion: reduce)': {
                  animation: 'none',
                  transform: 'translateX(0)'
                },
                '&:hover': {
                  animationPlayState: 'paused'
                }
              }}
            >
              {[0, 1, 2, 3].map(group => (
                <Box
                  key={group}
                  aria-hidden={group > 0}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: { xs: 4, md: 6 },
                    pr: { xs: 4, md: 6 }
                  }}
                >
                  {ecosystemLogos.map(partner => (
                    <Box
                      key={partner.name}
                      sx={{
                        width: { xs: 150, md: 190 },
                        height: 58,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Box
                        component='img'
                        src={partner.src}
                        alt={group === 0 ? partner.name : ''}
                        sx={{
                          display: 'block',
                          maxWidth: '86%',
                          maxHeight: 42,
                          objectFit: 'contain'
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default PublicHomePage
