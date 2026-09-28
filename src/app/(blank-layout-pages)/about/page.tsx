import AboutContent from '@/components/about/AboutContent'
import PageBuilderShell from '@/components/page-builder/PageBuilderShell'
import { getPageDefinition, getPublicPageBuilder } from '@/lib/site-page-builder'

export default async function Page() {
  let pageConfig = null

  try {
    pageConfig = getPageDefinition(await getPublicPageBuilder(), 'about')
  } catch {
    pageConfig = null
  }

  return (
    <PageBuilderShell page={pageConfig}>
      <AboutContent publicPage />
    </PageBuilderShell>
  )
}
