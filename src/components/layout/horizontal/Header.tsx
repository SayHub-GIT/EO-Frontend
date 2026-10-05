'use client'

// Component Imports
import Navigation from './Navigation'
import NavbarContent from './NavbarContent'
import Navbar from '@layouts/components/horizontal/Navbar'
import LayoutHeader from '@layouts/components/horizontal/Header'

// Hook Imports
import useHorizontalNav from '@menu/hooks/useHorizontalNav'

type Props = {
  homeHref?: string
  aboutHref?: string
  showEventManagement?: boolean
  showAudit?: boolean
  showMicrosite?: boolean
  showAbout?: boolean
}

const Header = ({ homeHref, aboutHref, showEventManagement, showAudit, showMicrosite, showAbout }: Props) => {
  // Hooks
  const { isBreakpointReached } = useHorizontalNav()

  return (
    <>
      <LayoutHeader>
        <Navbar>
          <NavbarContent />
        </Navbar>
        {!isBreakpointReached && (
          <Navigation
            homeHref={homeHref}
            aboutHref={aboutHref}
            showEventManagement={showEventManagement}
            showAudit={showAudit}
            showMicrosite={showMicrosite}
            showAbout={showAbout}
          />
        )}
      </LayoutHeader>
      {isBreakpointReached && (
        <Navigation
          homeHref={homeHref}
          aboutHref={aboutHref}
          showEventManagement={showEventManagement}
          showAudit={showAudit}
          showAbout={showAbout}
        />
      )}
    </>
  )
}

export default Header
