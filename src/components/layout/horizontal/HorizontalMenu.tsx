'use client'

import { useEffect, useState } from 'react'

// MUI Imports
import { useTheme } from '@mui/material/styles'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import HorizontalNav, { Menu, MenuItem } from '@menu/horizontal-menu'
import VerticalNavContent from './VerticalNavContent'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { hasPermission, restoreSession, type AdminSession } from '@/lib/auth'

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
  showAbout?: boolean
}

const HorizontalMenu = ({
  homeHref = '/home',
  aboutHref = '/about',
  showEventManagement = false,
  showAudit = false,
  showAbout = true
}: Props) => {
  // Hooks
  const verticalNavOptions = useVerticalNav()
  const theme = useTheme()
  const [session, setSession] = useState<AdminSession | null>(null)

  useEffect(() => {
    let active = true
    void restoreSession().then(value => {
      if (active) setSession(value)
    })
    return () => { active = false }
  }, [])

  // Vars
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
        {showEventManagement && hasPermission(session, 'event.read') && (
          <MenuItem
            href='/admin/events'
            activeUrl='/admin/events'
            exactMatch={false}
            icon={<i className='tabler-calendar-event' />}
          >
            Event Management
          </MenuItem>
        )}
        {showAudit && hasPermission(session, 'audit.read') && (
          <MenuItem href='/admin/audit' icon={<i className='tabler-history' />}>
            Audit & Activity
          </MenuItem>
        )}
        {hasPermission(session, 'users.read') && (
          <MenuItem href='/admin/users' icon={<i className='tabler-user-cog' />}>
            Users
          </MenuItem>
        )}
        {hasPermission(session, 'roles.read') && (
          <MenuItem href='/admin/roles' icon={<i className='tabler-shield-lock' />}>
            Roles
          </MenuItem>
        )}
        {hasPermission(session, 'legal.read') && (
          <MenuItem href='/admin/settings/legal' icon={<i className='tabler-file-certificate' />}>
            Terms & Privacy
          </MenuItem>
        )}
        {hasPermission(session, 'settings.read') && (
          <>
            <MenuItem href='/admin/settings/smtp' icon={<i className='tabler-mail-cog' />}>
              SMTP
            </MenuItem>
            <MenuItem href='/admin/settings/page-builder' icon={<i className='tabler-layout-dashboard' />}>
              Page Builder
            </MenuItem>
          </>
        )}
        {showAbout && (
          <MenuItem href={aboutHref} icon={<i className='tabler-info-circle' />}>
            About
          </MenuItem>
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
