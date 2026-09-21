import Box from '@mui/material/Box'

import type { ChildrenType } from '@core/types'
import AppBreadcrumbs from '@/components/navigation/AppBreadcrumbs'

const RegistrationPagesLayout = ({ children }: ChildrenType) => (
  <Box sx={{ position: 'relative', minHeight: '100dvh' }}>
    <Box sx={{ position: 'absolute', zIndex: 4, top: 16, insetInline: 0, px: 2, pointerEvents: 'none' }}>
      <Box sx={{ width: 'fit-content', maxWidth: '100%', pointerEvents: 'auto' }}>
        <AppBreadcrumbs scope='public' surface />
      </Box>
    </Box>
    {children}
  </Box>
)

export default RegistrationPagesLayout
