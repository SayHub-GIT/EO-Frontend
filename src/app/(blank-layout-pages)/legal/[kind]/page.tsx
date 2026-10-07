import { notFound } from 'next/navigation'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import LegalPolicyDocument from '@/components/legal/LegalPolicyDocument'
import PublicSiteLayout from '@/components/public/PublicSiteLayout'
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

  const title = normalizedKind === 'terms' ? 'Terms of Service' : 'Privacy Policy'

  return (
    <PublicSiteLayout>
      <Box
        sx={{
          width: '100%',
          maxWidth: 1040,
          mx: 'auto',
          px: { xs: 2.5, sm: 4, md: 6 },
          py: { xs: 6, md: 9 }
        }}
      >
        <Box sx={{ maxWidth: 760 }}>
          <Typography sx={{ color: '#00A7E1', fontSize: '0.72rem', fontWeight: 850, letterSpacing: '.08em' }}>
            LEGAL
          </Typography>
          <Typography
            component='h1'
            sx={{
              mt: 1.25,
              fontSize: { xs: '2.25rem', sm: '3rem' },
              lineHeight: 1.04,
              fontWeight: 900,
              letterSpacing: '-.035em'
            }}
          >
            {title}
          </Typography>
          <Typography color='text.secondary' sx={{ mt: 1.5, lineHeight: 1.7 }}>
            The current published version governing use of Pertamina Event.
          </Typography>
        </Box>

        <Box
          sx={{
            mt: 5,
            mb: 4,
            py: 2.5,
            borderTop: '1px solid',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            gap: 3,
            flexWrap: 'wrap'
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 800, letterSpacing: '.05em' }}>
              VERSION
            </Typography>
            <Typography variant='body2' fontWeight={700} sx={{ mt: .35 }}>
              {policy.version}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 800, letterSpacing: '.05em' }}>
              PUBLISHED
            </Typography>
            <Typography variant='body2' fontWeight={700} sx={{ mt: .35 }}>
              {new Date(policy.publishedAtUtc).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </Typography>
          </Box>
          {eventId && (
            <Box>
              <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 800, letterSpacing: '.05em' }}>
                SCOPE
              </Typography>
              <Typography variant='body2' fontWeight={700} sx={{ mt: .35 }}>
                Event-specific policy
              </Typography>
            </Box>
          )}
        </Box>

        <LegalPolicyDocument policy={policy} minHeight='72vh' />
      </Box>
    </PublicSiteLayout>
  )
}
