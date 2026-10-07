'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import NextLink from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import LinearProgress from '@mui/material/LinearProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import {
  changePassword,
  clearSession,
  getStoredSession,
  listAuthSessions,
  logout,
  logoutAll,
  logoutOtherSessions,
  revokeAuthSession,
  saveSession,
  type AuthDeviceSession
} from '@/lib/auth'
import {
  deleteParticipantAccount,
  downloadParticipantReceipt,
  downloadParticipantTicket,
  getParticipantAccount,
  updateParticipantProfile,
  type ParticipantAccountActivity,
  type ParticipantAccountOverview,
  type ParticipantAccountRegistration
} from '@/lib/participant-account'
import { displayNameError } from '@/lib/display-name'
import {
  createProfileAvatarDataUrl,
  getProfileAvatar,
  removeProfileAvatar,
  setProfileAvatar,
  subscribeProfileAvatar
} from '@/lib/profile-avatar'

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
  if (value === 'completed') return 'success.main'
  if (value === 'checkedin') return 'info.main'
  if (value === 'registered') return 'primary.main'
  if (value === 'pendingpayment') return 'warning.main'
  return 'text.secondary'
}

const describeSessionDevice = (userAgent: string | null) => {
  if (!userAgent) {
    return {
      browser: 'Unknown browser',
      platform: 'Device details unavailable',
      icon: 'tabler-device-laptop'
    }
  }

  const browser =
    /Edg\//.test(userAgent)
      ? 'Microsoft Edge'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Chrome\//.test(userAgent)
          ? 'Google Chrome'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'Web browser'

  const platform =
    /Windows NT/.test(userAgent)
      ? 'Windows'
      : /Android/.test(userAgent)
        ? 'Android'
        : /iPhone|iPad|iPod/.test(userAgent)
          ? 'iOS / iPadOS'
          : /Macintosh|Mac OS X/.test(userAgent)
            ? 'macOS'
            : /Linux/.test(userAgent)
              ? 'Linux'
              : 'Unknown device'

  const mobile = /Android|iPhone|iPad|iPod|Mobile/.test(userAgent)

  return {
    browser,
    platform,
    icon: mobile ? 'tabler-device-mobile' : 'tabler-device-laptop'
  }
}

const ActivityRow = ({ item }: { item: ParticipantAccountActivity }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'minmax(0,1fr) auto' },
      gap: { xs: 1, sm: 3 },
      py: 2.25,
      borderBottom: '1px solid',
      borderColor: 'divider'
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography fontWeight={750}>{item.title}</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mt: .45, lineHeight: 1.65 }}>
        {item.description}
      </Typography>
      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
        {formatDate(item.occurredAtUtc)}
      </Typography>
    </Box>
    {item.pointsDelta !== 0 && (
      <Typography
        sx={{
          color: item.pointsDelta > 0 ? 'success.main' : 'text.secondary',
          fontSize: '0.82rem',
          fontWeight: 850,
          whiteSpace: 'nowrap'
        }}
      >
        {item.pointsDelta > 0 ? '+' : ''}{item.pointsDelta} pts
      </Typography>
    )}
  </Box>
)

const RegistrationCard = ({
  item,
  action
}: {
  item: ParticipantAccountRegistration
  action?: ReactNode
}) => (
  <Box
    component='article'
    sx={{
      py: 3,
      borderBottom: '1px solid',
      borderColor: 'divider'
    }}
  >
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.25fr) minmax(280px, .75fr)' },
        gap: { xs: 2.5, md: 4 },
        alignItems: 'start'
      }}
    >
      <Box sx={{ display: 'flex', gap: 1.75, minWidth: 0 }}>
        <Avatar
          src={item.eventLogoUrl ?? undefined}
          sx={{ width: 48, height: 48, bgcolor: 'action.hover', color: 'primary.main', flexShrink: 0 }}
        >
          <i className='tabler-calendar-event' />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 850, lineHeight: 1.3 }}>{item.eventName}</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: .35 }}>
            {item.eventPackageName ?? 'Event access'}
          </Typography>
          <Typography
            sx={{
              mt: 1.25,
              color: registrationColor(item.registrationStatus),
              fontSize: '0.68rem',
              fontWeight: 850,
              letterSpacing: '.055em',
              textTransform: 'uppercase'
            }}
          >
            {item.registrationStatus}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, minmax(0,1fr))', md: '1fr 1fr' },
          gap: 2
        }}
      >
        <Box>
          <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 800, letterSpacing: '.04em' }}>BOOKING CODE</Typography>
          <Typography variant='body2' fontWeight={650} sx={{ mt: .35, overflowWrap: 'anywhere' }}>{item.bookingCode}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 800, letterSpacing: '.04em' }}>EVENT DATE</Typography>
          <Typography variant='body2' fontWeight={650} sx={{ mt: .35 }}>{formatDate(item.eventStartAtUtc)}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 800, letterSpacing: '.04em' }}>PAYMENT</Typography>
          <Typography variant='body2' fontWeight={650} sx={{ mt: .35 }}>{item.paymentStatus}</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 800, letterSpacing: '.04em' }}>AMOUNT</Typography>
          <Typography variant='body2' fontWeight={650} sx={{ mt: .35 }}>{item.grossAmount > 0 ? formatCurrency(item.grossAmount) : 'Free'}</Typography>
        </Box>
      </Box>
    </Box>

    {action && <Box sx={{ pt: 2.25 }}>{action}</Box>}
  </Box>
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
  const [profileAvatar, setProfileAvatarState] = useState<string | null>(null)
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [sessions, setSessions] = useState<AuthDeviceSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [sessionAction, setSessionAction] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteSaving, setDeleteSaving] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const reload = async () => {
    const result = await getParticipantAccount()
    setData(result)
    setProfileName(result.profile.fullName)
  }


  const loadSessions = async () => {
    try {
      setSessionsLoading(true)
      setSessionsError(null)
      setSessions(await listAuthSessions())
    } catch (sessionError) {
      setSessionsError(
        sessionError instanceof Error
          ? sessionError.message
          : 'Unable to load sessions.'
      )
    } finally {
      setSessionsLoading(false)
    }
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

  useEffect(() => {
    const userId = data?.profile.userId

    if (!userId) {
      setProfileAvatarState(null)
      return
    }

    setProfileAvatarState(getProfileAvatar(userId))
    return subscribeProfileAvatar(userId, setProfileAvatarState)
  }, [data?.profile.userId])


  useEffect(() => {
    if (section !== 'settings') return
    void loadSessions()
  }, [section])

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


  const orderedSessions = useMemo(
    () =>
      [...sessions].sort((left, right) => {
        if (left.isCurrent !== right.isCurrent) return left.isCurrent ? -1 : 1
        return new Date(right.createdAtUtc).getTime() - new Date(left.createdAtUtc).getTime()
      }),
    [sessions]
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

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !data?.profile.userId) return

    try {
      setAvatarSaving(true)
      const avatarUrl = await createProfileAvatarDataUrl(file)
      setProfileAvatar(data.profile.userId, avatarUrl)
      setProfileAvatarState(avatarUrl)
      pushAppAlert({ severity: 'success', message: 'Profile photo updated.' })
    } catch (avatarError) {
      pushAppAlert({
        severity: 'error',
        message: avatarError instanceof Error ? avatarError.message : 'Unable to update profile photo.'
      })
    } finally {
      setAvatarSaving(false)
    }
  }

  const removeAvatar = () => {
    if (!data?.profile.userId) return

    try {
      removeProfileAvatar(data.profile.userId)
      setProfileAvatarState(null)
      pushAppAlert({ severity: 'success', message: 'Profile photo removed.' })
    } catch {
      pushAppAlert({ severity: 'error', message: 'Unable to remove profile photo.' })
    }
  }

  const saveProfile = async () => {
    const nameError = displayNameError(profileName)

    if (nameError) {
      pushAppAlert({ severity: 'error', message: nameError })
      return
    }

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


  const signOutOthers = async () => {
    try {
      setSessionAction('others')
      await logoutOtherSessions()
      await loadSessions()
      pushAppAlert({
        severity: 'success',
        message: 'Other devices have been signed out.'
      })
    } catch (sessionError) {
      pushAppAlert({
        severity: 'error',
        message: sessionError instanceof Error
          ? sessionError.message
          : 'Unable to sign out other devices.'
      })
    } finally {
      setSessionAction(null)
    }
  }

  const revokeSession = async (session: AuthDeviceSession) => {
    if (session.isCurrent || session.status !== 'Active') return

    try {
      setSessionAction(session.sessionId)
      await revokeAuthSession(session.sessionId)
      await loadSessions()
      pushAppAlert({
        severity: 'success',
        message: 'Session revoked successfully.'
      })
    } catch (sessionError) {
      pushAppAlert({
        severity: 'error',
        message: sessionError instanceof Error
          ? sessionError.message
          : 'Unable to revoke this session.'
      })
    } finally {
      setSessionAction(null)
    }
  }

  const closeDeleteDialog = () => {
    if (deleteSaving) return
    setDeleteOpen(false)
    setDeletePassword('')
    setDeleteConfirmation('')
  }

  const deleteAccount = async () => {
    if (
      !data?.profile.userId ||
      deletePassword.length < 8 ||
      deleteConfirmation !== 'DELETE'
    ) {
      return
    }

    try {
      setDeleteSaving(true)
      await deleteParticipantAccount(
        deletePassword,
        deleteConfirmation
      )

      try {
        removeProfileAvatar(data.profile.userId)
      } catch {
        // Account deletion already succeeded server-side; local avatar cleanup is best-effort.
      }

      clearSession({ clearLastPath: true })
      setDeleteOpen(false)
      pushAppAlert({
        severity: 'success',
        message: 'Your account has been permanently deleted.'
      })
      router.replace('/home')
    } catch (deleteError) {
      pushAppAlert({
        severity: 'error',
        message: deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete your account.'
      })
    } finally {
      setDeleteSaving(false)
    }
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
    ['Events', data.stats.totalRegistrations],
    ['Upcoming', data.stats.upcomingEvents],
    ['Attended', data.stats.attendedEvents],
    ['Lifetime Spend', formatCurrency(data.stats.lifetimeSpend)]
  ]

  const renderOverview = () => (
    <Box sx={{ display: 'grid', gap: { xs: 5, md: 6 } }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(260px, .7fr)' },
          gap: { xs: 4, md: 7 },
          alignItems: 'end',
          pb: 4,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box>
          <Typography sx={{ color: '#00A7E1', fontSize: '0.7rem', fontWeight: 850, letterSpacing: '.08em' }}>
            PARTICIPANT ACCOUNT
          </Typography>
          <Typography
            component='h2'
            sx={{
              mt: 1,
              fontSize: { xs: '2rem', sm: '2.55rem' },
              lineHeight: 1.06,
              fontWeight: 900,
              letterSpacing: '-.03em'
            }}
          >
            {data.profile.fullName}
          </Typography>
          <Typography color='text.secondary' sx={{ mt: 1, lineHeight: 1.65 }}>
            {data.profile.email}
          </Typography>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'baseline' }}>
            <Box>
              <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', fontWeight: 800, letterSpacing: '.05em' }}>POINTS</Typography>
              <Typography sx={{ mt: .35, fontSize: '2rem', lineHeight: 1, fontWeight: 950 }}>
                {data.points.balance.toLocaleString()}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 800 }}>{data.points.tier}</Typography>
          </Box>
          <LinearProgress variant='determinate' value={data.points.progressPercent} sx={{ mt: 2, height: 4 }} />
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
            {data.points.nextTier && data.points.nextTierAt
              ? `${Math.max(0, data.points.nextTierAt - data.points.balance).toLocaleString()} pts to ${data.points.nextTier}`
              : 'Highest tier unlocked'}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0,1fr))' },
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        {statCards.map(([label, value], index) => (
          <Box
            key={String(label)}
            sx={{
              py: 2.5,
              px: { xs: index % 2 === 0 ? 0 : 2, md: 2.5 },
              borderRight: { xs: index % 2 === 0 ? '1px solid' : 'none', md: index < statCards.length - 1 ? '1px solid' : 'none' },
              borderBottom: { xs: index < 2 ? '1px solid' : 'none', md: 'none' },
              borderColor: 'divider'
            }}
          >
            <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.45rem' }, fontWeight: 900 }}>{value}</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: .35 }}>{label}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1.1fr) minmax(0,.9fr)' }, gap: { xs: 5, lg: 7 } }}>
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'end', pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box>
              <Typography variant='h6' fontWeight={850}>Upcoming events</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: .35 }}>Your next registered experiences.</Typography>
            </Box>
            <Button component={NextLink} href='/home#event-categories' size='small'>Browse events</Button>
          </Box>

          {upcoming.length === 0 ? (
            <Box sx={{ py: 5 }}>
              <Typography fontWeight={800}>No upcoming events yet</Typography>
              <Typography color='text.secondary' sx={{ mt: .5, fontSize: '0.9rem' }}>
                Events you register for will appear here automatically.
              </Typography>
            </Box>
          ) : (
            <Box>
              {upcoming.slice(0, 4).map(item => (
                <Box key={item.registrationId} sx={{ py: 2.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography fontWeight={800}>{item.eventName}</Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: .5, lineHeight: 1.6 }}>
                    {formatDate(item.eventStartAtUtc)} · {item.eventLocation ?? 'Location TBA'}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'end', pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box>
              <Typography variant='h6' fontWeight={850}>Recent activity</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: .35 }}>Latest registrations, attendance, and points.</Typography>
            </Box>
            <Button size='small' onClick={() => navigate('activity')}>View all</Button>
          </Box>

          <Box>
            {data.recentActivity.slice(0, 5).map(item => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', pt: 1 }}>
        <Button variant='outlined' onClick={() => navigate('tickets')} startIcon={<i className='tabler-ticket' />}>
          Tickets ({data.stats.ticketsAvailable})
        </Button>
        <Button variant='outlined' onClick={() => navigate('receipts')} startIcon={<i className='tabler-receipt-2' />}>
          Receipts ({data.stats.receiptsAvailable})
        </Button>
        <Button variant='text' onClick={() => navigate('settings')} startIcon={<i className='tabler-settings' />}>
          Profile & security
        </Button>
      </Box>
    </Box>
  )

  const renderPoints = () => (
    <Box sx={{ display: 'grid', gap: { xs: 5, md: 6 } }}>
      <Box sx={{ pb: 4, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{ color: '#00A7E1', fontSize: '0.7rem', fontWeight: 850, letterSpacing: '.08em' }}>
          LOYALTY BALANCE
        </Typography>
        <Typography sx={{ mt: 1, fontSize: { xs: '2.4rem', sm: '3rem' }, fontWeight: 950, lineHeight: 1 }}>
          {data.points.balance.toLocaleString()} pts
        </Typography>
        <Typography color='text.secondary' sx={{ mt: 1 }}>{data.points.tier} member</Typography>
        <Box sx={{ mt: 3, maxWidth: 620 }}>
          <LinearProgress variant='determinate' value={data.points.progressPercent} sx={{ height: 5 }} />
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
            {data.points.nextTier && data.points.nextTierAt
              ? `${data.points.progressPercent}% toward ${data.points.nextTier} at ${data.points.nextTierAt.toLocaleString()} pts`
              : 'Highest tier unlocked'}
          </Typography>
        </Box>
      </Box>

      <Box>
        <Typography variant='h6' fontWeight={850}>How points are earned</Typography>
        <Box
          sx={{
            mt: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0,1fr))' },
            borderTop: '1px solid',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          {[
            ['Register', '+50', 'Active event registration'],
            ['Pay', '+100', 'Successful paid registration'],
            ['Check-in', '+150', 'Attend the event'],
            ['Complete', '+200', 'Finish & check-out']
          ].map(([title, points, desc], index) => (
            <Box
              key={String(title)}
              sx={{
                py: 2.75,
                px: { xs: index % 2 === 0 ? 0 : 2, md: 2.5 },
                borderRight: { xs: index % 2 === 0 ? '1px solid' : 'none', md: index < 3 ? '1px solid' : 'none' },
                borderBottom: { xs: index < 2 ? '1px solid' : 'none', md: 'none' },
                borderColor: 'divider'
              }}
            >
              <Typography sx={{ color: 'success.main', fontSize: '1.3rem', fontWeight: 900 }}>{points}</Typography>
              <Typography fontWeight={800} sx={{ mt: .75 }}>{title}</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: .5, lineHeight: 1.55 }}>{desc}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box>
        <Typography variant='h6' fontWeight={850}>Point history</Typography>
        <Box sx={{ mt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          {data.recentActivity.filter(item => item.pointsDelta !== 0).map(item => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </Box>
      </Box>
    </Box>
  )

  const renderList = (items: ParticipantAccountRegistration[], type: 'purchases' | 'tickets' | 'receipts' | 'history') => (
    <Box>
      {items.length === 0 ? (
        <Box sx={{ py: { xs: 6, md: 8 }, borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant='h6' fontWeight={850}>Nothing here yet</Typography>
          <Typography color='text.secondary' sx={{ mt: .75, maxWidth: 620, lineHeight: 1.7 }}>
            Your account updates automatically from event registrations and payments.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          {items.map(item => (
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
      )}
    </Box>
  )

  const renderSettings = () => (
    <Box sx={{ display: 'grid', gap: { xs: 6, md: 7 } }}>
      <Box>
        <Box sx={{ pb: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant='h6' fontWeight={850}>Profile</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: .5 }}>
            Your verified identity and participant profile.
          </Typography>
        </Box>

        <Box
          sx={{
            mt: 3,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '180px minmax(0, 1fr)' },
            gap: { xs: 3, md: 5 },
            alignItems: 'start'
          }}
        >
          <Box>
            <Avatar
              src={profileAvatar ?? undefined}
              alt={data.profile.fullName}
              sx={{
                width: 88,
                height: 88,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: 30,
                fontWeight: 900,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              {data.profile.fullName.slice(0, 1).toUpperCase()}
            </Avatar>

            <input
              ref={avatarInputRef}
              type='file'
              accept='image/jpeg,image/png,image/webp'
              hidden
              onChange={event => void handleAvatarChange(event)}
            />

            <Box sx={{ mt: 2, display: 'grid', gap: .75, justifyItems: 'start' }}>
              <Button
                variant='text'
                disabled={avatarSaving}
                onClick={() => avatarInputRef.current?.click()}
                startIcon={avatarSaving ? <CircularProgress size={16} /> : <i className='tabler-photo-up' />}
                sx={{ px: 0 }}
              >
                {profileAvatar ? 'Change photo' : 'Upload photo'}
              </Button>
              <Button
                color='error'
                variant='text'
                disabled={!profileAvatar || avatarSaving}
                onClick={removeAvatar}
                sx={{ px: 0 }}
              >
                Remove photo
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gap: 2.25, maxWidth: 680 }}>
            <TextField
              label='Display name'
              value={profileName}
              onChange={event => setProfileName(event.target.value)}
              inputProps={{ maxLength: 150 }}
              error={Boolean(profileName) && Boolean(displayNameError(profileName))}
              helperText={displayNameError(profileName) || 'Use up to 5 words. The public navbar shows the first word only.'}
            />
            <TextField label='Verified email' value={data.profile.email} disabled />
            <Box>
              <Typography variant='caption' color='text.secondary'>
                Member since {formatDate(data.profile.createdAtUtc)}
              </Typography>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: .35 }}>
                Profile photos are stored locally in this browser.
              </Typography>
            </Box>
            <Button
              variant='contained'
              disabled={profileSaving || Boolean(displayNameError(profileName)) || profileName.trim() === data.profile.fullName}
              onClick={() => void saveProfile()}
              startIcon={profileSaving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}
              sx={{ justifySelf: 'start' }}
            >
              Save profile
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant='h6' fontWeight={850}>Security</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: .5 }}>
          Changing your password signs out every active session.
        </Typography>

        <Box sx={{ mt: 3, maxWidth: 680, display: 'grid', gap: 2.25 }}>
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
            Change password
          </Button>
        </Box>
      </Box>

      <Box sx={{ pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'minmax(0,1fr) auto' },
            gap: 2,
            alignItems: 'end'
          }}
        >
          <Box>
            <Typography variant='h6' fontWeight={850}>Sessions & devices</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: .5 }}>
              Review recent sign-ins and remove access from devices you no longer use.
            </Typography>
          </Box>

          <Button
            variant='outlined'
            disabled={
              sessionsLoading ||
              sessionAction !== null ||
              !orderedSessions.some(item => item.status === 'Active' && !item.isCurrent)
            }
            onClick={() => void signOutOthers()}
            startIcon={
              sessionAction === 'others'
                ? <CircularProgress size={16} />
                : <i className='tabler-devices-minus' />
            }
          >
            Sign out other devices
          </Button>
        </Box>

        {sessionsError && (
          <Alert
            severity='warning'
            sx={{ mt: 3 }}
            action={
              <Button color='inherit' size='small' onClick={() => void loadSessions()}>
                Retry
              </Button>
            }
          >
            {sessionsError}
          </Alert>
        )}

        {sessionsLoading && orderedSessions.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={26} />
          </Box>
        ) : orderedSessions.length === 0 ? (
          <Box sx={{ mt: 3, py: 4, borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography fontWeight={800}>No session history yet</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: .5 }}>
              Recent sign-ins will appear here.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            {orderedSessions.map(session => {
              const device = describeSessionDevice(session.userAgent)
              const isActive = session.status === 'Active'

              return (
                <Box
                  key={session.sessionId}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1fr) auto' },
                    gap: 2,
                    alignItems: 'center',
                    py: 2.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <i className={device.icon} aria-hidden='true' />
                      <Typography fontWeight={800}>{device.browser} · {device.platform}</Typography>
                    </Box>

                    <Typography
                      sx={{
                        mt: .75,
                        color: session.isCurrent ? 'primary.main' : isActive ? 'success.main' : 'text.secondary',
                        fontSize: '0.67rem',
                        fontWeight: 850,
                        letterSpacing: '.05em'
                      }}
                    >
                      {session.isCurrent ? 'THIS DEVICE · ' : ''}
                      {session.status.toUpperCase()}
                      {session.isPersistent ? ' · REMEMBERED' : ''}
                    </Typography>

                    <Typography variant='body2' color='text.secondary' sx={{ mt: .75 }}>
                      {session.ipAddress ? `IP ${session.ipAddress}` : 'IP unavailable'}
                      {' · '}
                      Last activity {formatDate(session.lastUsedAtUtc ?? session.createdAtUtc)}
                    </Typography>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: .35 }}>
                      Created {formatDate(session.createdAtUtc)} · Expires {formatDate(session.expiresAtUtc)}
                    </Typography>
                  </Box>

                  {isActive && !session.isCurrent && (
                    <Button
                      color='error'
                      variant='text'
                      disabled={sessionAction !== null}
                      onClick={() => void revokeSession(session)}
                      startIcon={
                        sessionAction === session.sessionId
                          ? <CircularProgress size={15} color='inherit' />
                          : <i className='tabler-logout' />
                      }
                    >
                      Revoke
                    </Button>
                  )}
                </Box>
              )
            })}
          </Box>
        )}

        <Box sx={{ mt: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button color='error' variant='outlined' onClick={() => void signOut()} startIcon={<i className='tabler-logout' />}>
            Sign out this device
          </Button>
          <Button color='error' variant='text' onClick={() => void signOutAll()} startIcon={<i className='tabler-devices-off' />}>
            Sign out all devices
          </Button>
        </Box>
      </Box>

      <Box sx={{ pt: 4, borderTop: '1px solid', borderColor: 'error.main' }}>
        <Typography variant='h6' fontWeight={850} color='error.main'>Danger zone</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: .75, maxWidth: 760, lineHeight: 1.7 }}>
          Permanently delete this account and sign out every session. Personal account data is removed,
          linked registration identity is anonymized, and queued account emails are cancelled. Payment
          records and immutable audit evidence remain only for transaction and audit integrity.
        </Typography>
        <Button
          color='error'
          variant='outlined'
          onClick={() => setDeleteOpen(true)}
          startIcon={<i className='tabler-user-x' />}
          sx={{ mt: 2.5 }}
        >
          Delete account
        </Button>
      </Box>

      <Dialog open={deleteOpen} onClose={closeDeleteDialog} fullWidth maxWidth='sm'>
        <DialogTitle sx={{ fontWeight: 900 }}>Permanently delete account?</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2.25, pt: '12px !important' }}>
          <Alert severity='error'>
            This action cannot be undone. You will lose this account, points, account history, ticket access,
            receipts, and all active sessions. Deleting the account does not automatically refund any payment.
          </Alert>

          <Typography variant='body2' color='text.secondary'>
            Enter your current password and type <strong>DELETE</strong> to continue.
          </Typography>

          <TextField
            autoFocus
            label='Current password'
            type='password'
            autoComplete='current-password'
            value={deletePassword}
            disabled={deleteSaving}
            onChange={event => setDeletePassword(event.target.value)}
          />

          <TextField
            label='Type DELETE to confirm'
            value={deleteConfirmation}
            disabled={deleteSaving}
            onChange={event => setDeleteConfirmation(event.target.value)}
            inputProps={{ maxLength: 6 }}
            error={Boolean(deleteConfirmation) && deleteConfirmation !== 'DELETE'}
            helperText={
              deleteConfirmation && deleteConfirmation !== 'DELETE'
                ? 'Confirmation must exactly match DELETE.'
                : 'Permanent deletion requires the exact confirmation text.'
            }
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeDeleteDialog} disabled={deleteSaving} color='inherit'>
            Cancel
          </Button>
          <Button
            color='error'
            variant='contained'
            disabled={
              deleteSaving ||
              deletePassword.length < 8 ||
              deleteConfirmation !== 'DELETE'
            }
            onClick={() => void deleteAccount()}
            startIcon={
              deleteSaving
                ? <CircularProgress size={16} color='inherit' />
                : <i className='tabler-trash' />
            }
          >
            {deleteSaving ? 'Deleting...' : 'Delete permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )

  const sectionTitle = sections.find(item => item.key === section)?.label ?? 'Overview'

  return (
    <Box sx={{ minHeight: '70dvh', bgcolor: 'background.default' }}>
      <Box
        sx={{
          width: '100%',
          maxWidth: 1320,
          mx: 'auto',
          px: { xs: 2.5, sm: 4, lg: 5 },
          py: { xs: 5, md: 7 }
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '230px minmax(0,1fr)' },
            gap: { xs: 4, lg: 7 }
          }}
        >
          <Box component='aside' sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                alignItems: 'center',
                pb: 2.5,
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Avatar
                src={profileAvatar ?? undefined}
                alt={data.profile.fullName}
                sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 44, height: 44 }}
              >
                {data.profile.fullName.slice(0, 1).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={850} noWrap>{data.profile.fullName}</Typography>
                <Typography variant='caption' color='text.secondary' noWrap>
                  {data.points.tier} · {data.points.balance.toLocaleString()} pts
                </Typography>
              </Box>
            </Box>

            <Box
              component='nav'
              aria-label='Account sections'
              sx={{
                mt: 2,
                display: { xs: 'flex', lg: 'grid' },
                gap: { xs: .5, lg: .25 },
                overflowX: { xs: 'auto', lg: 'visible' },
                pb: { xs: 1, lg: 0 },
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' }
              }}
            >
              {sections.map(item => (
                <Button
                  key={item.key}
                  variant='text'
                  color={section === item.key ? 'primary' : 'inherit'}
                  onClick={() => navigate(item.key)}
                  sx={{
                    justifyContent: 'flex-start',
                    minWidth: { xs: 'max-content', lg: 0 },
                    px: { xs: 1.25, lg: 0 },
                    py: 1,
                    borderRadius: 0,
                    borderBottom: { xs: section === item.key ? '2px solid' : '2px solid transparent', lg: 'none' },
                    fontWeight: section === item.key ? 850 : 600,
                    color: section === item.key ? 'primary.main' : 'text.secondary',
                    '&:hover': { bgcolor: 'transparent', color: 'text.primary' }
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ mb: { xs: 4, md: 5 } }}>
              <Typography
                sx={{
                  color: '#00A7E1',
                  fontSize: '0.68rem',
                  fontWeight: 850,
                  letterSpacing: '.08em'
                }}
              >
                MY ACCOUNT
              </Typography>
              <Typography
                component='h1'
                sx={{
                  mt: 1,
                  fontSize: { xs: '1.8rem', sm: '2.2rem' },
                  lineHeight: 1.08,
                  fontWeight: 900,
                  letterSpacing: '-.025em'
                }}
              >
                {sectionTitle}
              </Typography>
            </Box>

            {error && <Alert severity='error' sx={{ mb: 3 }}>{error}</Alert>}

            {section === 'overview' && renderOverview()}
            {section === 'points' && renderPoints()}
            {section === 'activity' && (
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                {data.recentActivity.map(item => <ActivityRow key={item.id} item={item} />)}
              </Box>
            )}
            {section === 'purchases' && renderList(purchases, 'purchases')}
            {section === 'tickets' && renderList(tickets, 'tickets')}
            {section === 'receipts' && renderList(receipts, 'receipts')}
            {section === 'history' && renderList(data.registrations, 'history')}
            {section === 'settings' && renderSettings()}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default ParticipantAccountCenter
