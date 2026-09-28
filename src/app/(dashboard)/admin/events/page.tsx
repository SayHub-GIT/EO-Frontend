'use client'

import { useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { EVENT_KINDS, listAdminEvents, type AdminEvent, type EventKind } from '@/lib/admin-events'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'

type StatusFilter = 'All' | 'Draft' | 'Published'
type CategoryFilter = 'All' | EventKind

const formatDateRange = (startValue: string, endValue: string) => {
  const formatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const start = new Date(startValue)
  const end = new Date(endValue)

  if (Number.isNaN(start.getTime())) return 'Date to be announced'

  const startLabel = formatter.format(start)
  const endLabel = Number.isNaN(end.getTime()) ? '' : formatter.format(end)

  return endLabel && endLabel !== startLabel ? `${startLabel} – ${endLabel}` : startLabel
}

const registrationState = (event: AdminEvent) => {
  if (event.status === 'Draft') return 'Not public'

  const now = Date.now()
  const open = new Date(event.registrationOpenAtUtc).getTime()
  const close = new Date(event.registrationCloseAtUtc).getTime()
  const start = new Date(event.startAtUtc).getTime()
  const end = new Date(event.endAtUtc).getTime()

  if (now < open) return 'Registration not open'
  if (now <= close) return 'Registration open'
  if (now < start) return 'Registration closed'
  if (now <= end) return 'Event ongoing'
  return 'Event finished'
}

const EventListPage = () => {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('All')
  const [category, setCategory] = useState<CategoryFilter>('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const createAccess = usePermissionAccess('event.create')
  const updateAccess = usePermissionAccess('event.update')

  const loadEvents = async () => {
    setLoading(true)
    setError(null)

    try {
      setEvents(await listAdminEvents())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load events.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [])

  const activeEvents = useMemo(() => events.filter(event => event.status !== 'Archived'), [events])

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return activeEvents.filter(event => {
      if (status !== 'All' && event.status !== status) return false
      if (category !== 'All' && event.kind !== category) return false
      if (!keyword) return true

      return [event.name, event.kind, event.location]
        .filter(Boolean)
        .some(value => value?.toLowerCase().includes(keyword))
    })
  }, [activeEvents, category, search, status])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 3 }}>
        <Box>
          <Typography variant='h4' fontWeight={700}>Event Management</Typography>
          <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
            Create events and jump directly into each event workspace, dashboard, editor, or public page.
          </Typography>
        </Box>

        <Button component={Link} href='/admin/events/create' variant='contained' disabled={!createAccess.allowed} startIcon={<i className='tabler-calendar-plus ' />} sx={{ alignSelf: { xs: 'flex-start', md: 'auto' }, borderRadius: 1 }}>
          Create Event
        </Button>
      </Box>

      <Card elevation={0}>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
              <Box>
                <Typography variant='h6' fontWeight={600}>Active events</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                  {loading ? 'Loading events…' : `${filteredEvents.length} event${filteredEvents.length === 1 ? '' : 's'} found`}
                </Typography>
              </Box>
              <Button variant='text' onClick={() => void loadEvents()} disabled={loading} startIcon={<i className='tabler-refresh' />}>Refresh</Button>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '180px 210px minmax(260px, 1fr)' }, gap: 2 }}>
              <FormControl size='small'>
                <InputLabel id='status-filter-label'>Status</InputLabel>
                <Select labelId='status-filter-label' label='Status' value={status} onChange={event => setStatus(event.target.value as StatusFilter)}>
                  <MenuItem value='All'>All statuses</MenuItem>
                  <MenuItem value='Draft'>Draft</MenuItem>
                  <MenuItem value='Published'>Published</MenuItem>
                </Select>
              </FormControl>

              <FormControl size='small'>
                <InputLabel id='category-filter-label'>Category</InputLabel>
                <Select labelId='category-filter-label' label='Category' value={category} onChange={event => setCategory(event.target.value as CategoryFilter)}>
                  <MenuItem value='All'>All categories</MenuItem>
                  {EVENT_KINDS.map(kind => <MenuItem value={kind} key={kind}>{kind}</MenuItem>)}
                </Select>
              </FormControl>

              <TextField
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder='Search events'
                size='small'
                slotProps={{ input: { startAdornment: <InputAdornment position='start'><i className='tabler-search' /></InputAdornment> } }}
              />
            </Box>
          </Box>
        </CardContent>

        <Divider />

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 10 }}>
            <CircularProgress size={32} />
            <Typography variant='body2' color='text.secondary'>Loading events…</Typography>
          </Box>
        )}

        {!loading && error && (
          <Box sx={{ p: { xs: 3, sm: 4 } }}>
            <Alert severity='error' action={<Button color='inherit' size='small' onClick={() => void loadEvents()}>Retry</Button>}>{error}</Alert>
          </Box>
        )}

        {!loading && !error && filteredEvents.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2, py: 10, px: 3 }}>
            <i className='tabler-calendar-off text-4xl' />
            <Typography variant='h6' fontWeight={600}>{activeEvents.length === 0 ? 'No active events yet' : 'No matching events'}</Typography>
            <Typography variant='body2' color='text.secondary'>{activeEvents.length === 0 ? 'Create your first event as a draft.' : 'Try changing the status, category, or search filter.'}</Typography>
            {activeEvents.length === 0 && <Button component={Link} href='/admin/events/create' variant='outlined' disabled={!createAccess.allowed}>Create Event</Button>}
          </Box>
        )}

        {!loading && !error && filteredEvents.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 3, p: { xs: 3, sm: 4 } }}>
            {filteredEvents.map(event => {
              const base = `/admin/events/${encodeURIComponent(event.id)}`
              const regState = registrationState(event)

              return (
                <Card key={event.id} variant='outlined' sx={{ display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                      <Box>
                        <Typography variant='h6' fontWeight={600}>{event.name}</Typography>
                        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>{event.kind}</Typography>
                      </Box>
                      <Chip label={event.status} color={event.status === 'Published' ? 'success' : 'default'} size='small' />
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    <Box sx={{ display: 'grid', gap: 1.5 }}>
                      <Typography variant='body2' color='text.secondary' sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><i className='tabler-map-pin' /> {event.location || 'Location to be announced'}</Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><i className='tabler-calendar' /> {formatDateRange(event.startAtUtc, event.endAtUtc)}</Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><i className='tabler-users' /> Capacity {event.capacity.toLocaleString()} · {event.remainingQuota.toLocaleString()} remaining</Typography>
                    </Box>

                    <Chip label={regState} color={regState === 'Registration open' ? 'primary' : 'default'} variant='outlined' size='small' sx={{ mt: 3 }} />
                  </CardContent>

                  <Divider />
                  <CardActions sx={{ px: 2, py: 2, display: 'flex', flexWrap: 'wrap', gap: .5 }}>
                    <Button component={Link} href={`${base}/dashboard`} variant='contained' size='small' startIcon={<i className='tabler-layout-dashboard' />}>Dashboard</Button>
                    <Button component={Link} href={base} size='small' startIcon={<i className='tabler-apps' />}>Workspace</Button>
                    <Button component={Link} href={`${base}/edit`} size='small' disabled={!updateAccess.allowed} startIcon={<i className='tabler-edit' />}>Edit</Button>
                    {event.status === 'Published' && (
                      <Button component={Link} href={`/events/${encodeURIComponent(event.slug)}`} target='_blank' size='small' startIcon={<i className='tabler-external-link' />}>Public</Button>
                    )}
                  </CardActions>
                </Card>
              )
            })}
          </Box>
        )}
      </Card>
    </Box>
  )
}

export default EventListPage
