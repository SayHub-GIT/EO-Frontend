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
  showAllEvents?: boolean
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
  showCreateEvent?: boolean
  showEventEditor?: boolean
  showEventQuiz?: boolean
  showDoorprize?: boolean
  showCertificates?: boolean
  micrositeHref?: string
  showStaffAccess?: boolean
  eventId?: string | null
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
  showAllEvents = true,
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
  showCreateEvent = false,
  showEventEditor = false,
  showEventQuiz = false,
  showDoorprize = false,
  showCertificates = false,
  micrositeHref = '/admin/microsite',
  showStaffAccess = false,
  eventId = null,
  homeHref = '/home',
  aboutHref = '/about'
}: Props) => {
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()
  const { isBreakpointReached, transitionDuration } = verticalNavOptions
  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar
  const eventPath = eventId ? `/admin/events/${encodeURIComponent(eventId)}` : null
  const eventEditorPath = eventPath ? `${eventPath}/edit` : null
  const showAdminMenu = homeHref.startsWith('/admin')

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
          <MenuItem href={homeHref} icon={<i className='tabler-layout-dashboard' />}>
            {showAdminMenu ? 'Dashboard' : 'Home'}
          </MenuItem>

          {(showEventManagement || showMicrosite) && (
            <SubMenu label='Event' icon={<i className='tabler-calendar-event' />}>
              {showEventManagement && showAllEvents && (
                <MenuItem href='/admin/events' icon={<i className='tabler-list-details' />}>
                  All Events
                </MenuItem>
              )}
              {showCreateEvent && (
                <MenuItem href='/admin/events/create' icon={<i className='tabler-plus' />}>
                  Create Event
                </MenuItem>
              )}
              {eventPath && showEventManagement && (
                <SubMenu label='Event Workspace' icon={<i className='tabler-layout-dashboard' />} defaultOpen>
                  <MenuItem href={`${eventPath}/dashboard`}>
                    Event Dashboard
                  </MenuItem>
                  {showEventEditor && eventEditorPath && (
                    <>
                      <MenuItem href={`${eventEditorPath}#event-information`}>Event Information</MenuItem>
                      <MenuItem href={`${eventEditorPath}#event-modules`}>Event Modules</MenuItem>
                      <MenuItem href={`${eventEditorPath}#schedule-capacity`}>Schedule &amp; Capacity</MenuItem>
                      <MenuItem href={`${eventEditorPath}#registration-access`}>Registration Configuration</MenuItem>
                      <MenuItem href={`${eventEditorPath}#additional-information`}>Additional Information Section</MenuItem>
                      <MenuItem href={`${eventEditorPath}#public-content`}>Public / Participant Content</MenuItem>
                    </>
                  )}
                  {showEventQuiz && (
                    <MenuItem href={showEventEditor && eventEditorPath ? `${eventEditorPath}#quiz-configuration` : `${eventPath}/quiz`}>
                      Quiz Configuration
                    </MenuItem>
                  )}
                  {showDoorprize && (
                    <MenuItem href={`${eventPath}/modules/doorprize`}>Doorprize Configuration</MenuItem>
                  )}
                  {showEventEditor && (
                    <MenuItem href={`${eventPath}/modules/race-pack`}>Merchandise</MenuItem>
                  )}
                  {showCertificates && (
                    <MenuItem href={`${eventPath}/modules/certificates`}>E-Certificate</MenuItem>
                  )}
                  {showRegistrations && (
                    <MenuItem href={`${eventPath}/registrations`}>Participant Management</MenuItem>
                  )}
                  {showStaffAccess && (
                    <MenuItem href={`${eventPath}/staff-access`}>Event Staff Access</MenuItem>
                  )}
                </SubMenu>
              )}
              {showMicrosite && (
                <MenuItem href={micrositeHref} icon={<i className='tabler-world-www' />}>
                  Template MicroSite
                </MenuItem>
              )}
            </SubMenu>
          )}

          {showAdminMenu && (
            <MenuItem disabled icon={<i className='tabler-mail-forward' />}>
              Invitation (coming soon)
            </MenuItem>
          )}
          {showCheckIns && (
            <MenuItem
              href={eventId ? `/admin/check-ins?eventId=${encodeURIComponent(eventId)}` : '/admin/check-ins'}
              icon={<i className='tabler-qrcode' />}
            >
              Check-in
            </MenuItem>
          )}
          {(showUsers || showRoles) && (
            <SubMenu label='User Management' icon={<i className='tabler-users-group' />}>
              {showUsers && (
                <MenuItem href='/admin/users' icon={<i className='tabler-user-cog' />}>Users</MenuItem>
              )}
              {showRoles && (
                <MenuItem href='/admin/roles' icon={<i className='tabler-shield-lock' />}>Roles &amp; Permissions</MenuItem>
              )}
            </SubMenu>
          )}
          {showArchivedEvents && (
            <MenuItem href='/admin/events/archived' icon={<i className='tabler-archive' />}>
              Event Archive
            </MenuItem>
          )}
          {showAudit && (
            <MenuItem href='/admin/audit' icon={<i className='tabler-history' />}>
              Activity Logs
            </MenuItem>
          )}
          {showEventManagement && (
            eventPath ? (
              <MenuItem href={`${eventPath}/modules/reports`} icon={<i className='tabler-chart-bar' />}>
                Reports
              </MenuItem>
            ) : (
              <MenuItem disabled icon={<i className='tabler-chart-bar' />}>
                Reports (select an event)
              </MenuItem>
            )
          )}
          {(showLegalSettings || showSmtpSettings) && (
            <SubMenu label='Settings' icon={<i className='tabler-settings' />}>
              {showLegalSettings && (
                <MenuItem href='/admin/settings/legal' icon={<i className='tabler-file-text' />}>Terms &amp; Privacy</MenuItem>
              )}
              {showSmtpSettings && (
                <MenuItem href='/admin/settings/smtp' icon={<i className='tabler-mail-cog' />}>SMTP Email</MenuItem>
              )}
            </SubMenu>
          )}
          {showAbout && (
            <MenuItem href={aboutHref} icon={<i className='tabler-info-circle' />}>About</MenuItem>
          )}
          {showEventCategories && (
            <SubMenu label='Event Categories' icon={<i className='tabler-category-2' />} defaultOpen>
              <SubMenu label='Olahraga' icon={<i className='tabler-run' />}>
                <MenuItem disabled icon={<i className='tabler-point-filled' />}>Lari</MenuItem>
              </SubMenu>
              <SubMenu label='Seminar' icon={<i className='tabler-microphone-2' />} defaultOpen>
                <MenuItem href='/events/seminar-ffws-ea851ec' icon={<i className='tabler-device-gamepad-2' />}>Seminar FFWS Edit</MenuItem>
              </SubMenu>
            </SubMenu>
          )}
        </Menu>
      </ScrollWrapper>

    </div>
  )
}

export default VerticalMenu
