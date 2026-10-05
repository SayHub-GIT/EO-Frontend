'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

import { styled, useColorScheme, useTheme } from '@mui/material/styles'
import PerfectScrollbar from 'react-perfect-scrollbar'

import type { Mode } from '@core/types'
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

import VerticalNav, { NavHeader, NavCollapseIcons } from '@menu/vertical-menu'
import { Menu, MenuItem } from '@menu/vertical-menu'
import Logo from '@components/layout/shared/Logo'

import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'

import navigationCustomStyles from '@core/styles/vertical/navigationCustomStyles'
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

type Props = {
  mode: Mode
}

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='tabler-chevron-right' />
  </StyledVerticalNavExpandIcon>
)

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

const MicrositeNavigation = ({ mode }: Props) => {
  const verticalNavOptions = useVerticalNav()
  const { updateSettings, settings } = useSettings()
  const { mode: muiMode, systemMode: muiSystemMode } = useColorScheme()
  const theme = useTheme()
  const shadowRef = useRef<HTMLDivElement | null>(null)

  const { isCollapsed, isHovered, collapseVerticalNav, isBreakpointReached, transitionDuration } = verticalNavOptions
  const isSemiDark = settings.semiDark
  const currentMode = muiMode === 'system' ? muiSystemMode : muiMode || mode
  const isDark = currentMode === 'dark'
  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  useEffect(() => {
    collapseVerticalNav(settings.layout === 'collapsed')
  }, [collapseVerticalNav, settings.layout])

  const scrollMenu = (container: any, isPerfectScrollbar: boolean) => {
    const target = isBreakpointReached || !isPerfectScrollbar ? container.target : container

    if (!shadowRef.current) return

    shadowRef.current.classList.toggle('scrolled', target.scrollTop > 0)
  }

  const menuProps = {
    popoutMenuOffset: { mainAxis: 23 },
    menuItemStyles: menuItemStyles(verticalNavOptions, theme),
    renderExpandIcon: ({ open }: { open?: boolean }) => (
      <RenderExpandIcon open={open} transitionDuration={transitionDuration} />
    ),
    renderExpandedMenuItemIcon: { icon: <i className='tabler-circle text-xs' /> },
    menuSectionStyles: menuSectionStyles(verticalNavOptions, theme)
  }

  return (
    <VerticalNav
      customStyles={navigationCustomStyles(verticalNavOptions, theme)}
      collapsedWidth={71}
      backgroundColor='var(--mui-palette-background-paper)'
      {...(isSemiDark && !isDark && { 'data-dark': '' })}
    >
      <NavHeader>
        <Link href='/admin/microsite' aria-label='MicroSite overview'>
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

      <div className='flex bs-full min-bs-0 flex-col'>
        <ScrollWrapper
          {...(isBreakpointReached
            ? {
                className: 'min-bs-0 flex-1 overflow-y-auto overflow-x-hidden',
                onScroll: container => scrollMenu(container, false)
              }
            : {
                className: 'min-bs-0 flex-1',
                options: { wheelPropagation: false, suppressScrollX: true },
                onScrollY: container => scrollMenu(container, true)
              })}
        >
          <Menu {...menuProps}>
            <MenuItem
              href='/admin/microsite'
              icon={<i className='tabler-layout-dashboard' />}
            >
              Overview
            </MenuItem>
            <MenuItem
              disabled
              suffix={<span className='text-xs'>Next</span>}
              icon={<i className='tabler-world-www' />}
            >
              My MicroSites
            </MenuItem>
            <MenuItem
              disabled
              suffix={<span className='text-xs'>Next</span>}
              icon={<i className='tabler-template' />}
            >
              Templates
            </MenuItem>
          </Menu>
        </ScrollWrapper>

        <div
          className='shrink-0'
          style={{
            borderTop: '1px solid var(--mui-palette-divider)',
            paddingTop: 8,
            paddingBottom: 8
          }}
        >
          <Menu {...menuProps}>
            <MenuItem
              href='/admin/home'
              icon={<i className='tabler-arrow-left' />}
            >
              Back to Dashboard
            </MenuItem>
          </Menu>
        </div>
      </div>
    </VerticalNav>
  )
}

export default MicrositeNavigation
