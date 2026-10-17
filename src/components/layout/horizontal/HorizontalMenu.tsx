'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

// MUI Imports
import { useTheme } from '@mui/material/styles'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import HorizontalNav, { Menu, MenuItem, SubMenu } from '@menu/horizontal-menu'
import VerticalNavContent from './VerticalNavContent'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { hasPermission, restoreSession, type AdminSession } from '@/lib/auth'
import { getCurrentEventWorkspace, type EventWorkspaceContext } from '@/lib/event-workspace'
import { authorizedSidebarEventId, sidebarAllowsPermission } from '@/lib/workspace-sidebar'
import { getAttendanceNavigationVisibility } from '@/lib/attendance-navigation'

// Styled Component Imports
import StyledHorizontalNavExpandIcon from '@menu/styles/horizontal/StyledHorizontalNavExpandIcon'
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/horizontal/menuItemStyles'
import menuRootStyles from '@core/styles/horizontal/menuRootStyles'
import verticalNavigationCustomStyles from '@core/styles/vertical/navigationCustomStyles'
import verticalMenuItemStyles from '@core/styles/vertical/menuItemStyles'
import verticalMenuSectionStyles from '@core/styles/vertical/menuSectionStyles'

type RenderExpandIconProps = {
  level?: number
}

type RenderVerticalExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

const RenderExpandIcon = ({ level }: RenderExpandIconProps) => (
  <StyledHorizontalNavExpandIcon level={level}>
    <i className='tabler-chevron-right' />
  </StyledHorizontalNavExpandIcon>
)

const RenderVerticalExpandIcon = ({ open, transitionDuration }: RenderVerticalExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='tabler-chevron-right' />
  </StyledVerticalNavExpandIcon>
)

type Props = {
  homeHref?: string
  aboutHref?: string
  showEventManagement?: boolean
  showAudit?: boolean
  showMicrosite?: boolean
  showAbout?: boolean
}

const HorizontalMenu = ({
  homeHref = '/home',
  aboutHref = '/about',
  showEventManagement = false,
  showAudit = false,
  showMicrosite = false,
  showAbout = true
}: Props) => {
  // Hooks
  const verticalNavOptions = useVerticalNav()
  const theme = useTheme()
  const [session, setSession] = useState<AdminSession | null>(null)
  const [workspace, setWorkspace] = useState<EventWorkspaceContext | null>(null)
  const pathname = usePathname()
  const isAdminNavigation = homeHref.startsWith('/admin')
  const routeMatch = pathname?.match(/^\\/admin\\/events\\/([^/]+)(?:\\/|$)/)
  const routeSegment = routeMatch?.[1] ?? null
  const routeEventId = routeSegment && routeSegment !== 'create' && routeSegment !== 'archived'
    ? decodeURIComponent(routeSegment)
    : null
  const eventId = isAdminNavigation ? authorizedSidebarEventId(workspace, routeEventId) : routeEventId
  const canManageGlobally = !isAdminNavigation || workspace?.isGlobalAdmin === true
  const allowed = (permission: string) =>
    isAdminNavigation
      ? sidebarAllowsPermission(workspace, permission, hasPermission(session, permission))
      : hasPermission(session, permission)
  const attendanceNavigation = getAttendanceNavigationVisibility(
    allowed('attendance.checkin'),
    allowed('attendance.checkout'),
    allowed('attendance.read'),
    eventId
  )
  const checkInHref = eventId
    ? `/admin/check-ins?eventId=${encodeURIComponent(eventId)}`
    : '/admin/check-ins'

  useEffect(() => {
    let active = true
    void restoreSession().then(async value => {
      if (!active) return
      setSession(value)
      if (!isAdminNavigation || !value?.canAccessAdmin) return
      try {
        const context = await getCurrentEventWorkspace()
        if (active) setWorkspace(context)
      } catch {
        if (active) setWorkspace(null)
      }
    })
    return () => { active = false }
  }, [isAdminNavigation])

  const { transitionDuration } = verticalNavOptions

  return (
    <HorizontalNav
      switchToVertical
      verticalNavContent={VerticalNavContent}
      verticalNavProps={{
        customStyles: verticalNavigationCustomStyles(verticalNavOptions, theme),
        backgroundColor: 'var(--mui-palette-background-paper)'
      }}
    >
      <Menu
        rootStyles={menuRootStyles(theme)}
        renderExpandIcon={({ level }) => <RenderExpandIcon level={level} />}
        menuItemStyles={menuItemStyles(theme, 'tabler-circle')}
        renderExpandedMenuItemIcon={{ icon: <i className='tabler-circle text-xs' /> }}
        popoutMenuOffset={{
          mainAxis: ({ level }) => (level && level > 0 ? 14 : 12),
          alignmentAxis: 0
        }}
        verticalMenuProps={{
          menuItemStyles: verticalMenuItemStyles(verticalNavOptions, theme),
          renderExpandIcon: ({ open }) => (
            <RenderVerticalExpandIcon open={open} transitionDuration={transitionDuration} />
          ),
          renderExpandedMenuItemIcon: { icon: <i className='tabler-circle text-xs' /> },
          menuSectionStyles: verticalMenuSectionStyles(verticalNavOptions, theme)
        }}
      >
        <MenuItem href={homeHref} icon={<i className='tabler-smart-home' />}>
          Home
        </MenuItem>
        {showEventManagement && allowed('event.read') && (
          <MenuItem
            href={canManageGlobally ? '/admin/events' : eventId ? `/admin/events/${encodeURIComponent(eventId)}/dashboard` : '/admin/home'}
            activeUrl='/admin/events'
            exactMatch={false}
            icon={<i className='tabler-calendar-event' />}
          >
            Event Management
          </MenuItem>
        )}
        {showAudit && canManageGlobally && allowed('audit.read') && (
          <MenuItem href='/admin/audit' icon={<i className='tabler-history' />}>
            Audit & Activity
          </MenuItem>
        )}
        {canManageGlobally && allowed('users.read') && (
          <MenuItem href='/admin/users' icon={<i className='tabler-user-cog' />}>
            Users
          </MenuItem>
        )}
        {canManageGlobally && allowed('roles.read') && (
          <MenuItem href='/admin/roles' icon={<i className='tabler-shield-lock' />}>
            Roles
          </MenuItem>
        )}
        {showMicrosite && allowed('microsite.read') && (
          <MenuItem
            href={!canManageGlobally && eventId ? `/admin/microsite/sites/${encodeURIComponent(eventId)}` : '/admin/microsite'}
            activeUrl='/admin/microsite'
            exactMatch={false}
            icon={<i className='tabler-layout-dashboard' />}
          >
            MicroSite
          </MenuItem>
        )}
        {isAdminNavigation && attendanceNavigation.checkInAndOut && (
          <MenuItem href={checkInHref} icon={<i className='tabler-qrcode' />}>
            Check-in &amp; Out
          </MenuItem>
        )}
        {isAdminNavigation && attendanceNavigation.listAttendance && eventId && (
          <MenuItem href={`/admin/events/${encodeURIComponent(eventId)}/attendance`} icon={<i className='tabler-clipboard-list' />}>
            List Attendance
          </MenuItem>
        )}
        {showAbout && (
          <MenuItem href={aboutHref} icon={<i className='tabler-info-circle' />}>
            About
          </MenuItem>
        )}
        {canManageGlobally && (allowed('legal.read') || allowed('settings.read')) && (
          <SubMenu label='Settings' icon={<i className='tabler-settings' />}>
            {allowed('legal.read') && (
              <MenuItem href='/admin/settings/legal' icon={<i className='tabler-file-certificate' />}>
                Terms &amp; Privacy
              </MenuItem>
            )}
            {allowed('settings.read') && (
              <MenuItem href='/admin/settings/smtp' icon={<i className='tabler-mail-cog' />}>
                SMTP Email
              </MenuItem>
            )}
          </SubMenu>
        )}
      </Menu>
      {/* <Menu
        rootStyles={menuRootStyles(theme)}
        renderExpandIcon={({ level }) => <RenderExpandIcon level={level} />}
        menuItemStyles={menuItemStyles(theme, 'tabler-circle')}
        renderExpandedMenuItemIcon={{ icon: <i className='tabler-circle text-xs' /> }}
        popoutMenuOffset={{
          mainAxis: ({ level }) => (level && level > 0 ? 14 : 12),
          alignmentAxis: 0
        }}
        verticalMenuProps={{
          menuItemStyles: verticalMenuItemStyles(verticalNavOptions, theme),
          renderExpandIcon: ({ open }) => (
            <RenderVerticalExpandIcon open={open} transitionDuration={transitionDuration} />
          ),
          renderExpandedMenuItemIcon: { icon: <i className='tabler-circle text-xs' /> },
          menuSectionStyles: verticalMenuSectionStyles(verticalNavOptions, theme)
        }}
      >
        <GenerateHorizontalMenu menuData={menuData(dictionary)} />
      </Menu> */}
    </HorizontalNav>
  )
}

export default HorizontalMenu
