import HomeBackgroundShell from '@/components/public/HomeBackgroundShell'
import HomeDashboard from '@views/HomeDashboard'

export default function Page() {
  return (
    <HomeBackgroundShell>
      <HomeDashboard publicView />
    </HomeBackgroundShell>
  )
}
