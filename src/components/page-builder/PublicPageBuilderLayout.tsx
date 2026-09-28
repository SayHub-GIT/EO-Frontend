import type { ReactNode } from 'react'

import PageBuilderShell from '@/components/page-builder/PageBuilderShell'
import {
  getPageDefinition,
  getPublicPageBuilder,
  type SitePageKey
} from '@/lib/site-page-builder'

const PublicPageBuilderLayout = async ({
  pageKey,
  children
}: {
  pageKey: SitePageKey
  children: ReactNode
}) => {
  let pageConfig = null

  try {
    pageConfig = getPageDefinition(
      await getPublicPageBuilder(),
      pageKey
    )
  } catch {
    pageConfig = null
  }

  return (
    <PageBuilderShell page={pageConfig}>
      {children}
    </PageBuilderShell>
  )
}

export default PublicPageBuilderLayout
