'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { styled, useColorScheme, useTheme } from '@mui/material/styles'
import Button from '@mui/material/Button'

import type { Mode } from '@core/types'

import VerticalNav, { NavHeader, NavCollapseIcons } from '@menu/vertical-menu'
import VerticalMenu from './VerticalMenu'
import Logo from '@components/layout/shared/Logo'
import { hasPermission, restoreSession, type AdminSession } from '@/lib/auth'
import { assignedDashboardPath, getCurrentEventWorkspace, type EventWorkspaceContext } from '@/lib/event-workspace'

import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'

import navigationCustomStyles from '@core/styles/vertical/navigationCustomStyles'

type Props = {
  mode: Mode
  showCreateEvent?: boolean
  showEventCategories?: boolean
  showEventManagement?: boolean
  showRegistrations?: boolean
  showCheckIns?: boolean
  showUsers?: boolean
  showArchivedEvents?: boolean
  showAudit?: boolean
  showMicrosite?: boolean
  showAbout?: boolean
  homeHref?: string
  aboutHref?: string
}

const StyledBoxForShadow = styled('div')(({ theme }) => ({
  top: 60,
  left: -8,
  zIndex: 2,
  opacity: 0,
  position: 'absolute',
  pointerEvents: 'none',
  width: 'calc(100% + 15px)',
  height: theme.mixins.toolbar.minHeight,
  transition: 'opacity .15s ease-in-out',
  background: `linear-gradient(var(--mui-palette-background-paper) ${
    theme.direction === 'rtl' ? '95%' : '5%'
  }, rgb(var(--mui-palette-background-paperChannel) / 0.85) 30%, rgb(var(--mui-palette-background-paperChannel) / 0.5) 65%, rgb(var(--mui-palette-background-paperChannel) / 0.3) 75%, transparent)`,
  '&.scrolled': { opacity: 1 }
}))

const Navigation = (props: Props) => {
  const {
    mode,
    showCreateEvent = false,
    showEventCategories = false,
    showEventManagement = false,
    showRegistrations = false,
    showCheckIns = false,
    showUsers = false,
    showArchivedEvents = false,
    showAudit = false,
    showMicrosite = false,
    showAbout = true,
    homeHref = '/home',
    aboutHref = '/about'
  } = props

  const verticalNavOptions = useVerticalNav()
  const { updateSettings, settings } = useSettings()
  const { mode: muiMode, systemMode: muiSystemMode } = useColorScheme()
  const theme = useTheme()
  const shadowRef = useRef(null)
  const [session, setSession] = useState<AdminSession | null>(null)
  const [workspace, setWorkspace] = useState<EventWorkspaceContext | null>(null)
  const pathname = usePathname()
  const eventRouteMatch = pathname?.match(/^\/admin\/events\/([^/]+)(?:\/|$)/)
  const eventSegment = eventRouteMatch?.[1] ?? null
  const routeEventId = eventSegment && eventSegment !== 'create' && eventSegment !== 'archived'
    ? decodeURIComponent(eventSegment)
    : null
  const isScopedAdmin = workspace?.isGlobalAdmin === false
  const scopedEventId = workspace?.status === 'assigned' ? workspace.eventId : null
  const eventId = isScopedAdmin ? scopedEventId : routeEventId
  const effectiveHomeHref = isScopedAdmin
    ? assignedDashboardPath(workspace) ?? '/admin/home'
    : homeHref
  const canManageGlobally = !homeHref.startsWith('/admin') || workspace?.isGlobalAdmin === true
  const allowed = (permission: string) =>
    isScopedAdmin
      ? workspace?.status === 'assigned' && workspace.permissions.includes(permission)
      : hasPermission(session, permission)
  const allowedAny = (...permissions: string[]) => permissions.some(allowed)
  const micrositeHref = isScopedAdmin && eventId
    ? `/admin/microsite/sites/${encodeURIComponent(eventId)}`
    : '/admin/microsite'

  const { isCollapsed, isHovered, collapseVerticalNav, isBreakpointReached } = verticalNavOptions
  const isSemiDark = settings.semiDark
  const currentMode = muiMode === 'system' ? muiSystemMode : muiMode || mode
  const isDark = currentMode === 'dark'

  const scrollMenu = (container: any, isPerfectScrollbar: boolean) => {
    container = isBreakpointReached || !isPerfectScrollbar ? container.target : container

    if (shadowRef && container.scrollTop > 0) {
      // @ts-ignore
      if (!shadowRef.current.classList.contains('scrolled')) {
        // @ts-ignore
        shadowRef.current.classList.add('scrolled')
      }
    } else {
      // @ts-ignore
      shadowRef.current.classList.remove('scrolled')
    }
  }

  useEffect(() => {
    collapseVerticalNav(settings.layout === 'collapsed')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.layout])

  useEffect(() => {
    let active = true

    const load = async () => {
      const value = await restoreSession()
      if (!active) return

      setSession(value)

      if (!value?.canAccessAdmin) return

      try {
        const resolved = await getCurrentEventWorkspace()
        if (active) setWorkspace(resolved)
      } catch {
        if (active) setWorkspace(null)
      }
    }

    void load()
    return () => { active = false }
  }, [])

  return (
    <VerticalNav
      customStyles={navigationCustomStyles(verticalNavOptions, theme)}
      collapsedWidth={71}
      backgroundColor='var(--mui-palette-background-paper)'
      {...(isSemiDark && !isDark && { 'data-dark': '' })}
    >
      <NavHeader>
        <Link href={effectiveHomeHref}>
          <Logo />
        </Link>
        {!(isCollapsed && !isHovered) && (
          <NavCollapseIcons
            lockedIcon={<i className='tabler-circle-dot text-xl' />}
            unlockedIcon={<i className='tabler-circle text-xl' />}
            closeIcon={<i className='tabler-x text-xl' />}
            onClick={() => updateSettings({ layout: !isCollapsed ? 'collapsed' : 'vertical' })}
          />
        )}
      </NavHeader>
      <StyledBoxForShadow ref={shadowRef} />
      {showCreateEvent && canManageGlobally && hasPermission(session, 'event.create') && !(isCollapsed && !isHovered) && (
        <Button
          component={Link}
          href='/admin/events/create'
          variant='contained'
          startIcon={<i className='tabler-plus' />}
          sx={{
            mx: 2,
            mb: 2,
            width: 'calc(100% - 20px)',
            minHeight: 42,
            borderRadius: 1.5,
            justifyContent: 'flex-start',
            px: 2.5,
            boxShadow: 'none'
          }}
        >
          Create event
        </Button>
      )}
      <VerticalMenu
        scrollMenu={scrollMenu}
        showEventCategories={showEventCategories}
        showEventManagement={showEventManagement && allowed('event.read') && (!isScopedAdmin || Boolean(scopedEventId))}
        showAllEvents={canManageGlobally}
        showRegistrations={showRegistrations && allowed('registration.read')}
        showCheckIns={showCheckIns && allowedAny('attendance.read', 'attendance.checkin')}
        showUsers={canManageGlobally && showUsers && hasPermission(session, 'users.read')}
        showArchivedEvents={canManageGlobally && showArchivedEvents && hasPermission(session, 'event.archive')}
        showAudit={canManageGlobally && showAudit && hasPermission(session, 'audit.read')}
        showMicrosite={showMicrosite && allowed('microsite.read')}
        micrositeHref={micrositeHref}
        showCreateEvent={canManageGlobally && showCreateEvent && hasPermission(session, 'event.create')}
        showEventEditor={allowed('event.update')}
        showEventQuiz={allowedAny('quiz.manage', 'quiz.read')}
        showDoorprize={allowedAny('doorprize.read', 'doorprize.manage')}
        showCertificates={allowedAny('certificates.read', 'certificates.manage')}
        showStaffAccess={canManageGlobally && session?.role.toLowerCase() === 'admin' && hasPermission(session, 'roles.manage')}
        eventId={eventId}
        showRoles={canManageGlobally && hasPermission(session, 'roles.read')}
        showLegalSettings={canManageGlobally && hasPermission(session, 'legal.read')}
        showSmtpSettings={canManageGlobally && hasPermission(session, 'settings.read')}
        showAbout={showAbout}
        homeHref={effectiveHomeHref}
        aboutHref={aboutHref}
      />
    </VerticalNav>
  )
}

export default Navigation
