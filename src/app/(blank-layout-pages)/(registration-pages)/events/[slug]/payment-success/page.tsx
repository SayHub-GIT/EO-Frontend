'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import PublicSiteLayout from '@/components/public/PublicSiteLayout'

const PaymentSuccessPage = () => {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const [bookingCode, setBookingCode] = useState<string | null>(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('bookingCode')

    setBookingCode(code)
    setResolved(true)

    if (code) {
      router.replace(`/registration/${encodeURIComponent(code)}/status`)
    }
  }, [router])

  if (!resolved || bookingCode) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'background.default'
        }}
      >
        <CircularProgress size={32} />
      </Box>
    )
  }

  return (
    <PublicSiteLayout>
      <Box
        sx={{
          width: '100%',
          maxWidth: 860,
          mx: 'auto',
          px: { xs: 2.5, sm: 4, md: 6 },
          py: { xs: 6, md: 9 }
        }}
      >
        <Button
          component={Link}
          href={`/events/${encodeURIComponent(params.slug)}`}
          variant='text'
          startIcon={<i className='tabler-arrow-left' />}
          sx={{ px: 0, color: 'text.secondary' }}
        >
          Back to event
        </Button>

        <Box
          sx={{
            mt: { xs: 7, md: 10 },
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
            REGISTRATION STATUS
          </Typography>
          <Typography
            component='h1'
            sx={{
              mt: 1.25,
              maxWidth: 680,
              fontSize: { xs: '2.1rem', sm: '2.85rem' },
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-.035em'
            }}
          >
            Registration status link is incomplete
          </Typography>
          <Typography
            color='text.secondary'
            sx={{ mt: 1.5, maxWidth: 660, lineHeight: 1.75 }}
          >
            The booking code is missing from this payment result link, so the secure registration status cannot be opened from this address.
          </Typography>

          <Alert severity='warning' sx={{ mt: 4, maxWidth: 680 }}>
            Use the secure registration status link from your confirmation email or the browser where you registered.
          </Alert>

          <Box sx={{ mt: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              component={Link}
              href={`/events/${encodeURIComponent(params.slug)}`}
              variant='contained'
            >
              View event details
            </Button>
            <Button component={Link} href='/account' variant='outlined'>
              Open my account
            </Button>
          </Box>
        </Box>
      </Box>
    </PublicSiteLayout>
  )
}

export default PaymentSuccessPage
