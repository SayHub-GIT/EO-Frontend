'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { EVENT_KINDS, listAdminEvents, unarchiveAdminEvent, type AdminEvent, type EventKind } from '@/lib/admin-events'
import ConfirmActionDialog from '@/components/feedback/ConfirmActionDialog'

type CategoryFilter = 'All' | EventKind

const ArchivedEventsPage = () => {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('All')
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<AdminEvent | null>(null)
  const restoreLockRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      setEvents((await listAdminEvents()).filter(event => event.status === 'Archived'))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load archived events.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [])

  const handleUnarchive = async (eventId: string) => {
    if (restoringId || restoreLockRef.current) return
    restoreLockRef.current = true

    try {
      setRestoringId(eventId)
      setError(null)
      await unarchiveAdminEvent(eventId)
      setEvents(current => current.filter(event => event.id !== eventId))
      setRestoreTarget(null)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to unarchive event.')
    } finally {
      setRestoringId(null)
      restoreLockRef.current = false
    }
  }

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return events.filter(event => {
      if (category !== 'All' && event.kind !== category) return false
      if (!keyword) return true
      return [event.name, event.kind, event.location].filter(Boolean).some(value => value?.toLowerCase().includes(keyword))
    })
  }, [category, events, search])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <Box>
        <Typography variant='h4' fontWeight={700}>
          Archived Events
        </Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
          Review archived event history or restore an event as Draft when it needs to be used again.
        </Typography>
      </Box>

      <Card elevation={0}>
        <CardContent sx={{ display: 'grid', gap: 3, p: { xs: 3, sm: 4 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px minmax(260px, 1fr)' }, gap: 2 }}>
            <FormControl size='small'>
              <InputLabel id='archived-category-filter'>Category</InputLabel>
              <Select
                labelId='archived-category-filter'
                label='Category'
                value={category}
                onChange={event => setCategory(event.target.value as CategoryFilter)}
              >
                <MenuItem value='All'>All categories</MenuItem>
                {EVENT_KINDS.map(kind => (
                  <MenuItem key={kind} value={kind}>
                    {kind}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size='small'
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder='Search archived events'
              slotProps={{ input: { startAdornment: <InputAdornment position='start'><i className='tabler-search' /></InputAdornment> } }}
            />
          </Box>

          {loading && (
            <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={32} />
            </Box>
          )}

          {!loading && error && (
            <Alert severity='error' action={<Button onClick={loadEvents}>Retry</Button>}>
              {error}
            </Alert>
          )}

          {!loading && !error && filteredEvents.length === 0 && (
            <Box sx={{ py: 10, textAlign: 'center' }}>
              <i className='tabler-archive text-4xl' />
              <Typography variant='h6' sx={{ mt: 2 }}>
                No archived events
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                Archived events will appear here without deleting their registrations or package history.
              </Typography>
            </Box>
          )}

          {!loading && !error && filteredEvents.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 3 }}>
              {filteredEvents.map(event => (
                <Card key={event.id} variant='outlined'>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                      <Box>
                        <Typography variant='h6' fontWeight={700}>{event.name}</Typography>
                        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>{event.kind}</Typography>
                      </Box>
                      <Chip label='Archived' size='small' icon={<i className='tabler-archive' />} />
                    </Box>
                    <Box sx={{ display: 'grid', gap: 1, mt: 3 }}>
                      <Typography variant='body2' color='text.secondary'><i className='tabler-map-pin' /> {event.location || 'Location not set'}</Typography>
                      <Typography variant='body2' color='text.secondary'><i className='tabler-users' /> {event.registeredCount.toLocaleString()} registered</Typography>
                    </Box>
                  </CardContent>
                  <CardActions sx={{ gap: 1, flexWrap: 'wrap' }}>
                    <Button component={Link} href={`/admin/events/${encodeURIComponent(event.id)}`} endIcon={<i className='tabler-arrow-right' />}>
                      View Details
                    </Button>
                    <Button
                      variant='contained'
                      startIcon={<i className='tabler-archive-off' />}
                      disabled={restoringId === event.id}
                      onClick={() => setRestoreTarget(event)}
                    >
                      {restoringId === event.id ? 'Restoring...' : 'Unarchive'}
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
      <ConfirmActionDialog
        open={Boolean(restoreTarget)}
        title='Restore archived event?'
        description='The event will return as Draft. It remains hidden from public pages until it is reviewed and published again.'
        confirmLabel='Confirm Restore'
        destructive={false}
        loading={Boolean(restoreTarget && restoringId === restoreTarget.id)}
        onClose={() => {
          if (!restoringId) setRestoreTarget(null)
        }}
        onConfirm={async () => {
          if (!restoreTarget || restoringId || restoreLockRef.current) return
          await handleUnarchive(restoreTarget.id)
        }}
        details={restoreTarget ? [
          { label: 'Event', value: restoreTarget.name },
          { label: 'Current status', value: restoreTarget.status },
          { label: 'Restored status', value: 'Draft' }
        ] : []}
      />
    </Box>
  )
}

export default ArchivedEventsPage
