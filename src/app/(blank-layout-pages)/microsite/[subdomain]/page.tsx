import Link from 'next/link'
import { redirect } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import MicrositeDocumentPreview from '@/components/microsite/MicrositeDocumentPreview'
import { getPublicMicrosite } from '@/lib/admin-microsites'

type Props = {
  params: Promise<{ subdomain: string }>
}

const PublicMicrositePage = async ({ params }: Props) => {
  const { subdomain } = await params

  let microsite

  try {
    microsite = await getPublicMicrosite(subdomain)
  } catch {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          bgcolor: 'background.default',
          color: 'text.primary'
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 820,
            mx: 'auto',
            px: { xs: 2.5, sm: 4, md: 6 },
            py: { xs: 6, md: 10 }
          }}
        >
          <Box
            component={Link}
            href='/home'
            aria-label='Pertamina Event home'
            sx={{ display: 'inline-flex', textDecoration: 'none' }}
          >
            <Box
              component='img'
              src='/EO%20Navbar.png'
              alt='Pertamina Event'
              sx={{ display: 'block', width: 'auto', height: { xs: 30, sm: 34 } }}
            />
          </Box>

          <Box
            sx={{
              mt: { xs: 8, md: 12 },
              borderTop: '1px solid',
              borderColor: 'divider',
              pt: 4
            }}
          >
            <Typography
              sx={{
                color: '#00A7E1',
                fontSize: '0.72rem',
                fontWeight: 850,
                letterSpacing: '.08em'
              }}
            >
              PUBLIC MICROSITE
            </Typography>
            <Typography
              component='h1'
              sx={{
                mt: 1.25,
                maxWidth: 680,
                fontSize: { xs: '2.15rem', sm: '2.9rem' },
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: '-.035em'
              }}
            >
              This MicroSite is unavailable
            </Typography>
            <Typography
              color='text.secondary'
              sx={{ mt: 1.5, maxWidth: 660, lineHeight: 1.75 }}
            >
              It may not be published yet, its event may no longer be available, or the public address may have changed.
            </Typography>

            <Alert severity='info' sx={{ mt: 4, maxWidth: 680 }}>
              Only the published MicroSite version is visible publicly. Draft changes remain private until they are published.
            </Alert>

            <Button component={Link} href='/home' variant='contained' sx={{ mt: 3 }}>
              Browse events
            </Button>
          </Box>
        </Box>
      </Box>
    )
  }

  if (
    microsite.resolvedFromAlias &&
    microsite.canonicalSubdomain !== subdomain
  ) {
    redirect(
      `/microsite/${encodeURIComponent(microsite.canonicalSubdomain)}`
    )
  }

  return (
    <Box
      component='main'
      sx={{
        minHeight: '100dvh',
        bgcolor: microsite.document.theme.backgroundColor
      }}
    >
      <MicrositeDocumentPreview
        document={microsite.document}
        dataBindings={microsite.dataBindings}
        interactive
        eventSlug={microsite.eventSlug}
        presentation='public'
        templateKey={microsite.templateKey}
      />
    </Box>
  )
}

export default PublicMicrositePage
