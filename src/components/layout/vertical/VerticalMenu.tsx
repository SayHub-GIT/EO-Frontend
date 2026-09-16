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
  showAbout = true,
  homeHref = '/home',
  aboutHref = '/about'
}: Props) => {
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()
  const { isBreakpointReached, transitionDuration } = verticalNavOptions
  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  return (
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
            className: 'bs-full overflow-y-auto overflow-x-hidden',
            onScroll: container => scrollMenu(container, false)
          }
        : {
            options: { wheelPropagation: false, suppressScrollX: true },
            onScrollY: container => scrollMenu(container, true)
          })}
    >
      <Menu
        popoutMenuOffset={{ mainAxis: 23 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='tabler-circle text-xs' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
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
  )
}

export default VerticalMenu
