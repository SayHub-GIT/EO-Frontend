'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import NextLink from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import {
  changePassword,
  getStoredSession,
  logout,
  logoutAll,
  saveSession
} from '@/lib/auth'
import {
  downloadParticipantReceipt,
  downloadParticipantTicket,
  getParticipantAccount,
  updateParticipantProfile,
  type ParticipantAccountActivity,
  type ParticipantAccountOverview,
  type ParticipantAccountRegistration
} from '@/lib/participant-account'

type Section =
  | 'overview'
  | 'points'
  | 'activity'
  | 'purchases'
  | 'tickets'
  | 'receipts'
  | 'history'
  | 'settings'

const sections: Array<{ key: Section; label: string; icon: string }> = [
  { key: 'overview', label: 'Overview', icon: 'tabler-layout-dashboard' },
  { key: 'points', label: 'Points', icon: 'tabler-coins' },
  { key: 'activity', label: 'Activity', icon: 'tabler-activity' },
  { key: 'purchases', label: 'Purchases', icon: 'tabler-shopping-bag' },
  { key: 'tickets', label: 'Tickets', icon: 'tabler-ticket' },
  { key: 'receipts', label: 'Receipts', icon: 'tabler-receipt-2' },
  { key: 'history', label: 'History', icon: 'tabler-history' },
  { key: 'settings', label: 'Account Settings', icon: 'tabler-settings' }
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value)

const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date(value))
    : '—'

const registrationColor = (status: string) => {
  const value = status.toLowerCase()
  if (value === 'completed') return 'success'
  if (value === 'checkedin') return 'info'
  if (value === 'registered') return 'primary'
  if (value === 'pendingpayment') return 'warning'
  return 'default'
}

const ActivityRow = ({ item }: { item: ParticipantAccountActivity }) => (
  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', py: 2 }}>
    <Box
      sx={{
        width: 42,
        height: 42,
        borderRadius: 2,
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'action.hover',
        color: item.pointsDelta > 0 ? 'success.main' : 'text.secondary',
        flexShrink: 0
      }}
    >
      <i
        className={
          item.kind === 'purchase'
            ? 'tabler-credit-card'
            : item.kind === 'attendance'
              ? 'tabler-scan'
              : item.kind === 'completion'
                ? 'tabler-trophy'
                : 'tabler-calendar-check'
        }
      />
    </Box>

    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography fontWeight={750}>{item.title}</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: .35 }}>
            {item.description}
          </Typography>
        </Box>
        {item.pointsDelta !== 0 && (
          <Chip
            size='small'
            color={item.pointsDelta > 0 ? 'success' : 'default'}
            variant='tonal'
            label={`${item.pointsDelta > 0 ? '+' : ''}${item.pointsDelta} pts`}
          />
        )}
      </Box>
      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
        {formatDate(item.occurredAtUtc)}
      </Typography>
    </Box>
  </Box>
)

const RegistrationCard = ({
  item,
  action
}: {
  item: ParticipantAccountRegistration
  action?: ReactNode
}) => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'grid', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', gap: 1.5, minWidth: 0 }}>
          <Avatar
            src={item.eventLogoUrl ?? undefined}
            sx={{ width: 46, height: 46, bgcolor: 'action.hover', color: 'primary.main' }}
          >
            <i className='tabler-calendar-event' />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={800}>{item.eventName}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {item.eventPackageName ?? 'Event access'}
            </Typography>
          </Box>
        </Box>
        <Chip
          size='small'
          label={item.registrationStatus}
          color={registrationColor(item.registrationStatus) as any}
          variant='tonal'
        />
      </Box>

      <Divider />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' }, gap: 1.5 }}>
        <Box>
          <Typography variant='caption' color='text.secondary'>Booking Code</Typography>
          <Typography variant='body2' fontWeight={650} sx={{ overflowWrap: 'anywhere' }}>{item.bookingCode}</Typography>
        </Box>
        <Box>
          <Typography variant='caption' color='text.secondary'>Event Date</Typography>
          <Typography variant='body2' fontWeight={650}>{formatDate(item.eventStartAtUtc)}</Typography>
        </Box>
        <Box>
          <Typography variant='caption' color='text.secondary'>Payment</Typography>
          <Typography variant='body2' fontWeight={650}>{item.paymentStatus}</Typography>
        </Box>
        <Box>
          <Typography variant='caption' color='text.secondary'>Amount</Typography>
          <Typography variant='body2' fontWeight={650}>{item.grossAmount > 0 ? formatCurrency(item.grossAmount) : 'Free'}</Typography>
        </Box>
      </Box>

      {action && <Box sx={{ pt: .5 }}>{action}</Box>}
    </CardContent>
  </Card>
)

const ParticipantAccountCenter = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawSection = searchParams.get('section') as Section | null
  const section: Section = sections.some(item => item.key === rawSection)
    ? (rawSection as Section)
    : 'overview'

  const [data, setData] = useState<ParticipantAccountOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const reload = async () => {
    const result = await getParticipantAccount()
    setData(result)
    setProfileName(result.profile.fullName)
  }

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getParticipantAccount()
        if (!active) return
        setData(result)
        setProfileName(result.profile.fullName)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load account.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [])

  const upcoming = useMemo(
    () =>
      (data?.registrations ?? [])
        .filter(item => new Date(item.eventStartAtUtc).getTime() >= Date.now())
        .sort((a, b) => new Date(a.eventStartAtUtc).getTime() - new Date(b.eventStartAtUtc).getTime()),
    [data]
  )

  const purchases = useMemo(
    () => (data?.registrations ?? []).filter(item => item.grossAmount > 0),
    [data]
  )

  const tickets = useMemo(
    () => (data?.registrations ?? []).filter(item => item.ticketAvailable),
    [data]
  )

  const receipts = useMemo(
    () => (data?.registrations ?? []).filter(item => item.receiptAvailable),
    [data]
  )

  const navigate = (next: Section) => {
    router.push(next === 'overview' ? '/account' : `/account?section=${next}`)
  }

  const download = async (
    item: ParticipantAccountRegistration,
    type: 'ticket' | 'receipt'
  ) => {
    const key = `${type}:${item.registrationId}`

    try {
      setDownloading(key)
      if (type === 'ticket') {
        await downloadParticipantTicket(item.registrationId, item.bookingCode)
      } else {
        await downloadParticipantReceipt(item.registrationId, item.bookingCode)
      }
    } catch (downloadError) {
      pushAppAlert({
        severity: 'error',
        message: downloadError instanceof Error ? downloadError.message : `Unable to download ${type}.`
      })
    } finally {
      setDownloading(null)
    }
  }

  const saveProfile = async () => {
    if (!profileName.trim()) return

    try {
      setProfileSaving(true)
      const profile = await updateParticipantProfile(profileName.trim())
      const session = getStoredSession()

      if (session) {
        saveSession({ ...session, fullName: profile.fullName })
      }

      await reload()
      pushAppAlert({ severity: 'success', message: 'Profile updated.' })
    } catch (saveError) {
      pushAppAlert({
        severity: 'error',
        message: saveError instanceof Error ? saveError.message : 'Unable to update profile.'
      })
    } finally {
      setProfileSaving(false)
    }
  }

  const savePassword = async () => {
    if (!currentPassword || newPassword.length < 12) return

    try {
      setPasswordSaving(true)
      await changePassword(currentPassword, newPassword)
      pushAppAlert({ severity: 'success', message: 'Password changed. Please sign in again.' })
      router.replace('/login')
    } catch (saveError) {
      pushAppAlert({
        severity: 'error',
        message: saveError instanceof Error ? saveError.message : 'Unable to change password.'
      })
    } finally {
      setPasswordSaving(false)
    }
  }

  const signOut = async () => {
    await logout()
    router.replace('/home')
  }

  const signOutAll = async () => {
    await logoutAll()
    router.replace('/login')
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '70dvh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!data) {
    return <Alert severity='error'>{error ?? 'Account is unavailable.'}</Alert>
  }

  const statCards = [
    ['tabler-calendar-event', 'Events', data.stats.totalRegistrations],
    ['tabler-calendar-time', 'Upcoming', data.stats.upcomingEvents],
    ['tabler-scan', 'Attended', data.stats.attendedEvents],
    ['tabler-wallet', 'Lifetime Spend', formatCurrency(data.stats.lifetimeSpend)]
  ]

  const renderOverview = () => (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Card
        sx={theme => ({
          overflow: 'hidden',
          color: '#fff',
          background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main} 55%, ${theme.palette.info.main})`
        })}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box>
              <Typography variant='overline' sx={{ color: 'rgba(255,255,255,.76)' }}>PERTAMINA EVENT MEMBER</Typography>
              <Typography variant='h3' fontWeight={900} color='inherit' sx={{ mt: .5 }}>
                {data.profile.fullName}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,.82)', mt: 1 }}>
                {data.profile.email}
              </Typography>
            </Box>

            <Box sx={{ minWidth: { xs: '100%', sm: 280 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'baseline' }}>
                <Box>
                  <Typography sx={{ color: 'rgba(255,255,255,.78)' }}>Points</Typography>
                  <Typography variant='h3' fontWeight={950} color='inherit'>{data.points.balance.toLocaleString()}</Typography>
                </Box>
                <Chip
                  label={data.points.tier}
                  sx={{ bgcolor: 'rgba(255,255,255,.18)', color: '#fff', fontWeight: 800 }}
                />
              </Box>
              <LinearProgress
                variant='determinate'
                value={data.points.progressPercent}
                sx={{
                  mt: 2,
                  height: 8,
                  borderRadius: 99,
                  bgcolor: 'rgba(255,255,255,.18)',
                  '& .MuiLinearProgress-bar': { bgcolor: '#fff', borderRadius: 99 }
                }}
              />
              <Typography variant='caption' sx={{ color: 'rgba(255,255,255,.78)', display: 'block', mt: 1 }}>
                {data.points.nextTier && data.points.nextTierAt
                  ? `${Math.max(0, data.points.nextTierAt - data.points.balance).toLocaleString()} pts to ${data.points.nextTier}`
                  : 'Highest tier unlocked'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 2 }}>
        {statCards.map(([icon, label, value]) => (
          <Card key={String(label)} variant='outlined'>
            <CardContent>
              <Box sx={{ width: 42, height: 42, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'primary.main' }}>
                <i className={String(icon)} />
              </Box>
              <Typography variant='h5' fontWeight={900} sx={{ mt: 2 }}>{value}</Typography>
              <Typography variant='body2' color='text.secondary'>{label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.15fr .85fr' }, gap: 3 }}>
        <Card variant='outlined'>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
              <Box>
                <Typography variant='h6' fontWeight={850}>Upcoming Events</Typography>
                <Typography variant='body2' color='text.secondary'>Your next experiences in one place.</Typography>
              </Box>
              <Button component={NextLink} href='/events/category/other' size='small'>Explore</Button>
            </Box>
            <Divider sx={{ my: 2 }} />
            {upcoming.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                <i className='tabler-calendar-off text-3xl' />
                <Typography sx={{ mt: 1 }}>No upcoming event yet.</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                {upcoming.slice(0, 4).map(item => (
                  <Box key={item.registrationId} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography fontWeight={800}>{item.eventName}</Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: .5 }}>
                      {formatDate(item.eventStartAtUtc)} • {item.eventLocation ?? 'Location TBA'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        <Card variant='outlined'>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant='h6' fontWeight={850}>Recent Activity</Typography>
                <Typography variant='body2' color='text.secondary'>Latest milestones & points.</Typography>
              </Box>
              <Button size='small' onClick={() => navigate('activity')}>View all</Button>
            </Box>
            <Divider sx={{ my: 2 }} />
            {data.recentActivity.slice(0, 5).map(item => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 2 }}>
        {[
          ['tabler-ticket', 'Tickets', `${data.stats.ticketsAvailable} ready`, 'tickets' as Section],
          ['tabler-receipt-2', 'Receipts', `${data.stats.receiptsAvailable} available`, 'receipts' as Section],
          ['tabler-settings', 'Account', 'Profile & security', 'settings' as Section]
        ].map(([icon, title, subtitle, target]) => (
          <Card key={String(title)} variant='outlined' sx={{ cursor: 'pointer' }} onClick={() => navigate(target as Section)}>
            <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'action.hover', color: 'primary.main', display: 'grid', placeItems: 'center' }}>
                <i className={String(icon)} />
              </Box>
              <Box>
                <Typography fontWeight={800}>{title}</Typography>
                <Typography variant='body2' color='text.secondary'>{subtitle}</Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  )

  const renderPoints = () => (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Card variant='outlined'>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box>
              <Typography variant='overline' color='text.secondary'>Loyalty Balance</Typography>
              <Typography variant='h2' fontWeight={950}>{data.points.balance.toLocaleString()} pts</Typography>
              <Typography color='text.secondary'>{data.points.tier} member</Typography>
            </Box>
            <Box sx={{ minWidth: { xs: '100%', sm: 320 } }}>
              <LinearProgress variant='determinate' value={data.points.progressPercent} sx={{ height: 12, borderRadius: 99 }} />
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                {data.points.nextTier && data.points.nextTierAt
                  ? `${data.points.progressPercent}% toward ${data.points.nextTier} at ${data.points.nextTierAt.toLocaleString()} pts`
                  : 'Platinum tier unlocked'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 2 }}>
        {[
          ['Register', '+50', 'Active event registration', 'tabler-calendar-plus'],
          ['Pay', '+100', 'Successful paid registration', 'tabler-credit-card'],
          ['Check-in', '+150', 'Attend the event', 'tabler-scan'],
          ['Complete', '+200', 'Finish & check-out', 'tabler-trophy']
        ].map(([title, points, desc, icon]) => (
          <Card key={String(title)} variant='outlined'>
            <CardContent>
              <i className={`${icon} text-2xl`} />
              <Typography variant='h5' fontWeight={900} color='success.main' sx={{ mt: 2 }}>{points}</Typography>
              <Typography fontWeight={800}>{title}</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: .5 }}>{desc}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card variant='outlined'>
        <CardContent>
          <Typography variant='h6' fontWeight={850}>Point History</Typography>
          <Divider sx={{ my: 2 }} />
          {data.recentActivity.filter(item => item.pointsDelta !== 0).map(item => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </CardContent>
      </Card>
    </Box>
  )

  const renderList = (items: ParticipantAccountRegistration[], type: 'purchases' | 'tickets' | 'receipts' | 'history') => (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {items.length === 0 ? (
        <Card variant='outlined'>
          <CardContent sx={{ py: 8, textAlign: 'center' }}>
            <i className='tabler-inbox text-4xl text-textSecondary' />
            <Typography variant='h6' fontWeight={800} sx={{ mt: 2 }}>Nothing here yet</Typography>
            <Typography color='text.secondary' sx={{ mt: .5 }}>
              Your account will automatically update from event registrations and payments.
            </Typography>
          </CardContent>
        </Card>
      ) : items.map(item => (
        <RegistrationCard
          key={item.registrationId}
          item={item}
          action={
            type === 'tickets' ? (
              <Button
                variant='contained'
                disabled={downloading === `ticket:${item.registrationId}`}
                onClick={() => void download(item, 'ticket')}
                startIcon={downloading === `ticket:${item.registrationId}` ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-download' />}
              >
                Download Ticket
              </Button>
            ) : type === 'receipts' ? (
              <Button
                variant='contained'
                disabled={downloading === `receipt:${item.registrationId}`}
                onClick={() => void download(item, 'receipt')}
                startIcon={downloading === `receipt:${item.registrationId}` ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-download' />}
              >
                Download Receipt
              </Button>
            ) : type === 'purchases' ? (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {item.ticketAvailable && (
                  <Button size='small' onClick={() => navigate('tickets')} startIcon={<i className='tabler-ticket' />}>Ticket</Button>
                )}
                {item.receiptAvailable && (
                  <Button size='small' onClick={() => navigate('receipts')} startIcon={<i className='tabler-receipt' />}>Receipt</Button>
                )}
              </Box>
            ) : undefined
          }
        />
      ))}
    </Box>
  )

  const renderSettings = () => (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Card variant='outlined'>
        <CardContent sx={{ display: 'grid', gap: 2.5 }}>
          <Box>
            <Typography variant='h6' fontWeight={850}>Profile</Typography>
            <Typography variant='body2' color='text.secondary'>Your email is verified and used to link event history.</Typography>
          </Box>
          <TextField
            label='Full name'
            value={profileName}
            onChange={event => setProfileName(event.target.value)}
            inputProps={{ maxLength: 150 }}
          />
          <TextField label='Verified email' value={data.profile.email} disabled />
          <Typography variant='caption' color='text.secondary'>
            Member since {formatDate(data.profile.createdAtUtc)}
          </Typography>
          <Button
            variant='contained'
            disabled={profileSaving || !profileName.trim() || profileName.trim() === data.profile.fullName}
            onClick={() => void saveProfile()}
            startIcon={profileSaving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}
            sx={{ justifySelf: 'start' }}
          >
            Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card variant='outlined'>
        <CardContent sx={{ display: 'grid', gap: 2.5 }}>
          <Box>
            <Typography variant='h6' fontWeight={850}>Security</Typography>
            <Typography variant='body2' color='text.secondary'>Changing your password signs out every active session.</Typography>
          </Box>
          <TextField
            label='Current password'
            type='password'
            value={currentPassword}
            onChange={event => setCurrentPassword(event.target.value)}
          />
          <TextField
            label='New password'
            type='password'
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            helperText='Minimum 12 characters and must satisfy the account password policy.'
          />
          <Button
            color='warning'
            variant='contained'
            disabled={passwordSaving || !currentPassword || newPassword.length < 12}
            onClick={() => void savePassword()}
            sx={{ justifySelf: 'start' }}
          >
            Change Password
          </Button>
        </CardContent>
      </Card>

      <Card variant='outlined'>
        <CardContent>
          <Typography variant='h6' fontWeight={850}>Session</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: .75 }}>
            Sign out safely from this device.
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button color='error' variant='outlined' onClick={() => void signOut()} startIcon={<i className='tabler-logout' />}>
              Sign Out This Device
            </Button>
            <Button color='error' variant='contained' onClick={() => void signOutAll()} startIcon={<i className='tabler-devices-off' />}>
              Sign Out All Devices
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )

  const sectionTitle = sections.find(item => item.key === section)?.label ?? 'Overview'

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Box
        component='header'
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2, md: 4 }, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Box component={NextLink} href='/home' sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Box component='img' src='/EO%20Navbar.png' alt='Pertamina Event' sx={{ height: 38, width: 'auto' }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button component={NextLink} href='/home' variant='text'>Explore Events</Button>
            <Button onClick={() => void signOut()} variant='outlined' startIcon={<i className='tabler-logout' />}>Sign Out</Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, md: 4 }, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '260px minmax(0,1fr)' }, gap: 3 }}>
        <Card variant='outlined' sx={{ alignSelf: 'start', position: { lg: 'sticky' }, top: { lg: 92 } }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', p: 1.25 }}>
              <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                {data.profile.fullName.slice(0, 1).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={850} noWrap>{data.profile.fullName}</Typography>
                <Typography variant='caption' color='text.secondary' noWrap>{data.points.tier} • {data.points.balance.toLocaleString()} pts</Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'grid', gap: .5 }}>
              {sections.map(item => (
                <Button
                  key={item.key}
                  variant={section === item.key ? 'tonal' : 'text'}
                  color={section === item.key ? 'primary' : 'inherit'}
                  onClick={() => navigate(item.key)}
                  startIcon={<i className={item.icon} />}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: section === item.key ? 800 : 600 }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant='h4' fontWeight={900}>{sectionTitle}</Typography>
            <Typography color='text.secondary' sx={{ mt: .5 }}>
              Your personal Pertamina Event account center.
            </Typography>
          </Box>

          {error && <Alert severity='error' sx={{ mb: 3 }}>{error}</Alert>}

          {section === 'overview' && renderOverview()}
          {section === 'points' && renderPoints()}
          {section === 'activity' && (
            <Card variant='outlined'>
              <CardContent>
                {data.recentActivity.map(item => <ActivityRow key={item.id} item={item} />)}
              </CardContent>
            </Card>
          )}
          {section === 'purchases' && renderList(purchases, 'purchases')}
          {section === 'tickets' && renderList(tickets, 'tickets')}
          {section === 'receipts' && renderList(receipts, 'receipts')}
          {section === 'history' && renderList(data.registrations, 'history')}
          {section === 'settings' && renderSettings()}
        </Box>
      </Box>
    </Box>
  )
}

export default ParticipantAccountCenter
