'use client'

import { useEffect, useMemo, useState } from 'react'
import NextLink from 'next/link'
import { useParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

import { getAdminEvent, getEventAttendanceMetrics, type AdminEvent, type EventAttendanceMetrics } from '@/lib/admin-events'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'
import {
  EVENT_MODULE_DEFINITIONS,
  getAdminEventExperience,
  type EventExperienceConfig,
  type EventModuleDefinition,
  type EventModuleKey
} from '@/lib/event-experience'

const routeForModule = (event: AdminEvent, module: EventModuleDefinition) => {
  const id = encodeURIComponent(event.id)

  switch (module.key) {
    case 'registration':
      return `/events/${encodeURIComponent(event.slug)}/register`
    case 'participants':
      return `/admin/events/${id}/registrations`
    case 'packages':
      return `/admin/events/${id}#event-packages`
    case 'checkins':
      return `/admin/check-ins?eventId=${id}`
    case 'quiz':
      return `/admin/events/${id}/quiz`
    default:
      return `/admin/events/${id}/modules/${encodeURIComponent(module.key)}`
  }
}

const isImplementedOperation = (key: EventModuleKey) =>
  ['registration', 'participants', 'packages', 'checkins', 'quiz'].includes(key)

const EventDashboardPage = () => {
  const params = useParams<{ eventSlug: string }>()
  const eventId = params.eventSlug
  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [experience, setExperience] = useState<EventExperienceConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const staffAccess = usePermissionAccess('roles.manage')
  const attendanceReadAccess = usePermissionAccess('registration.read')
  const [attendanceMetrics, setAttendanceMetrics] = useState<EventAttendanceMetrics | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const [loadedEvent, loadedExperience] = await Promise.all([
          getAdminEvent(eventId),
          getAdminEventExperience(eventId)
        ])
        if (!mounted) return
        setEvent(loadedEvent)
        setExperience(loadedExperience)
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load event dashboard.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    return () => { mounted = false }
  }, [eventId])

  useEffect(() => {
    let mounted = true
    setAttendanceMetrics(null)
    setAttendanceStatus('loading')

    void getEventAttendanceMetrics(eventId)
      .then(metrics => {
        if (!mounted) return
        setAttendanceMetrics(metrics)
        setAttendanceStatus('ready')
      })
      .catch(() => {
        if (!mounted) return
        setAttendanceMetrics(null)
        setAttendanceStatus('unavailable')
      })

    return () => { mounted = false }
  }, [eventId])

  const enabledModules = useMemo(() => {
    if (!experience) return []
    const enabled = new Set(experience.enabledModules)
    return EVENT_MODULE_DEFINITIONS.filter(module => enabled.has(module.key))
  }, [experience])

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress size={32} /></Box>
  }

  if (!event || !experience) {
    return <Alert severity='error'>{error ?? 'Event dashboard is unavailable.'}</Alert>
  }

  const remaining = Math.max(0, event.remainingQuota)
  const registrationPercent = event.capacity > 0
    ? Math.min(100, Math.round((event.registeredCount / event.capacity) * 100))
    : 0

  const attendanceCards = [
    { label: 'Active participants', count: attendanceMetrics?.totalParticipants, hint: 'Registered, checked in, or completed' },
    { label: 'Checked in', count: attendanceMetrics?.checkedIn, hint: 'Participants who have arrived' },
    { label: 'Awaiting check-in', count: attendanceMetrics?.notCheckedIn, hint: 'Active participants yet to arrive' },
    { label: 'Currently on site', count: attendanceMetrics?.currentlyOnSite, hint: `${attendanceMetrics?.checkedOut.toLocaleString() ?? '—'} checked out` }
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4.5 }}>
      <Box>

        {error && <Alert severity='error' sx={{ mb: 3 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', gap: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant='h4' fontWeight={750}>{event.name}</Typography>
              <Chip label={experience.kind} color='primary' variant='tonal' size='small' />
              <Chip label={event.status} color={event.status === 'Published' ? 'success' : 'default'} variant='tonal' size='small' />
            </Box>
            <Typography color='text.secondary' sx={{ mt: 1, maxWidth: 760 }}>
              This workspace is generated from the modules enabled for this event. Change the event configuration any time while it is not archived.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignSelf: { xs: 'flex-start', lg: 'center' } }}>
            {staffAccess.allowed && staffAccess.session?.role.toLowerCase() === 'admin' && (
              <Button component={NextLink} href={`/admin/events/${encodeURIComponent(event.id)}/staff-access`} variant='outlined' startIcon={<i className='tabler-users-group' />}>
                Event Staff Access
              </Button>
            )}
          
            {event.status !== 'Archived' && event.kind !== 'Workshop' && event.kind !== 'Other' && (
              <Button component={NextLink} href={`/admin/events/${encodeURIComponent(event.id)}/edit`} variant='contained' startIcon={<i className='tabler-adjustments' />}>
                Configure modules
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2.5 }}>
        <Card variant='outlined'>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>Registered</Typography>
            <Typography variant='h4' fontWeight={750} sx={{ mt: 1 }}>{event.registeredCount.toLocaleString()}</Typography>
            <Typography variant='caption' color='text.secondary'>of {event.capacity.toLocaleString()} capacity</Typography>
            <LinearProgress variant='determinate' value={registrationPercent} sx={{ mt: 2.5, borderRadius: 10 }} />
          </CardContent>
        </Card>
        <Card variant='outlined'>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>Remaining quota</Typography>
            <Typography variant='h4' fontWeight={750} sx={{ mt: 1 }}>{remaining.toLocaleString()}</Typography>
            <Typography variant='caption' color='text.secondary'>seat(s) still available</Typography>
          </CardContent>
        </Card>
        <Card variant='outlined'>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>Enabled modules</Typography>
            <Typography variant='h4' fontWeight={750} sx={{ mt: 1 }}>{enabledModules.length}</Typography>
            <Typography variant='caption' color='text.secondary'>active workspace capabilities</Typography>
          </CardContent>
        </Card>
        <Card variant='outlined'>
          <CardContent>
            <Typography variant='body2' color='text.secondary'>Registration fields</Typography>
            <Typography variant='h4' fontWeight={750} sx={{ mt: 1 }}>{experience.registrationFields.length + 3}</Typography>
            <Typography variant='caption' color='text.secondary'>3 core + {experience.registrationFields.length} event-specific</Typography>
          </CardContent>
        </Card>
      </Box>

      <Box component='section' aria-labelledby='attendance-overview-heading' sx={{ display: 'grid', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <Box>
            <Typography id='attendance-overview-heading' variant='h5' fontWeight={700}>Attendance overview</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
              Live event registration and check-in statistics.
            </Typography>
          </Box>
          {attendanceReadAccess.allowed && (
            <Button variant='outlined' component={NextLink} href={`/admin/events/${encodeURIComponent(eventId)}/attendance`}>
              Lihat List Attendance
            </Button>
          )}
        </Box>
        {attendanceStatus === 'unavailable' && (
          <Alert severity='info' role='status'>
            Attendance data is unavailable. Check your registration-read permission or try again later.
          </Alert>
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 2.5 }}>
          {attendanceCards.map(card => (
            <Card key={card.label} variant='outlined'>
              <CardContent sx={{ display: 'grid', gap: 1.25 }}>
                <Typography variant='body2' color='text.secondary'>{card.label}</Typography>
                <Typography variant='h4' fontWeight={750} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {card.count === undefined ? '—' : card.count.toLocaleString()}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {attendanceStatus === 'loading' ? 'Loading live statistics...' : card.hint}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      <Box>
        <Typography variant='h5' fontWeight={700}>Event operations</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
          Only modules enabled for this {experience.kind} event appear here.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2.5 }}>
        {enabledModules.map(module => {
          const implemented = isImplementedOperation(module.key)
          return (
            <Card key={module.key} variant='outlined' sx={{ height: '100%' }}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: 'action.hover', color: 'primary.main', display: 'grid', placeItems: 'center' }}>
                    <i className={`${module.icon} text-2xl`} />
                  </Box>
                  <Chip
                    size='small'
                    label={implemented ? 'Operational' : 'Configured'}
                    color={implemented ? 'success' : 'primary'}
                    variant='tonal'
                  />
                </Box>

                <Box>
                  <Typography variant='h6' fontWeight={700}>{module.label}</Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75, lineHeight: 1.65 }}>
                    {module.description}
                  </Typography>
                </Box>

                <Button
                  component={NextLink}
                  href={routeForModule(event, module)}
                  target={module.key === 'registration' ? '_blank' : undefined}
                  variant={implemented ? 'contained' : 'outlined'}
                  endIcon={<i className='tabler-arrow-right' />}
                  sx={{ mt: 'auto', alignSelf: 'flex-start' }}
                >
                  {implemented ? 'Open module' : 'Open workspace'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </Box>
    </Box>
  )
}

export default EventDashboardPage
