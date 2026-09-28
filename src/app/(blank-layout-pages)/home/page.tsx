import HomeBackgroundShell from '@/components/public/HomeBackgroundShell'
import PageBuilderShell from '@/components/page-builder/PageBuilderShell'
import HomeDashboard from '@views/HomeDashboard'
import { getPageDefinition, getPublicPageBuilder } from '@/lib/site-page-builder'

export default async function Page() {
  let pageConfig = null

  try {
    pageConfig = getPageDefinition(await getPublicPageBuilder(), 'home')
  } catch {
    pageConfig = null
  }

  return (
    <PageBuilderShell page={pageConfig}>
      <HomeBackgroundShell pageConfig={pageConfig}>
        <HomeDashboard publicView />
      </HomeBackgroundShell>
    </PageBuilderShell>
  )
}
