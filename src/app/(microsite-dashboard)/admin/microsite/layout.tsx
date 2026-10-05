import Button from '@mui/material/Button'

import type { ChildrenType } from '@core/types'

import LayoutWrapper from '@layouts/LayoutWrapper'
import VerticalLayout from '@layouts/VerticalLayout'

import Providers from '@components/Providers'
import MicrositeNavigation from '@components/microsite/MicrositeNavigation'
import Navbar from '@components/layout/vertical/Navbar'
import VerticalFooter from '@components/layout/vertical/Footer'
import AdminSessionGuard from '@components/auth/AdminSessionGuard'
import AppBreadcrumbs from '@components/navigation/AppBreadcrumbs'
import ScrollToTop from '@core/components/scroll-to-top'

import { getMode, getSystemMode } from '@core/utils/serverHelpers'

const Layout = async ({ children }: ChildrenType) => {
  const direction = 'ltr'
  const mode = await getMode()
  const systemMode = await getSystemMode()

  const workspace = (
    <VerticalLayout
      navigation={<MicrositeNavigation mode={mode} />}
      navbar={<Navbar />}
      footer={<VerticalFooter />}
    >
      <AppBreadcrumbs />
      {children}
    </VerticalLayout>
  )

  return (
    <Providers direction={direction}>
      <AdminSessionGuard>
        <>
          <LayoutWrapper
            systemMode={systemMode}
            verticalLayout={workspace}
            horizontalLayout={workspace}
          />
          <ScrollToTop className='mui-fixed'>
            <Button
              variant='contained'
              className='is-10 bs-10 rounded-full p-0 min-is-0 flex items-center justify-center'
              aria-label='Scroll to top'
            >
              <i className='tabler-arrow-up' />
            </Button>
          </ScrollToTop>
        </>
      </AdminSessionGuard>
    </Providers>
  )
}

export default Layout
