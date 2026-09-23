'use client'

import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useRouter } from 'next/navigation'

import { styled } from '@mui/material/styles'
import Badge from '@mui/material/Badge'
import Avatar from '@mui/material/Avatar'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import MenuList from '@mui/material/MenuList'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'

import { useSettings } from '@core/hooks/useSettings'
import { logout, logoutAll, restoreSession } from '@/lib/auth'

const BadgeContentSpan = styled('span')({
  width: 8,
  height: 8,
  borderRadius: '50%',
  cursor: 'pointer',
  backgroundColor: 'var(--mui-palette-success-main)',
  boxShadow: '0 0 0 2px var(--mui-palette-background-paper)'
})

const UserDropdown = () => {
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState({ name: 'Administrator', email: '', avatar: '/owi.jpg' })
  const anchorRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { settings } = useSettings()

  useEffect(() => {
    let active = true

    const loadSession = async () => {
      const session = await restoreSession()
      if (!active || !session) return

      setProfile(previous => ({
        ...previous,
        name: session.fullName || 'Administrator',
        email: session.email || ''
      }))
    }

    void loadSession()

    return () => {
      active = false
    }
  }, [])

  const handleDropdownOpen = () => setOpen(value => !value)

  const handleDropdownClose = (event?: MouseEvent<HTMLLIElement> | (MouseEvent | TouchEvent), url?: string) => {
    if (url) router.push(url)
    if (anchorRef.current && anchorRef.current.contains(event?.target as HTMLElement)) return
    setOpen(false)
  }

  const handleUserLogout = async () => {
    setOpen(false)
    await logout()
    router.replace('/login')
    router.refresh()
  }

  const handleLogoutAll = async () => {
    setOpen(false)
    await logoutAll()
    router.replace('/login')
    router.refresh()
  }

  return (
    <>
      <Badge
        ref={anchorRef}
        overlap='circular'
        badgeContent={<BadgeContentSpan onClick={handleDropdownOpen} />}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        className='mis-2'
      >
        <Avatar ref={anchorRef} alt={profile.name} src={profile.avatar} onClick={handleDropdownOpen} className='cursor-pointer bs-[38px] is-[38px]' />
      </Badge>
      <Popper open={open} transition disablePortal placement='bottom-end' anchorEl={anchorRef.current} className='min-is-[240px] !mbs-3 z-[1]'>
        {({ TransitionProps, placement }) => (
          <Fade {...TransitionProps} style={{ transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top' }}>
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}>
              <ClickAwayListener onClickAway={e => handleDropdownClose(e as MouseEvent | TouchEvent)}>
                <MenuList>
                  <div className='flex items-center plb-2 pli-6 gap-2' tabIndex={-1}>
                    <Avatar alt={profile.name} src={profile.avatar} />
                    <div className='flex items-start flex-col'>
                      <Typography className='font-medium' color='text.primary'>{profile.name}</Typography>
                      <Typography variant='caption'>{profile.email}</Typography>
                    </div>
                  </div>
                  <Divider className='mlb-1' />
                  <div className='flex flex-col items-stretch plb-2 pli-3 gap-2'>
                    <Button
                      fullWidth
                      variant='outlined'
                      color='error'
                      size='small'
                      endIcon={<i className='tabler-devices-off' />}
                      onClick={handleLogoutAll}
                      sx={{ '& .MuiButton-endIcon': { marginInlineStart: 1.5 } }}
                    >
                      Logout all devices
                    </Button>
                    <Button
                      fullWidth
                      variant='contained'
                      color='error'
                      size='small'
                      endIcon={<i className='tabler-logout' />}
                      onClick={handleUserLogout}
                      sx={{ '& .MuiButton-endIcon': { marginInlineStart: 1.5 } }}
                    >
                      Logout
                    </Button>
                  </div>
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
