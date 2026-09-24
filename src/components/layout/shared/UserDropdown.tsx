'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Divider from '@mui/material/Divider'
import Fade from '@mui/material/Fade'
import IconButton from '@mui/material/IconButton'
import MenuList from '@mui/material/MenuList'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { logout, restoreSession, type AdminSession } from '@/lib/auth'
import {
  getProfileAvatar,
  subscribeProfileAvatar
} from '@/lib/profile-avatar'
import { getInitials } from '@/utils/getInitials'
import { useSettings } from '@core/hooks/useSettings'

type Props = {
  publicHeader?: boolean
}

const UserAvatar = ({
  session,
  avatarUrl,
  size = 40
}: {
  session: AdminSession
  avatarUrl: string | null
  size?: number
}) => {
  const theme = useTheme()
  const isAdmin = session.canAccessAdmin
  const participantFallback = getInitials(session.fullName).slice(0, 2).toUpperCase()

  return (
    <Avatar
      src={avatarUrl ?? undefined}
      alt={session.fullName || (isAdmin ? 'Administrator' : 'User')}
      aria-label={isAdmin ? 'Administrator profile' : 'User profile'}
      sx={{
        width: size,
        height: size,
        bgcolor: isAdmin
          ? alpha(theme.palette.primary.main, 0.18)
          : alpha(theme.palette.secondary.main, 0.14),
        color: isAdmin ? 'primary.main' : 'text.primary',
        border: '1px solid',
        borderColor: isAdmin
          ? alpha(theme.palette.primary.main, 0.28)
          : 'divider',
        fontSize: size * 0.32,
        fontWeight: 800
      }}
    >
      {isAdmin
        ? <i className='tabler-shield-check' />
        : participantFallback || <i className='tabler-user' />}
    </Avatar>
  )
}

const UserDropdown = ({ publicHeader = false }: Props) => {
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState<AdminSession | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [resolved, setResolved] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const theme = useTheme()
  const { settings } = useSettings()

  useEffect(() => {
    let active = true

    const loadSession = async () => {
      try {
        const value = await restoreSession()
        if (active) setSession(value)
      } finally {
        if (active) setResolved(true)
      }
    }

    void loadSession()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!session?.userId) {
      setAvatarUrl(null)
      return
    }

    setAvatarUrl(getProfileAvatar(session.userId))
    return subscribeProfileAvatar(session.userId, setAvatarUrl)
  }, [session?.userId])

  const close = () => setOpen(false)

  const goToProfile = () => {
    if (!session) return

    close()
    router.push(session.canAccessAdmin ? '/admin/home' : '/account')
  }

  const handleLogout = async () => {
    close()
    await logout()
    router.replace('/login')
    router.refresh()
  }

  if (!resolved) {
    return (
      <Box
        aria-hidden
        sx={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          bgcolor: 'action.hover'
        }}
      />
    )
  }

  if (!session) {
    return (
      <Tooltip title='Sign in'>
        <IconButton
          component='a'
          href='/login'
          aria-label='Sign in'
          sx={{
            width: 44,
            height: 44,
            border: '1px solid',
            borderColor: publicHeader ? alpha(theme.palette.divider, 0.9) : 'divider',
            bgcolor: publicHeader
              ? alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.86 : 0.94)
              : 'background.paper',
            color: 'primary.main',
            boxShadow: publicHeader ? theme.shadows[6] : 'none',
            backdropFilter: publicHeader ? 'blur(18px)' : undefined,
            '&:hover': {
              bgcolor: publicHeader ? 'background.paper' : 'action.hover'
            }
          }}
        >
          <i className='tabler-login-2' />
        </IconButton>
      </Tooltip>
    )
  }

  const destinationLabel = session.canAccessAdmin ? 'Admin Dashboard' : 'My Profile'
  const destinationIcon = session.canAccessAdmin ? 'tabler-layout-dashboard' : 'tabler-user-circle'

  return (
    <>
      <Tooltip title={session.canAccessAdmin ? 'Administrator account' : 'My account'}>
        <IconButton
          ref={anchorRef}
          onClick={() => setOpen(value => !value)}
          aria-label='Open profile menu'
          aria-haspopup='menu'
          aria-expanded={open ? 'true' : undefined}
          sx={{
            p: 0.35,
            border: '1px solid',
            borderColor: publicHeader ? alpha(theme.palette.divider, 0.88) : 'transparent',
            bgcolor: publicHeader
              ? alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.84 : 0.94)
              : 'transparent',
            boxShadow: publicHeader ? theme.shadows[6] : 'none',
            backdropFilter: publicHeader ? 'blur(18px)' : undefined
          }}
        >
          <UserAvatar
            session={session}
            avatarUrl={avatarUrl}
            size={publicHeader ? 42 : 38}
          />
        </IconButton>
      </Tooltip>

      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        sx={{ minWidth: 280, mt: 1.5, zIndex: theme => theme.zIndex.modal + 1 }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps}>
            <Paper
              elevation={12}
              sx={{
                overflow: 'hidden',
                border: settings.skin === 'bordered' ? '1px solid' : undefined,
                borderColor: 'divider',
                borderRadius: 2.5
              }}
            >
              <ClickAwayListener onClickAway={close}>
                <MenuList disablePadding>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.25, py: 2 }}>
                    <UserAvatar session={session} avatarUrl={avatarUrl} size={46} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={800} color='text.primary' noWrap>
                        {session.fullName}
                      </Typography>
                      <Typography variant='body2' color='text.secondary' noWrap>
                        {session.email}
                      </Typography>
                      <Typography variant='caption' color='primary.main' fontWeight={700}>
                        {session.canAccessAdmin ? 'Administrator' : 'Participant'}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider />

                  <Box sx={{ display: 'grid', gap: 0.75, p: 1.25 }}>
                    <Button
                      fullWidth
                      variant='text'
                      color='inherit'
                      startIcon={<i className={destinationIcon} />}
                      onClick={goToProfile}
                      sx={{ justifyContent: 'flex-start', px: 1.5 }}
                    >
                      {destinationLabel}
                    </Button>
                    <Button
                      fullWidth
                      variant='text'
                      color='error'
                      startIcon={<i className='tabler-logout' />}
                      onClick={() => void handleLogout()}
                      sx={{ justifyContent: 'flex-start', px: 1.5 }}
                    >
                      Log out
                    </Button>
                  </Box>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default UserDropdown
