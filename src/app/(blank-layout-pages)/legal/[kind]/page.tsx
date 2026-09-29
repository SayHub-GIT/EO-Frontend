import { notFound } from 'next/navigation'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import LegalPolicyDocument from '@/components/legal/LegalPolicyDocument'
import {
  getPublicEventLegalPolicies,
  getPublicGlobalLegalPolicies
} from '@/lib/legal-policies'

type Props = {
  params: Promise<{ kind: string }>
  searchParams: Promise<{ eventId?: string }>
}

export default async function LegalDocumentPage({ params, searchParams }: Props) {
  const { kind } = await params
  const { eventId } = await searchParams
  const normalizedKind = kind.toLowerCase()

  if (normalizedKind !== 'terms' && normalizedKind !== 'privacy') {
    notFound()
  }

  const policies = eventId
    ? await getPublicEventLegalPolicies(eventId)
    : await getPublicGlobalLegalPolicies()

  const policy = normalizedKind === 'terms'
    ? policies.terms
    : policies.privacy

  if (!policy) notFound()

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: 'background.default',
        px: { xs: 2, sm: 3 },
        py: { xs: 4, md: 7 }
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto' }}>
        <Chip
          label={normalizedKind === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          color='primary'
          variant='tonal'
          sx={{ mb: 2 }}
        />
        <Typography variant='h3' fontWeight={900}>
          {normalizedKind === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
        </Typography>
        <Typography color='text.secondary' sx={{ mt: 1, mb: 4 }}>
          Version {policy.version} · Published {new Date(policy.publishedAtUtc).toLocaleDateString()}
        </Typography>
        <LegalPolicyDocument policy={policy} minHeight='72vh' />
      </Box>
    </Box>
  )
}
