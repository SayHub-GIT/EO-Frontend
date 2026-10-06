import ParticipantSessionGuard from '@/components/auth/ParticipantSessionGuard'
import ParticipantAccountCenter from '@/components/account/ParticipantAccountCenter'
import PublicSiteLayout from '@/components/public/PublicSiteLayout'

const AccountPage = () => (
  <PublicSiteLayout>
    <ParticipantSessionGuard>
      <ParticipantAccountCenter />
    </ParticipantSessionGuard>
  </PublicSiteLayout>
)

export default AccountPage
