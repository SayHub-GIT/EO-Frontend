'use client'

import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import { alpha, useColorScheme, useTheme } from '@mui/material/styles'

import { useSettings } from '@core/hooks/useSettings'
import UserDropdown from '@/components/layout/shared/UserDropdown'
import PublicFooter from './PublicFooter'

const categories = [
  { label: 'Running', href: '/events/category/running', icon: 'tabler-run' },
  { label: 'Seminar', href: '/events/category/seminar', icon: 'tabler-microphone' },
  { label: 'Workshop', href: '/events/category/workshop', icon: 'tabler-tool' },
  { label: 'Other', href: '/events/category/other', icon: 'tabler-calendar-event' }
]

const PublicNavbar = () => {
  const [eventsAnchor, setEventsAnchor] = useState<HTMLElement | null>(null)
  const [mobileAnchor, setMobileAnchor] = useState<HTMLElement | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const theme = useTheme()
  const { setMode } = useColorScheme()
  const { updateSettings } = useSettings()

  const isDark = theme.palette.mode === 'dark'
  const openEvents = (event: MouseEvent<HTMLElement>) => setEventsAnchor(event.currentTarget)
  const openMobile = (event: MouseEvent<HTMLElement>) => setMobileAnchor(event.currentTarget)

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 28)

    updateScrollState()
    window.addEventListener('scroll', updateScrollState, { passive: true })

    return () => window.removeEventListener('scroll', updateScrollState)
  }, [])

  const handleToggleMode = () => {
    const nextMode = isDark ? 'light' : 'dark'

    setMode(nextMode)
    updateSettings({ mode: nextMode })
  }

  return (
    <Box
      component='header'
      sx={{
        position: 'fixed',
        insetInline: 0,
        top: 0,
        zIndex: theme => theme.zIndex.appBar,
        px: { xs: 1.5, sm: 2, md: 3 },
        pt: { xs: 1.25, md: 2 },
        pointerEvents: 'none'
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1260,
          mx: 'auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: { xs: 1, sm: 1.5 },
          pointerEvents: 'none'
        }}
      >
      <Paper
        elevation={10}
        sx={{
          width: '100%',
          maxWidth: 1180,
          minHeight: { xs: 58, sm: 62, md: 68 },
          mx: 0,
          px: { xs: 1.75, sm: 2.25, md: 3.25 },
          py: { xs: 1, sm: 1.2, md: 1.45 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: { xs: 1, sm: 2 },
          border: '1px solid',
          borderColor: isScrolled
            ? alpha(theme.palette.common.white, isDark ? 0.12 : 0.42)
            : 'divider',
          borderRadius: 999,
          bgcolor: isScrolled
            ? alpha(theme.palette.background.paper, isDark ? 0.58 : 0.64)
            : alpha(theme.palette.background.paper, isDark ? 0.9 : 0.92),
          color: 'text.primary',
          boxShadow: isScrolled
            ? isDark
              ? `0 16px 42px ${alpha(theme.palette.common.black, 0.38)}`
              : `0 16px 42px ${alpha(theme.palette.common.black, 0.16)}`
            : isDark
              ? `0 12px 34px ${alpha(theme.palette.common.black, 0.34)}`
              : `0 12px 34px ${alpha(theme.palette.common.black, 0.14)}`,
          backdropFilter: isScrolled ? 'blur(24px) saturate(180%)' : 'blur(18px)',
          WebkitBackdropFilter: isScrolled ? 'blur(24px) saturate(180%)' : 'blur(18px)',
          pointerEvents: 'auto',
          transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
            duration: theme.transitions.duration.shorter
          })
        }}
      >
        <Box
          component={NextLink}
          href='/home'
          sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', minWidth: 0, flexShrink: 0 }}
        >
          <Box
            component='img'
            src='/EO%20Navbar.png'
            alt='Pertamina Event'
            sx={{ height: { xs: 29, sm: 32, md: 38 }, width: 'auto', maxWidth: { xs: 126, sm: 150 }, objectFit: 'contain' }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 0.75 } }}>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.25 }}>
            <Button component={NextLink} href='/home' variant='text' sx={{ color: 'text.primary' }}>Home</Button>
            <Button
              variant='text'
              endIcon={<i className='tabler-chevron-down' />}
              onClick={openEvents}
              sx={{ color: 'text.primary' }}
            >
              Events
            </Button>
            <Button component={NextLink} href='/about' variant='text' sx={{ color: 'text.primary' }}>About</Button>
          </Box>

          <IconButton
            onClick={handleToggleMode}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
            sx={{
              width: { xs: 38, md: 40 },
              height: { xs: 38, md: 40 },
              color: 'text.primary',
              bgcolor: isScrolled ? alpha(theme.palette.background.paper, isDark ? 0.36 : 0.48) : 'action.hover',
              border: '1px solid',
              borderColor: isScrolled ? alpha(theme.palette.divider, 0.8) : 'divider',
              '&:hover': { bgcolor: 'action.selected' }
            }}
          >
            <i className={isDark ? 'tabler-sun' : 'tabler-moon'} />
          </IconButton>

          <IconButton
            onClick={openMobile}
            sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'text.primary' }}
            aria-label='Open navigation'
          >
            <i className='tabler-menu-2' />
          </IconButton>
        </Box>
      </Paper>

      <Box
        sx={{
          flexShrink: 0,
          pt: { xs: 0.65, sm: 0.85, md: 1.05 },
          pointerEvents: 'auto'
        }}
      >
        <UserDropdown publicHeader />
      </Box>
      </Box>

      <Menu anchorEl={eventsAnchor} open={Boolean(eventsAnchor)} onClose={() => setEventsAnchor(null)}>
        {categories.map(category => (
          <MenuItem
            key={category.href}
            component={NextLink}
            href={category.href}
            onClick={() => setEventsAnchor(null)}
            sx={{ gap: 1.5, minWidth: 190, color: 'text.primary' }}
          >
            <i className={category.icon} /> {category.label}
          </MenuItem>
        ))}
      </Menu>

      <Menu anchorEl={mobileAnchor} open={Boolean(mobileAnchor)} onClose={() => setMobileAnchor(null)}>
        <MenuItem component={NextLink} href='/home' onClick={() => setMobileAnchor(null)} sx={{ gap: 1.5, color: 'text.primary' }}>
          <i className='tabler-home' /> Home
        </MenuItem>
        {categories.map(category => (
          <MenuItem
            key={category.href}
            component={NextLink}
            href={category.href}
            onClick={() => setMobileAnchor(null)}
            sx={{ gap: 1.5, color: 'text.primary' }}
          >
            <i className={category.icon} /> {category.label}
          </MenuItem>
        ))}
        <MenuItem component={NextLink} href='/about' onClick={() => setMobileAnchor(null)} sx={{ gap: 1.5, color: 'text.primary' }}>
          <i className='tabler-info-circle' /> About
        </MenuItem>
      </Menu>
    </Box>
  )
}

const PublicSiteLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()
  const eventDetailRoute = /^\/events\/(?!category\/)[^/]+\/?$/.test(pathname)
  const homeRoute = pathname === '/home' || pathname === '/home/'
  const fullBleedRoute = eventDetailRoute || homeRoute

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary', display: 'flex', flexDirection: 'column' }}>
      <PublicNavbar />
      <Box component='main' sx={{ flex: 1, position: 'relative', pt: fullBleedRoute ? 0 : { xs: 10, md: 12 } }}>
        {children}
      </Box>
      <PublicFooter />
    </Box>
  )
}

export default PublicSiteLayout
