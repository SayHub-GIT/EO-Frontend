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
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import {
  getAdminDashboardAnalytics,
  type DashboardAnalytics,
  type DashboardPeriod,
  type DashboardTrendDay
} from '@/lib/dashboard-analytics'

const number = (value: number) => new Intl.NumberFormat('id-ID').format(value)
const percent = (part: number, total: number) =>
  total > 0 ? Math.min(100, Math.max(0, Math.round((part / total) * 100))) : 0

type Metric = {
  title: string
  value: number
  hint: string
  icon: string
  tone: 'primary' | 'success' | 'info' | 'warning' | 'secondary' | 'error'
}

const MetricCard = ({ title, value, hint, icon, tone }: Metric) => (
  <Card variant='outlined' sx={{ height: '100%', borderRadius: 2.5 }}>
    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant='body2' color='text.secondary' fontWeight={500}>{title}</Typography>
          <Typography variant='h4' fontWeight={760} sx={{ mt: 1.5, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>
            {number(value)}
          </Typography>
        </Box>
        <Box sx={{
          height: 44, width: 44, flexShrink: 0, borderRadius: 2,
          bgcolor: `${tone}.lighter`, color: `${tone}.main`,
          display: 'grid', placeItems: 'center'
        }}>
          <i className={`${icon} text-2xl`} aria-hidden='true' />
        </Box>
      </Box>
      <Typography variant='caption' color='text.secondary' sx={{ mt: 2, display: 'block' }}>{hint}</Typography>
    </CardContent>
  </Card>
)

const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <Box>
    <Typography component='h2' variant='h5' fontWeight={750}>{title}</Typography>
    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>{subtitle}</Typography>
  </Box>
)

type ChartMode = 'registrations' | 'internal' | 'external'

const dailyDate = (day: string): string => {
  const date = new Date(`${day}T00:00:00Z`)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date)
}

const toWeeklyBuckets = (days: DashboardTrendDay[]): DashboardTrendDay[] =>
  Array.from({ length: Math.ceil(days.length / 7) }, (_, group) => {
    const slice = days.slice(group * 7, group * 7 + 7)
    return {
      date: slice[0]?.date ?? '',
      registrations: slice.reduce((sum, day) => sum + day.registrations, 0),
      internal: slice.reduce((sum, day) => sum + day.internal, 0),
      external: slice.reduce((sum, day) => sum + day.external, 0)
    }
  })

export default function AdminAnalyticsDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>(30)
  const [data, setData] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [chartMode, setChartMode] = useState<ChartMode>('registrations')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setData(null)

    void getAdminDashboardAnalytics(period)
      .then(result => { if (active) setData(result) })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load dashboard analytics.')
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [period, revision])

  const bars = useMemo(() => data
    ? period === 90 ? toWeeklyBuckets(data.registrationTrend) : data.registrationTrend
    : [], [data, period])

  const maximum = Math.max(1, ...bars.map(day => day[chartMode]))
  const registeredPct = data ? percent(data.reservedSeats, data.totalCapacity) : 0
  const arrivalPct = data ? percent(data.checkedIn, data.activeParticipants) : 0

  if (loading && !data) {
    return (
      <Box sx={{ display: 'grid', gap: 3 }}>
        <Skeleton width={340} height={46} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2.5 }}>
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} variant='rounded' height={150} />)}
        </Box>
        <Skeleton variant='rounded' height={310} />
      </Box>
    )
  }

  if (!data) {
    return (
      <Box sx={{ maxWidth: 720, display: 'grid', gap: 3 }}>
        <Typography component='h1' variant='h4' fontWeight={750}>Admin Analytics</Typography>
        <Alert severity='error'>{error || 'No analytics are available.'} Live totals cannot be displayed until the backend responds.</Alert>
        <Button variant='outlined' onClick={() => setRevision(value => value + 1)} sx={{ justifySelf: 'start' }}>
          Try again
        </Button>
      </Box>
    )
  }

  const primaryMetrics: Metric[] = [
    { title: 'Total Events', value: data.totalEvents, hint: `${number(data.publishedEvents)} published · ${number(data.draftEvents)} draft`, icon: 'tabler-calendar-event', tone: 'primary' },
    { title: 'Upcoming Events', value: data.upcomingEvents, hint: 'Published events starting in the future', icon: 'tabler-calendar-time', tone: 'info' },
    { title: 'Active Participants', value: data.activeParticipants, hint: `${number(data.internalParticipants)} internal · ${number(data.externalParticipants)} external`, icon: 'tabler-users', tone: 'success' },
    { title: 'Registrations Today', value: data.registrationsToday, hint: `${number(data.registrationsLastSevenDays)} in the last 7 days`, icon: 'tabler-user-plus', tone: 'warning' }
  ]

  const attendanceMetrics: Metric[] = [
    { title: 'Checked In', value: data.checkedIn, hint: `${arrivalPct}% of active participants`, icon: 'tabler-user-check', tone: 'success' },
    { title: 'Awaiting Check-in', value: data.awaitingCheckIn, hint: 'Registered but not yet arrived', icon: 'tabler-clock-hour-4', tone: 'warning' },
    { title: 'Currently On Site', value: data.currentlyOnSite, hint: 'Checked in and not checked out', icon: 'tabler-map-pin-check', tone: 'primary' },
    { title: 'Checked Out', value: data.checkedOut, hint: 'Completed attendance cycle', icon: 'tabler-logout', tone: 'info' }
  ]

  const registrationMetrics: Metric[] = [
    { title: 'Reserved Seats', value: data.reservedSeats, hint: `${registeredPct}% of overall capacity`, icon: 'tabler-ticket', tone: 'primary' },
    { title: 'Available Seats', value: data.remainingSeats, hint: `Capacity: ${number(data.totalCapacity)} seats`, icon: 'tabler-armchair', tone: 'success' },
    { title: 'Pending Payment', value: data.pendingPayments, hint: 'Awaiting payment confirmation', icon: 'tabler-receipt', tone: 'warning' },
    { title: 'Cancelled Registrations', value: data.cancelledRegistrations, hint: `${number(data.failedRegistrations)} failed · ${number(data.expiredRegistrations)} expired`, icon: 'tabler-user-x', tone: 'error' }
  ]

  const generatedAt = new Date(data.generatedAtUtc)

  return (
    <Box sx={{ display: 'grid', gap: 4.5, minWidth: 0 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Box>
          <Chip label='GLOBAL OVERVIEW' variant='tonal' color='primary' size='small' sx={{ mb: 1.25 }} />
          <Typography component='h1' variant='h4' fontWeight={780} letterSpacing='-0.025em'>Event Analytics</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
            Live performance across the Pertamina Event platform · As of {Number.isNaN(generatedAt.getTime()) ? '—' : generatedAt.toLocaleString('id-ID')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <ToggleButtonGroup exclusive size='small' value={period} onChange={(_, value: DashboardPeriod | null) => { if (value) setPeriod(value) }}>
            <ToggleButton value={7}>7D</ToggleButton>
            <ToggleButton value={30}>30D</ToggleButton>
            <ToggleButton value={90}>90D</ToggleButton>
          </ToggleButtonGroup>
          <Button variant='outlined' startIcon={<i className='tabler-refresh' />} onClick={() => setRevision(n => n + 1)}>Refresh</Button>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.6fr) minmax(330px, 1fr)' }, gap: 2.5 }}>
        <Card variant='outlined' sx={{ borderRadius: 2.5, minWidth: 0, overflow: 'hidden' }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
            <Chip size='small' color='primary' variant='tonal' label='LIVE PERFORMANCE' sx={{ mb: 2 }} />
            <Typography variant='h5' fontWeight={760}>Your events at a glance</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75, mb: 3 }}>
              Monitor registration demand, attendance and capacity without switching between events.
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 2.5 }}>
              {[
                { label: 'Registration utilization', value: registeredPct, count: data.reservedSeats, icon: 'tabler-chart-pie' },
                { label: 'Attendance conversion', value: arrivalPct, count: data.checkedIn, icon: 'tabler-user-check' },
                { label: 'Published events', value: percent(data.publishedEvents, data.totalEvents), count: data.publishedEvents, icon: 'tabler-calendar-check' }
              ].map(kpi => (
                <Box key={kpi.label} sx={{ display: 'grid', alignContent: 'start', gap: 1.25, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <i className={kpi.icon} aria-hidden='true' />
                    <Typography variant='caption' color='text.secondary' fontWeight={650}>{kpi.label}</Typography>
                  </Box>
                  <Typography variant='h5' fontWeight={780} sx={{ fontVariantNumeric: 'tabular-nums' }}>{kpi.value}%</Typography>
                  <LinearProgress variant='determinate' value={kpi.value} sx={{ height: 7, borderRadius: 2 }} />
                  <Typography variant='caption' color='text.secondary'>{number(kpi.count)} total</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
        <Card variant='outlined' sx={{ borderRadius: 2.5, minWidth: 0 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
            <Typography variant='h6' fontWeight={750}>Participant Mix</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: .5 }}>Active internal and external registrations</Typography>
            <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center', mt: 3 }}>
              <Box sx={{
                height: 104, width: 104, borderRadius: '50%', flexShrink: 0,
                background: theme => `conic-gradient(${theme.palette.primary.main} 0% ${percent(data.internalParticipants, data.activeParticipants)}%, ${theme.palette.info.main} ${percent(data.internalParticipants, data.activeParticipants)}% 100%)`,
                display: 'grid', placeItems: 'center'
              }}>
                <Box sx={{ height: 76, width: 76, bgcolor: 'background.paper', borderRadius: '50%', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                  <Typography variant='body1' fontWeight={800}>{number(data.activeParticipants)}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gap: 1.25, minWidth: 0, flex: 1 }}>
                {[{ label: 'Internal', value: data.internalParticipants, color: 'primary.main' },
                  { label: 'External', value: data.externalParticipants, color: 'info.main' }].map(group => (
                  <Box key={group.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Box sx={{ height: 9, width: 9, borderRadius: '50%', bgcolor: group.color }} />
                      <Typography variant='body2' color='text.secondary'>{group.label}</Typography>
                    </Box>
                    <Typography variant='body2' fontWeight={750}>{number(group.value)}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 2 }}>
              Data from active participants only, excluding cancelled and expired registrations.
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 2.5 }}>
        {primaryMetrics.map(metric => <MetricCard key={metric.title} {...metric} />)}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.7fr) minmax(300px, 1fr)' }, gap: 2.5 }}>
        <Card variant='outlined' sx={{ borderRadius: 2.5, minWidth: 0 }}>
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant='h6' fontWeight={750}>Registration Trend</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                  {period === 90 ? 'Weekly totals' : 'Daily totals'} · Last {period} days
                </Typography>
              </Box>
              <ToggleButtonGroup exclusive size='small' value={chartMode} onChange={(_, value: ChartMode | null) => { if (value) setChartMode(value) }}>
                <ToggleButton value='registrations'>All</ToggleButton>
                <ToggleButton value='internal'>Internal</ToggleButton>
                <ToggleButton value='external'>External</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Box role='img' aria-label={`Registration trend chart for last ${period} days`}
              sx={{ height: 235, display: 'flex', gap: { xs: 0.35, sm: 0.65 }, alignItems: 'flex-end', pt: 4, borderBottom: '1px solid', borderColor: 'divider', mt: 2 }}>
              {bars.map((bar, index) => {
                const value = bar[chartMode]
                const height = `${value === 0 ? 1.5 : Math.max(5, (value / maximum) * 100)}%`
                return (
                  <Box key={bar.date} title={`${dailyDate(bar.date)}: ${number(value)}`}
                    sx={{ flex: 1, minWidth: 2, height, bgcolor: index === bars.length - 1 ? 'primary.main' : 'primary.light', borderRadius: '4px 4px 0 0', transition: 'height 180ms ease, background-color 180ms ease', '&:hover': { bgcolor: 'primary.main' } }} />
                )
              })}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant='caption' color='text.secondary'>{bars.length ? dailyDate(bars[0].date) : '—'}</Typography>
              <Typography variant='caption' color='text.secondary'>Peak: {number(maximum === 1 && bars.every(x => x[chartMode] === 0) ? 0 : maximum)}</Typography>
              <Typography variant='caption' color='text.secondary'>{bars.length ? dailyDate(bars[bars.length - 1].date) : '—'}</Typography>
            </Box>
          </CardContent>
        </Card>

        <Card variant='outlined' sx={{ borderRadius: 2.5 }}>
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Typography variant='h6' fontWeight={750}>Attendance Rate</Typography>
            <Typography color='text.secondary' variant='body2' sx={{ mt: 0.5 }}>Checked in / active participants</Typography>
            <Box sx={{ position: 'relative', width: 152, height: 152, mx: 'auto', my: 3 }}>
              <CircularProgress variant='determinate' value={100} size={152} thickness={5} sx={{ color: 'action.hover', position: 'absolute' }} />
              <CircularProgress variant='determinate' value={arrivalPct} size={152} thickness={5}
                sx={{ position: 'absolute', color: 'success.main', '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }} />
              <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant='h4' fontWeight={780}>{arrivalPct}%</Typography>
                  <Typography variant='caption' color='text.secondary'>Arrived</Typography>
                </Box>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2' color='text.secondary'>Checked in</Typography>
                <Typography variant='body2' fontWeight={700}>{number(data.checkedIn)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2' color='text.secondary'>Awaiting</Typography>
                <Typography variant='body2' fontWeight={700}>{number(data.awaitingCheckIn)}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <SectionTitle title='Attendance Operations' subtitle='Real check-in and check-out counts across all events.' />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 2.5 }}>
        {attendanceMetrics.map(metric => <MetricCard key={metric.title} {...metric} />)}
      </Box>

      <SectionTitle title='Registration & Capacity' subtitle='Reserved seats, payments and cancellations. Reserved seats may include pending holds.' />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 2.5 }}>
        {registrationMetrics.map(metric => <MetricCard key={metric.title} {...metric} />)}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.5fr) minmax(300px, 1fr)' }, gap: 2.5 }}>
        <Card variant='outlined' sx={{ borderRadius: 2.5 }}>
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant='h6' fontWeight={750}>Top Events</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>Ranked by reserved event seats</Typography>
              </Box>
              <Button component={Link} href='/admin/events' size='small' endIcon={<i className='tabler-arrow-right' />}>All Events</Button>
            </Box>
            <Stack spacing={2.25} sx={{ mt: 3 }}>
              {data.topEvents.length === 0 && <Typography color='text.secondary'>No events yet.</Typography>}
              {data.topEvents.map((event, index) => (
                <Box key={event.eventId}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1 }}>
                    <Box sx={{ minWidth: 0, display: 'flex', gap: 1.25, alignItems: 'center' }}>
                      <Typography variant='caption' color='text.secondary' fontWeight={750}>{String(index + 1).padStart(2, '0')}</Typography>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography component={Link} href={`/admin/events/${encodeURIComponent(event.eventId)}/dashboard`} variant='body2' fontWeight={700}
                          color='text.primary' sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' }, display: 'block' }} noWrap>{event.name}</Typography>
                        <Typography variant='caption' color='text.secondary'>{event.status}</Typography>
                      </Box>
                    </Box>
                    <Typography variant='body2' fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>{number(event.reservedSeats)} / {number(event.capacity)}</Typography>
                  </Box>
                  <LinearProgress variant='determinate' value={percent(event.reservedSeats, event.capacity)} sx={{ borderRadius: 2, height: 6 }} />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={2.5}>
          <Card variant='outlined' sx={{ borderRadius: 2.5 }}>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
              <Typography variant='h6' fontWeight={750}>Event Status</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>Entire event portfolio</Typography>
              <Stack spacing={2.5} sx={{ mt: 3 }}>
                {[
                  { label: 'Published', value: data.publishedEvents, color: 'success.main' },
                  { label: 'Draft', value: data.draftEvents, color: 'warning.main' },
                  { label: 'Archived', value: data.archivedEvents, color: 'text.disabled' }
                ].map(row => (
                  <Box key={row.label}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant='body2'>{row.label}</Typography>
                      <Typography variant='body2' fontWeight={700}>{number(row.value)} ({percent(row.value, data.totalEvents)}%)</Typography>
                    </Box>
                    <LinearProgress variant='determinate' value={percent(row.value, data.totalEvents)}
                      sx={{ height: 7, borderRadius: 2, '& .MuiLinearProgress-bar': { bgcolor: row.color } }} />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card variant='outlined' sx={{ borderRadius: 2.5 }}>
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
              <Typography variant='h6' fontWeight={750}>Event Categories</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>By event type</Typography>
              <Stack spacing={1.75} sx={{ mt: 2.5 }}>
                {data.eventCategories.length === 0 && <Typography color='text.secondary'>No category data yet.</Typography>}
                {data.eventCategories.map(category => (
                  <Box key={category.category} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                    <Typography variant='body2'>{category.category}</Typography>
                    <Chip size='small' label={number(category.count)} variant='outlined' />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      <Typography variant='caption' color='text.secondary'>
        Counts are provided by authenticated backend aggregates and updated when you refresh. No participant personal information is loaded on this page.
      </Typography>
    </Box>
  )
}
