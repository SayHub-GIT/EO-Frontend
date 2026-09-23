// MUI Imports
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css'

// Type Imports
import type { Metadata } from 'next'
import type { ChildrenType } from '@core/types'

// Component Imports
import BrowserTabMetadata from '@components/navigation/BrowserTabMetadata'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

// Style Imports
import '@/app/globals.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'

export const metadata: Metadata = {
  title: {
    default: 'PTC Event Management',
    template: '%s | PTC Event Management'
  },
  description: 'Event management system by PTC',
  icons: {
    icon: [{ url: '/EO%20apk.png?v=20260923', type: 'image/png' }],
    shortcut: '/EO%20apk.png?v=20260923',
    apple: '/EO%20apk.png?v=20260923'
  }
}

const RootLayout = async (props: ChildrenType) => {
  const { children } = props

  // Vars
  const systemMode = await getSystemMode()
  const direction = 'ltr'

  return (
    <html id='__next' lang='en' dir={direction} suppressHydrationWarning>
      <body className='flex is-full min-bs-full flex-auto flex-col'>
        <InitColorSchemeScript attribute='data' defaultMode={systemMode} />
        <BrowserTabMetadata />
        {children}
      </body>
    </html>
  )
}

export default RootLayout
