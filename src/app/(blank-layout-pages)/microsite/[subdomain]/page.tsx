import Link from 'next/link'
import { redirect } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import MicrositeDocumentPreview from '@/components/microsite/MicrositeDocumentPreview'
import { getPublicMicrosite } from '@/lib/admin-microsites'

type Props = {
  params: Promise<{ subdomain: string }>
}

const PublicMicrositePage = async ({ params }: Props) => {
  const { subdomain } = await params

  try {
    const microsite = await getPublicMicrosite(subdomain)

    if (
      microsite.resolvedFromAlias &&
      microsite.canonicalSubdomain !== subdomain
    ) {
      redirect(
        `/microsite/${encodeURIComponent(microsite.canonicalSubdomain)}`
      )
    }

    return (
      <Box sx={{ minHeight: '100dvh', bgcolor: microsite.document.theme.backgroundColor }}>
        <MicrositeDocumentPreview
          document={microsite.document}
          dataBindings={microsite.dataBindings}
          interactive
          eventSlug={microsite.eventSlug}
        />
      </Box>
    )
  } catch {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          px: 3,
          py: 10,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'background.default'
        }}
      >
        <Card variant='outlined' sx={{ width: '100%', maxWidth: 520 }}>
          <CardContent sx={{ p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                mx: 'auto',
                borderRadius: '50%',
                bgcolor: 'action.hover',
                display: 'grid',
                placeItems: 'center',
                color: 'text.secondary'
              }}
            >
              <i className='tabler-world-off text-3xl' />
            </Box>
            <Typography variant='h4' fontWeight={750} sx={{ mt: 3 }}>
              MicroSite unavailable
            </Typography>
            <Typography color='text.secondary' sx={{ mt: 1.5, lineHeight: 1.7 }}>
              This MicroSite may not be published yet, its event may be unavailable,
              or the address may have changed.
            </Typography>
            <Alert severity='info' sx={{ mt: 3, textAlign: 'left' }}>
              Public MicroSites only expose the published version. Draft changes stay
              private until an authorized user publishes them.
            </Alert>
            <Button component={Link} href='/home' variant='contained' sx={{ mt: 4 }}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </Box>
    )
  }
}

export default PublicMicrositePage
