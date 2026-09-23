import ParticipantSessionGuard from '@/components/auth/ParticipantSessionGuard'
import ParticipantAccountCenter from '@/components/account/ParticipantAccountCenter'

const AccountPage = () => (
  <ParticipantSessionGuard>
    <ParticipantAccountCenter />
  </ParticipantSessionGuard>
)

export default AccountPage
