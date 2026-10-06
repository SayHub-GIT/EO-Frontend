
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Select from '@mui/material/Select'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { getPublicEvents, type PublicEvent } from '@/lib/api'

const categoryMap = {
  running: {
    backend: 'Running',
    title: 'Running',
    eyebrow: 'EVENT CATEGORY',
    icon: 'tabler-run',
    background: '/runn.png',
    description:
      'Rasakan semangat, tantangan, dan kebersamaan di setiap langkah. Temukan berbagai event lari yang kami hadirkan untuk semua level.'
  },
  seminar: {
    backend: 'Seminar',
    title: 'Seminar',
    eyebrow: 'EVENT CATEGORY',
    icon: 'tabler-microphone',
    background: '/seminar.png',
    description:
      'Temukan forum, talk, dan sesi berbagi pengetahuan yang mempertemukan gagasan, pengalaman, dan kolaborasi.'
  },
  workshop: {
    backend: 'Workshop',
    title: 'Workshop',
    eyebrow: 'EVENT CATEGORY',
    icon: 'tabler-tool',
    background: '/workshop.png',
    description:
      'Ikuti pengalaman belajar praktis melalui workshop dan sesi hands-on yang dirancang untuk memperkuat keterampilan.'
  },
  other: {
    backend: 'Other',
    title: 'Other Events',
    eyebrow: 'EVENT CATEGORY',
    icon: 'tabler-calendar-event',
    background: '/others.png',
    description:
      'Jelajahi program dan pengalaman Pertamina Event lainnya yang tidak masuk ke kategori utama.'
  }
} as const

type CategoryKey = keyof typeof categoryMap
type ViewMode = 'grid' | 'list'
type SortMode = 'nearest' | 'latest' | 'name' | 'price-low' | 'price-high'
type PriceFilter = 'all' | 'free' | 'paid'
type StatusFilter = 'all' | 'open' | 'upcoming' | 'closed'
type DateFilter = 'all' | '30' | '90'

const parseDate = (value?: string) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const eventLocation = (event: PublicEvent) =>
  event.location ||
  event.venue ||
  event.city ||
  event.venueAddress ||
  'Location to be announced'

const eventImage = (event: PublicEvent, fallback: string) =>
  event.heroImageUrl || event.imageUrl || fallback

const formatPrice = (price?: number) => {
  if (typeof price !== 'number') return 'Price TBA'
  if (price === 0) return 'Free'

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(price)
}

const formatDateParts = (value?: string) => {
  const date = parseDate(value)

  if (!date) {
    return { day: '--', month: 'TBA', year: '' }
  }

  return {
    day: new Intl.DateTimeFormat('en-GB', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('en-GB', { month: 'short' })
      .format(date)
      .toUpperCase(),
    year: new Intl.DateTimeFormat('en-GB', { year: 'numeric' }).format(date)
  }
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

const registrationState = (event: PublicEvent): Exclude<StatusFilter, 'all'> => {
  const raw = event.registrationStatus?.trim().toLowerCase().replace(/[\s_-]/g, '') ?? ''

  if (['open', 'openregistration', 'registrationopen', 'available'].includes(raw)) {
    return 'open'
  }

  if (['closed', 'registrationclosed', 'soldout', 'full', 'ended'].includes(raw)) {
    return 'closed'
  }

  return 'upcoming'
}

const statusLabel = (event: PublicEvent) => {
  const state = registrationState(event)

  if (state === 'open') return 'Open Registration'
  if (state === 'closed') return 'Registration Closed'

  return 'Coming Soon'
}

const statusStyles = (event: PublicEvent) => {
  const state = registrationState(event)

  if (state === 'open') {
    return { bgcolor: '#17B978', color: '#fff' }
  }

  if (state === 'closed') {
    return { bgcolor: '#07172B', color: '#fff' }
  }

  return { bgcolor: '#0073C7', color: '#fff' }
}

const EventResultCard = ({
  event,
  fallbackImage,
  viewMode
}: {
  event: PublicEvent
  fallbackImage: string
  viewMode: ViewMode
}) => {
  const date = formatDateParts(event.startDate)
  const isOpen = registrationState(event) === 'open'

  if (viewMode === 'list') {
    return (
      <Box
        sx={theme => ({
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '220px minmax(0,1fr)' },
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper',
          transition: theme.transitions.create('border-color', {
            duration: theme.transitions.duration.shorter
          }),
          '&:hover': {
            borderColor: alpha(theme.palette.primary.main, 0.4)
          }
        })}
      >
        <Box sx={{ position: 'relative', minHeight: { xs: 200, sm: '100%' }, overflow: 'hidden' }}>
          <Box
            component='img'
            src={eventImage(event, fallbackImage)}
            alt=''
            sx={{ display: 'block', width: '100%', height: '100%', minHeight: 200, objectFit: 'cover' }}
          />
          <Typography
            component='span'
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              px: 1.1,
              py: 0.45,
              borderRadius: 999,
              fontSize: '0.68rem',
              fontWeight: 800,
              ...statusStyles(event)
            }}
          >
            {statusLabel(event)}
          </Typography>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '54px minmax(0,1fr)', gap: 1.5 }}>
            <Box>
              <Typography sx={{ fontSize: '1.35rem', lineHeight: 1, fontWeight: 900 }}>{date.day}</Typography>
              <Typography sx={{ mt: 0.35, fontSize: '0.66rem', color: 'text.secondary', fontWeight: 800 }}>
                {date.month}
              </Typography>
              {date.year && <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>{date.year}</Typography>}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography component='h2' sx={{ fontSize: '1.05rem', lineHeight: 1.35, fontWeight: 850 }}>
                {event.name}
              </Typography>
              <Typography color='text.secondary' sx={{ mt: 0.5, display: 'flex', gap: 0.6, alignItems: 'center', fontSize: '0.76rem' }}>
                <i className='tabler-map-pin text-sm' aria-hidden='true' />
                {eventLocation(event)}
              </Typography>
              <Typography color='text.secondary' sx={{ mt: 1.2, fontSize: '0.8rem', lineHeight: 1.6 }}>
                {event.description || event.about || 'Event details are available on the event page.'}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              mt: 'auto',
              pt: 2.25,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 700 }}>
              {formatPrice(event.price)}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {isOpen && (
                <Button
                  component={Link}
                  href={'/events/' + encodeURIComponent(event.slug) + '/register'}
                  size='small'
                  variant='outlined'
                  sx={{ minHeight: 38 }}
                >
                  Register
                </Button>
              )}
              <Button
                component={Link}
                href={'/events/' + encodeURIComponent(event.slug)}
                size='small'
                variant='text'
                endIcon={<i className='tabler-arrow-right' aria-hidden='true' />}
                sx={{ minHeight: 38, fontWeight: 800 }}
              >
                View details
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={theme => ({
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        transition: theme.transitions.create(['border-color', 'transform'], {
          duration: theme.transitions.duration.shorter
        }),
        '&:hover': {
          borderColor: alpha(theme.palette.primary.main, 0.4),
          transform: 'translateY(-2px)'
        }
      })}
    >
      <Box sx={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden', bgcolor: 'action.hover' }}>
        <Box
          component='img'
          src={eventImage(event, fallbackImage)}
          alt=''
          sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />

        <Typography
          component='span'
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            px: 1.1,
            py: 0.45,
            borderRadius: 999,
            fontSize: '0.68rem',
            fontWeight: 800,
            ...statusStyles(event)
          }}
        >
          {statusLabel(event)}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '50px minmax(0,1fr)', gap: 1.25, p: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '1.25rem', lineHeight: 1, fontWeight: 900 }}>{date.day}</Typography>
          <Typography sx={{ mt: 0.35, fontSize: '0.63rem', color: 'text.secondary', fontWeight: 800 }}>{date.month}</Typography>
          {date.year && <Typography sx={{ fontSize: '0.58rem', color: 'text.disabled' }}>{date.year}</Typography>}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography component='h2' sx={{ fontSize: '0.93rem', lineHeight: 1.35, fontWeight: 850 }}>
            {event.name}
          </Typography>
          <Typography color='text.secondary' sx={{ mt: 0.55, display: 'flex', gap: 0.5, alignItems: 'center', fontSize: '0.7rem' }}>
            <i className='tabler-map-pin text-sm' aria-hidden='true' />
            <Box component='span' sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {eventLocation(event)}
            </Box>
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 1.25 }}>
        <Typography color='text.secondary' sx={{ fontSize: '0.76rem', lineHeight: 1.58 }}>
          {event.description || event.about || 'Event details are available on the event page.'}
        </Typography>
      </Box>

      <Box sx={{ mt: 'auto', px: 2, pb: 1.8, pt: 0.75 }}>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 700 }}>
          {formatPrice(event.price)}
        </Typography>

        <Box sx={{ mt: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          {isOpen ? (
            <Button
              component={Link}
              href={'/events/' + encodeURIComponent(event.slug) + '/register'}
              size='small'
              variant='outlined'
              sx={{ minHeight: 36 }}
            >
              Register
            </Button>
          ) : (
            <Box />
          )}

          <Button
            component={Link}
            href={'/events/' + encodeURIComponent(event.slug)}
            size='small'
            variant='text'
            endIcon={<i className='tabler-arrow-right' aria-hidden='true' />}
            sx={{ minHeight: 36, px: 0.5, fontWeight: 800 }}
          >
            View details
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

const FilterPanel = ({
  dateFilter,
  setDateFilter,
  locationFilter,
  setLocationFilter,
  priceFilter,
  setPriceFilter,
  statusFilter,
  setStatusFilter,
  locations,
  onReset
}: {
  dateFilter: DateFilter
  setDateFilter: (value: DateFilter) => void
  locationFilter: string
  setLocationFilter: (value: string) => void
  priceFilter: PriceFilter
  setPriceFilter: (value: PriceFilter) => void
  statusFilter: StatusFilter
  setStatusFilter: (value: StatusFilter) => void
  locations: string[]
  onReset: () => void
}) => (
  <Box sx={{ p: 2.25 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
      <Typography sx={{ fontSize: '1rem', fontWeight: 850 }}>Filter</Typography>
      <Button variant='text' size='small' onClick={onReset} sx={{ minWidth: 0, px: 0.5, fontSize: '0.72rem', fontWeight: 800 }}>
        Reset all
      </Button>
    </Box>

    <Divider sx={{ my: 2 }} />

    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box>
        <Typography sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.78rem', fontWeight: 800 }}>
          <i className='tabler-calendar-event text-base' aria-hidden='true' />
          Date
        </Typography>
        <FormControl fullWidth size='small'>
          <Select value={dateFilter} onChange={event => setDateFilter(event.target.value as DateFilter)}>
            <MenuItem value='all'>Any date</MenuItem>
            <MenuItem value='30'>Next 30 days</MenuItem>
            <MenuItem value='90'>Next 90 days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box>
        <Typography sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.78rem', fontWeight: 800 }}>
          <i className='tabler-map-pin text-base' aria-hidden='true' />
          Location
        </Typography>
        <FormControl fullWidth size='small'>
          <Select value={locationFilter} onChange={event => setLocationFilter(String(event.target.value))}>
            <MenuItem value='all'>All locations</MenuItem>
            {locations.map(location => <MenuItem key={location} value={location}>{location}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <Box>
        <Typography sx={{ mb: 0.8, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.78rem', fontWeight: 800 }}>
          <i className='tabler-ticket text-base' aria-hidden='true' />
          Price
        </Typography>
        <RadioGroup
          value={priceFilter}
          onChange={event => setPriceFilter(event.target.value as PriceFilter)}
        >
          <FormControlLabel value='all' control={<Radio size='small' />} label={<Typography sx={{ fontSize: '0.78rem' }}>All price ranges</Typography>} />
          <FormControlLabel value='free' control={<Radio size='small' />} label={<Typography sx={{ fontSize: '0.78rem' }}>Free</Typography>} />
          <FormControlLabel value='paid' control={<Radio size='small' />} label={<Typography sx={{ fontSize: '0.78rem' }}>Paid</Typography>} />
        </RadioGroup>
      </Box>

      <Box>
        <Typography sx={{ mb: 0.8, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.78rem', fontWeight: 800 }}>
          <i className='tabler-circle-check text-base' aria-hidden='true' />
          Registration
        </Typography>

        <RadioGroup
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value as StatusFilter)}
        >
          <FormControlLabel
            value='all'
            control={<Radio size='small' />}
            label={<Typography sx={{ fontSize: '0.78rem' }}>All statuses</Typography>}
          />
          <FormControlLabel
            value='open'
            control={<Radio size='small' />}
            label={<Typography sx={{ fontSize: '0.78rem' }}>Open registration</Typography>}
          />
          <FormControlLabel
            value='upcoming'
            control={<Radio size='small' />}
            label={<Typography sx={{ fontSize: '0.78rem' }}>Coming soon</Typography>}
          />
          <FormControlLabel
            value='closed'
            control={<Radio size='small' />}
            label={<Typography sx={{ fontSize: '0.78rem' }}>Closed / sold out</Typography>}
          />
        </RadioGroup>
      </Box>
    </Box>
  </Box>
)

const PublicEventCategoryPage = () => {
  const params = useParams<{ kind: string }>()
  const categoryKey = params.kind.toLowerCase() as CategoryKey
  const category = categoryMap[categoryKey]

  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortMode, setSortMode] = useState<SortMode>('nearest')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  useEffect(() => {
    if (!category) {
      setLoading(false)
      return
    }

    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const result = await getPublicEvents(category.backend)

        if (active) setEvents(result)
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load events.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [category])

  const locations = useMemo(
    () =>
      Array.from(
        new Set(
          events
            .map(event => event.location || event.city || event.venue)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [events]
  )

  const filtered = useMemo(() => {
    const now = Date.now()

    const result = events.filter(event => {
      const location = event.location || event.city || event.venue

      if (locationFilter !== 'all' && location !== locationFilter) return false

      if (priceFilter === 'free' && event.price !== 0) return false
      if (priceFilter === 'paid' && (typeof event.price !== 'number' || event.price <= 0)) return false

      if (statusFilter !== 'all' && registrationState(event) !== statusFilter) return false

      if (dateFilter !== 'all') {
        const start = parseDate(event.startDate)?.getTime()
        if (!start) return false

        const days = dateFilter === '30' ? 30 : 90
        const horizon = days * 24 * 60 * 60 * 1000

        if (start < now || start > now + horizon) return false
      }

      return true
    })

    return result.sort((a, b) => {
      if (sortMode === 'latest') {
        return (parseDate(b.startDate)?.getTime() ?? 0) - (parseDate(a.startDate)?.getTime() ?? 0)
      }

      if (sortMode === 'name') {
        return a.name.localeCompare(b.name)
      }

      if (sortMode === 'price-low') {
        const aPrice = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY
        const bPrice = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY

        return aPrice - bPrice
      }

      if (sortMode === 'price-high') {
        const aPrice = typeof a.price === 'number' ? a.price : Number.NEGATIVE_INFINITY
        const bPrice = typeof b.price === 'number' ? b.price : Number.NEGATIVE_INFINITY

        return bPrice - aPrice
      }

      return (
        (parseDate(a.startDate)?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (parseDate(b.startDate)?.getTime() ?? Number.MAX_SAFE_INTEGER)
      )
    })
  }, [dateFilter, events, locationFilter, priceFilter, sortMode, statusFilter])

  const resetFilters = () => {
    setDateFilter('all')
    setLocationFilter('all')
    setPriceFilter('all')
    setStatusFilter('all')
  }

  if (!category) {
    return (
      <Box sx={{ px: 3, py: 10 }}>
        <Alert severity='warning' sx={{ maxWidth: 900, mx: 'auto' }}>
          Event category was not found.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ bgcolor: 'background.default', color: 'text.primary' }}>
      <Box
        component='section'
        sx={theme => ({
          minHeight: { xs: 300, md: 360 },
          px: { xs: 2.5, sm: 3.5, lg: 4 },
          py: { xs: 5, md: 6 },
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundImage: `linear-gradient(90deg, ${theme.palette.background.default} 0%, ${alpha(
            theme.palette.background.default,
            0.96
          )} 33%, ${alpha(theme.palette.background.default, 0.62)} 58%, ${alpha(
            theme.palette.background.default,
            0.08
          )} 100%), url('${category.background}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        })}
      >
        <Box sx={{ width: '100%', maxWidth: 1440, mx: 'auto' }}>
          <Box sx={{ maxWidth: 680 }}>
            <Typography sx={{ color: 'text.disabled', fontSize: '0.7rem', fontWeight: 850, letterSpacing: '.08em' }}>
              {category.eyebrow}
            </Typography>
            <Typography
              component='h1'
              sx={{
                mt: 1.1,
                fontSize: { xs: '2.45rem', sm: '3.15rem', md: '3.8rem' },
                lineHeight: 1,
                letterSpacing: '-.045em',
                fontWeight: 900
              }}
            >
              {category.title}
            </Typography>
            <Typography color='text.secondary' sx={{ mt: 1.6, maxWidth: 650, fontSize: { xs: '0.94rem', md: '1rem' }, lineHeight: 1.7 }}>
              {category.description}
            </Typography>

            <Box
              sx={{
                mt: 2.5,
                width: 'fit-content',
                minHeight: 38,
                px: 1.5,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 999,
                bgcolor: 'background.paper',
                fontSize: '0.78rem',
                fontWeight: 800
              }}
            >
              <i className={category.icon} aria-hidden='true' />
              {loading ? 'Loading events...' : `${events.length} Published Events`}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2.5, sm: 3.5, lg: 4 }, py: { xs: 4.5, md: 5.5 } }}>
        <Box
          sx={{
            width: '100%',
            maxWidth: 1440,
            mx: 'auto',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '260px minmax(0,1fr)' },
            gap: { xs: 3, lg: 3.5 }
          }}
        >
          <Box
            component='aside'
            sx={{
              display: { xs: 'none', lg: 'block' },
              alignSelf: 'start',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              position: 'sticky',
              top: 92
            }}
          >
            <FilterPanel
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              locationFilter={locationFilter}
              setLocationFilter={setLocationFilter}
              priceFilter={priceFilter}
              setPriceFilter={setPriceFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              locations={locations}
              onReset={resetFilters}
            />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { sm: 'center' },
                justifyContent: 'space-between',
                gap: 1.5
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Button
                  variant='outlined'
                  startIcon={<i className='tabler-adjustments-horizontal' aria-hidden='true' />}
                  onClick={() => setFilterDrawerOpen(true)}
                  sx={{ display: { xs: 'inline-flex', lg: 'none' }, minHeight: 40 }}
                >
                  Filter
                </Button>

                <Typography color='text.secondary' sx={{ fontSize: '0.78rem' }}>
                  Showing <Box component='strong' sx={{ color: 'text.primary' }}>{filtered.length}</Box> events
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormControl size='small' sx={{ minWidth: 150 }}>
                  <InputLabel id='event-sort-label'>Sort by</InputLabel>
                  <Select
                    labelId='event-sort-label'
                    label='Sort by'
                    value={sortMode}
                    onChange={event => setSortMode(event.target.value as SortMode)}
                  >
                    <MenuItem value='nearest'>Nearest date</MenuItem>
                    <MenuItem value='latest'>Latest date</MenuItem>
                    <MenuItem value='name'>Name A-Z</MenuItem>
                    <MenuItem value='price-low'>Lowest price</MenuItem>
                    <MenuItem value='price-high'>Highest price</MenuItem>
                  </Select>
                </FormControl>

                <ToggleButtonGroup
                  exclusive
                  value={viewMode}
                  onChange={(_, value: ViewMode | null) => {
                    if (value) setViewMode(value)
                  }}
                  aria-label='Event result view'
                  size='small'
                >
                  <ToggleButton value='grid' aria-label='Grid view'>
                    <i className='tabler-layout-grid' aria-hidden='true' />
                  </ToggleButton>
                  <ToggleButton value='list' aria-label='List view'>
                    <i className='tabler-list' aria-hidden='true' />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>

            {loading && (
              <Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <CircularProgress size={30} />
                  <Typography color='text.secondary' sx={{ mt: 1.5, fontSize: '0.82rem' }}>
                    Loading published events...
                  </Typography>
                </Box>
              </Box>
            )}

            {error && <Alert severity='error' sx={{ mt: 3 }}>{error}</Alert>}

            {!loading && !error && filtered.length === 0 && (
              <Box
                sx={{
                  mt: 3,
                  py: 7,
                  px: 2,
                  textAlign: 'center',
                  borderTop: '1px solid',
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    mx: 'auto',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    bgcolor: 'action.hover',
                    color: 'text.secondary'
                  }}
                >
                  <i className='tabler-calendar-off text-2xl' aria-hidden='true' />
                </Box>
                <Typography sx={{ mt: 2, fontWeight: 850 }}>No events match these filters.</Typography>
                <Typography color='text.secondary' sx={{ mt: 0.6, fontSize: '0.8rem' }}>
                  Reset the filters or choose another combination.
                </Typography>
                <Button variant='text' onClick={resetFilters} sx={{ mt: 1.5, fontWeight: 800 }}>
                  Reset filters
                </Button>
              </Box>
            )}

            {!loading && !error && filtered.length > 0 && (
              <Box
                sx={{
                  mt: 3,
                  display: 'grid',
                  gridTemplateColumns:
                    viewMode === 'grid'
                      ? { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))', xl: 'repeat(3,minmax(0,1fr))' }
                      : '1fr',
                  gap: 2
                }}
              >
                {filtered.map(event => (
                  <EventResultCard
                    key={event.id}
                    event={event}
                    fallbackImage={category.background}
                    viewMode={viewMode}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Drawer
        anchor='left'
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{ sx: { width: 'min(88vw, 340px)', bgcolor: 'background.paper' } }}
      >
        <Box sx={{ minHeight: 60, px: 2.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 850 }}>Filter events</Typography>
          <IconButton onClick={() => setFilterDrawerOpen(false)} aria-label='Close event filters'>
            <i className='tabler-x' />
          </IconButton>
        </Box>
        <Divider />
        <FilterPanel
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          locationFilter={locationFilter}
          setLocationFilter={setLocationFilter}
          priceFilter={priceFilter}
          setPriceFilter={setPriceFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          locations={locations}
          onReset={resetFilters}
        />
        <Box sx={{ px: 2.25, pb: 2.25 }}>
          <Button fullWidth variant='contained' onClick={() => setFilterDrawerOpen(false)} sx={{ minHeight: 44 }}>
            Show {filtered.length} events
          </Button>
        </Box>
      </Drawer>
    </Box>
  )
}

export default PublicEventCategoryPage
