'use client'

import {
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode
} from 'react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { useColorScheme, useTheme } from '@mui/material/styles'
import type { SxProps, Theme } from '@mui/material/styles'

import { useSettings } from '@core/hooks/useSettings'
import UserDropdown from '@/components/layout/shared/UserDropdown'
import PublicEventSearch from './PublicEventSearch'
import PublicFooter from './PublicFooter'

const categories = [
  { label: 'Running', href: '/events/category/running', icon: 'tabler-run' },
  { label: 'Seminar', href: '/events/category/seminar', icon: 'tabler-microphone' },
  { label: 'Workshop', href: '/events/category/workshop', icon: 'tabler-tool' },
  { label: 'Other', href: '/events/category/other', icon: 'tabler-calendar-event' }
]

const PublicNavbar = () => {
  const pathname = usePathname()
  const [eventsAnchor, setEventsAnchor] = useState<HTMLElement | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const theme = useTheme()
  const { setMode } = useColorScheme()
  const { updateSettings } = useSettings()

  const isDark = theme.palette.mode === 'dark'
  const homeActive = pathname === '/home' || pathname === '/home/'
  const eventsActive = pathname === '/events' || pathname.startsWith('/events/')
  const aboutActive = pathname === '/about' || pathname.startsWith('/about/')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleMode = () => {
    const nextMode = isDark ? 'light' : 'dark'

    setMode(nextMode)
    updateSettings({ mode: nextMode })
  }

  const openEvents = (event: MouseEvent<HTMLElement>) =>
    setEventsAnchor(event.currentTarget)

  const closeMobile = () => setMobileOpen(false)

  const navButtonSx = (active: boolean): SxProps<Theme> => ({
    minHeight: 68,
    px: 1.75,
    borderRadius: 0,
    color: active ? 'primary.main' : 'text.primary',
    fontWeight: active ? 750 : 600,
    fontSize: '0.9rem',
    position: 'relative',
    ...(active
      ? {
          '&::after': {
            content: '""',
            position: 'absolute',
            insetInline: 14,
            bottom: 0,
            height: 2,
            bgcolor: 'primary.main'
          }
        }
      : {}),
    '&:hover': {
      bgcolor: 'transparent',
      color: 'primary.main'
    }
  })

  return (
    <>
      <Box
        component='header'
        sx={{
          position: 'fixed',
          insetInline: 0,
          top: 0,
          zIndex: theme => theme.zIndex.appBar,
          height: { xs: 60, md: 68 },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          boxShadow: scrolled ? '0 2px 10px rgba(8, 31, 56, 0.06)' : 'none',
          transition: theme.transitions.create('box-shadow', {
            duration: theme.transitions.duration.shortest
          })
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1440,
            height: '100%',
            mx: 'auto',
            px: { xs: 2, sm: 3, lg: 4 },
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr auto',
              md: 'auto 1fr auto',
              lg: 'auto auto minmax(260px, 1fr) auto'
            },
            alignItems: 'center',
            gap: { xs: 1, md: 2, lg: 3 }
          }}
        >
          <Box
            component={NextLink}
            href='/home'
            aria-label='Pertamina Event home'
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              width: 'fit-content',
              textDecoration: 'none'
            }}
          >
            <Box
              component='img'
              src='/EO%20Navbar.png'
              alt='Pertamina Event'
              sx={{
                display: 'block',
                width: 'auto',
                height: { xs: 28, sm: 30, md: 34 },
                maxWidth: 148,
                objectFit: 'contain'
              }}
            />
          </Box>

          <Box
            component='nav'
            aria-label='Primary navigation'
            sx={{
              display: { xs: 'none', lg: 'flex' },
              alignItems: 'center',
              height: '100%'
            }}
          >
            <Button
              component={NextLink}
              href='/home'
              variant='text'
              sx={navButtonSx(homeActive)}
            >
              Home
            </Button>
            <Button
              variant='text'
              endIcon={<i className='tabler-chevron-down text-sm' aria-hidden='true' />}
              onClick={openEvents}
              aria-haspopup='menu'
              aria-expanded={Boolean(eventsAnchor)}
              sx={navButtonSx(eventsActive)}
            >
              Events
            </Button>
            <Button
              component={NextLink}
              href='/about'
              variant='text'
              sx={navButtonSx(aboutActive)}
            >
              About
            </Button>
          </Box>

          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              justifySelf: 'end',
              width: { md: 260, lg: 'min(100%, 380px)' }
            }}
          >
            <PublicEventSearch />
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifySelf: 'end',
              gap: { xs: 0.5, sm: 1 }
            }}
          >
            <IconButton
              onClick={toggleMode}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Light mode' : 'Dark mode'}
              sx={{
                width: 40,
                height: 40,
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: 'action.hover',
                  color: 'text.primary'
                }
              }}
            >
              <i className={isDark ? 'tabler-sun' : 'tabler-moon'} />
            </IconButton>

            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <UserDropdown publicHeader />
            </Box>

            <IconButton
              onClick={() => setMobileOpen(true)}
              aria-label='Open navigation'
              sx={{
                display: { xs: 'inline-flex', lg: 'none' },
                width: 40,
                height: 40,
                color: 'text.primary'
              }}
            >
              <i className='tabler-menu-2' />
            </IconButton>
          </Box>
        </Box>
      </Box>

      <Menu
        anchorEl={eventsAnchor}
        open={Boolean(eventsAnchor)}
        onClose={() => setEventsAnchor(null)}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              mt: 0.75,
              minWidth: 210,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2
            }
          }
        }}
      >
        {categories.map(category => (
          <MenuItem
            key={category.href}
            component={NextLink}
            href={category.href}
            onClick={() => setEventsAnchor(null)}
            sx={{ gap: 1.5, minHeight: 44 }}
          >
            <i className={category.icon} aria-hidden='true' />
            {category.label}
          </MenuItem>
        ))}
      </Menu>

      <Drawer
        anchor='right'
        open={mobileOpen}
        onClose={closeMobile}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: 'min(88vw, 380px)',
            bgcolor: 'background.paper'
          }
        }}
      >
        <Box
          sx={{
            minHeight: 60,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography fontWeight={800}>Pertamina Event</Typography>
          <IconButton onClick={closeMobile} aria-label='Close navigation'>
            <i className='tabler-x' />
          </IconButton>
        </Box>

        <Divider />

        <Box sx={{ p: 2 }}>
          <PublicEventSearch compact onNavigate={closeMobile} />
        </Box>

        <List sx={{ px: 1, pb: 1 }}>
          <ListItemButton
            component={NextLink}
            href='/home'
            selected={homeActive}
            onClick={closeMobile}
            sx={{ minHeight: 48, borderRadius: 1.5 }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}>
              <i className='tabler-home' />
            </ListItemIcon>
            <ListItemText primary='Home' />
          </ListItemButton>

          <ListItemButton
            component={NextLink}
            href='/home#event-categories'
            selected={eventsActive}
            onClick={closeMobile}
            sx={{ minHeight: 48, borderRadius: 1.5 }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}>
              <i className='tabler-calendar-event' />
            </ListItemIcon>
            <ListItemText primary='Events' />
          </ListItemButton>

          {categories.map(category => (
            <ListItemButton
              key={category.href}
              component={NextLink}
              href={category.href}
              selected={pathname === category.href}
              onClick={closeMobile}
              sx={{ minHeight: 44, ml: 2, borderRadius: 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 34 }}>
                <i className={category.icon} />
              </ListItemIcon>
              <ListItemText primary={category.label} />
            </ListItemButton>
          ))}

          <ListItemButton
            component={NextLink}
            href='/about'
            selected={aboutActive}
            onClick={closeMobile}
            sx={{ minHeight: 48, borderRadius: 1.5 }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}>
              <i className='tabler-info-circle' />
            </ListItemIcon>
            <ListItemText primary='About' />
          </ListItemButton>
        </List>

        <Divider />

        <Box sx={{ p: 2, display: { xs: 'block', sm: 'none' } }}>
          <UserDropdown publicHeader />
        </Box>
      </Drawer>
    </>
  )
}

const PublicSiteLayout = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      minHeight: '100dvh',
      bgcolor: 'background.default',
      color: 'text.primary',
      display: 'flex',
      flexDirection: 'column'
    }}
  >
    <PublicNavbar />
    <Box
      component='main'
      sx={{
        flex: 1,
        position: 'relative',
        pt: { xs: '60px', md: '68px' }
      }}
    >
      {children}
    </Box>
    <PublicFooter />
  </Box>
)

export default PublicSiteLayout
