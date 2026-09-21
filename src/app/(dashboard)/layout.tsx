// MUI Imports
import Button from '@mui/material/Button'

// Type Imports
import type { ChildrenType } from '@core/types'

// Layout Imports
import LayoutWrapper from '@layouts/LayoutWrapper'
import VerticalLayout from '@layouts/VerticalLayout'
import HorizontalLayout from '@layouts/HorizontalLayout'

// Component Imports
import Providers from '@components/Providers'
import Navigation from '@components/layout/vertical/Navigation'
import Header from '@components/layout/horizontal/Header'
import Navbar from '@components/layout/vertical/Navbar'
import VerticalFooter from '@components/layout/vertical/Footer'
import HorizontalFooter from '@components/layout/horizontal/Footer'
import AdminSessionGuard from '@components/auth/AdminSessionGuard'
import ScrollToTop from '@core/components/scroll-to-top'
import AppBreadcrumbs from '@components/navigation/AppBreadcrumbs'

// Util Imports
import { getMode, getSystemMode } from '@core/utils/serverHelpers'

const Layout = async (props: ChildrenType) => {
  const { children } = props

  const direction = 'ltr'
  const mode = await getMode()
  const systemMode = await getSystemMode()

  return (
    <Providers direction={direction}>
      <AdminSessionGuard>
        <>
          <LayoutWrapper
            systemMode={systemMode}
            verticalLayout={
              <VerticalLayout
                navigation={
                  <Navigation
                    mode={mode}
                    showCreateEvent
                    showEventManagement
                    showCheckIns
                    showUsers
                    showArchivedEvents
                    showAbout
                    homeHref='/admin/home'
                    aboutHref='/admin/about'
                  />
                }
                navbar={<Navbar />}
                footer={<VerticalFooter />}
              >
                <AppBreadcrumbs />
                {children}
              </VerticalLayout>
            }
            horizontalLayout={
              <HorizontalLayout
                header={<Header homeHref='/admin/home' aboutHref='/admin/about' showEventManagement showAbout />}
                footer={<HorizontalFooter />}
              >
                <AppBreadcrumbs />
                {children}
              </HorizontalLayout>
            }
          />
          <ScrollToTop className='mui-fixed'>
            <Button variant='contained' className='is-10 bs-10 rounded-full p-0 min-is-0 flex items-center justify-center'>
              <i className='tabler-arrow-up' />
            </Button>
          </ScrollToTop>
        </>
      </AdminSessionGuard>
    </Providers>
  )
}

export default Layout
