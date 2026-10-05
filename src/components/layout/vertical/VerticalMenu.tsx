import { useTheme } from '@mui/material/styles'
import PerfectScrollbar from 'react-perfect-scrollbar'

import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

import { Menu, MenuItem, SubMenu } from '@menu/vertical-menu'
import useVerticalNav from '@menu/hooks/useVerticalNav'
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
  showEventCategories?: boolean
  showEventManagement?: boolean
  showRegistrations?: boolean
  showCheckIns?: boolean
  showUsers?: boolean
  showArchivedEvents?: boolean
  showAudit?: boolean
  showMicrosite?: boolean
  showRoles?: boolean
  showLegalSettings?: boolean
  showSmtpSettings?: boolean
  showAbout?: boolean
  homeHref?: string
  aboutHref?: string
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='tabler-chevron-right' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({
  scrollMenu,
  showEventCategories = false,
  showEventManagement = false,
  showRegistrations = false,
  showCheckIns = false,
  showUsers = false,
  showArchivedEvents = false,
  showAudit = false,
  showMicrosite = false,
  showRoles = false,
  showLegalSettings = false,
  showSmtpSettings = false,
  showAbout = true,
  homeHref = '/home',
  aboutHref = '/about'
}: Props) => {
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()
  const { isBreakpointReached, transitionDuration } = verticalNavOptions
  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

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
        <MenuItem href={homeHref} icon={<i className='tabler-smart-home' />}>
          Home
        </MenuItem>
        {showEventManagement && (
          <MenuItem href='/admin/events' activeUrl='/admin/events' exactMatch={false} icon={<i className='tabler-calendar-event' />}>
            Event Management
          </MenuItem>
        )}
        {showRegistrations && (
          <MenuItem href='/admin/registrations' icon={<i className='tabler-users-group' />}>
            Registrations
          </MenuItem>
        )}
        {showCheckIns && (
          <MenuItem href='/admin/check-ins' icon={<i className='tabler-qrcode' />}>
            Check-ins
          </MenuItem>
        )}
        {showUsers && (
          <MenuItem href='/admin/users' icon={<i className='tabler-user-cog' />}>
            Users
          </MenuItem>
        )}
        {showArchivedEvents && (
          <MenuItem href='/admin/events/archived' icon={<i className='tabler-archive' />}>
            Archived Events
          </MenuItem>
        )}
        {showAudit && (
          <MenuItem href='/admin/audit' icon={<i className='tabler-history' />}>
            Audit & Activity
          </MenuItem>
        )}
        {showRoles && (
          <MenuItem href='/admin/roles' icon={<i className='tabler-shield-lock' />}>
            Roles & Permissions
          </MenuItem>
        )}
        {showMicrosite && (
          <MenuItem
            href='/admin/microsite'
            activeUrl='/admin/microsite'
            exactMatch={false}
            icon={<i className='tabler-layout-dashboard' />}
          >
            MicroSite
          </MenuItem>
        )}
        {showAbout && (
          <MenuItem href={aboutHref} icon={<i className='tabler-info-circle' />}>
            About
          </MenuItem>
        )}
        {showEventCategories && (
          <SubMenu label='Event Categories' icon={<i className='tabler-category-2' />} defaultOpen>
            <SubMenu label='Olahraga' icon={<i className='tabler-run' />}>
              <MenuItem disabled icon={<i className='tabler-point-filled' />}>
                Lari
              </MenuItem>
            </SubMenu>
            <SubMenu label='Seminar' icon={<i className='tabler-microphone-2' />} defaultOpen>
              <MenuItem href='/events/seminar-ffws-ea851ec' icon={<i className='tabler-device-gamepad-2' />}>
                Seminar FFWS Edit
              </MenuItem>
            </SubMenu>
          </SubMenu>
        )}
        </Menu>
      </ScrollWrapper>

      {(showLegalSettings || showSmtpSettings) && (
        <div
          className='shrink-0'
          style={{
            borderTop: '1px solid var(--mui-palette-divider)',
            paddingTop: 8,
            paddingBottom: 8
          }}
        >
          <Menu {...menuProps}>
            <SubMenu label='Settings' icon={<i className='tabler-settings' />}>
              {showLegalSettings && (
                <MenuItem href='/admin/settings/legal' icon={<i className='tabler-file-certificate' />}>
                  Terms & Privacy
                </MenuItem>
              )}
              {showSmtpSettings && (
                <MenuItem href='/admin/settings/smtp' icon={<i className='tabler-mail-cog' />}>
                  SMTP Email
                </MenuItem>
              )}
            </SubMenu>
          </Menu>
        </div>
      )}
    </div>
  )
}

export default VerticalMenu
