import type { ReactNode } from 'react'

import PublicPageBuilderLayout from '@/components/page-builder/PublicPageBuilderLayout'

const Layout = ({ children }: { children: ReactNode }) => (
  <PublicPageBuilderLayout pageKey='receipt'>
    {children}
  </PublicPageBuilderLayout>
)

export default Layout
