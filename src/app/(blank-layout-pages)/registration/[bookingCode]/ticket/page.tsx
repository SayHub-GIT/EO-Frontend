'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import PublicSiteLayout from '@/components/public/PublicSiteLayout'
import {
  getPublicRegistrationTicket,
  getPublicRegistrationTicketPdf,
  resolveRegistrationAccessToken,
  type PublicRegistrationTicketResponse
} from '@/registrations/services/registration-public.service'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value)

const formatSchedule = (startUtc: string, endUtc: string) => {
  const start = new Date(startUtc)
  const end = new Date(endUtc)
  const date = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(start)
  const timeFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  return `${date}, ${timeFormatter.format(start)} - ${timeFormatter.format(end)} WIB`
}

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const RegistrationTicketPage = () => {
  const params = useParams<{ bookingCode: string }>()
  const bookingCode = params.bookingCode
  const [data, setData] = useState<PublicRegistrationTicketResponse | null>(null)
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const token = resolveRegistrationAccessToken(bookingCode)

      if (!token) {
        setError(
          'Registration access token is not available. Open the secure ticket link from your email or the registration status page first.'
        )
        return
      }

      try {
        const result = await getPublicRegistrationTicket(bookingCode, token)
        if (!cancelled) setData(result)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load ticket.')
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [bookingCode])

  const handleDownload = async () => {
    const token = resolveRegistrationAccessToken(bookingCode)

    if (!token) {
      setDownloadError(
        'Secure ticket token is not available. Open this page again from the ticket link in your email.'
      )
      return
    }

    setDownloadError('')
    setIsDownloading(true)

    try {
      const blob = await getPublicRegistrationTicketPdf(bookingCode, token)
      downloadBlob(blob, `${bookingCode}-ticket.pdf`)
    } catch (downloadErrorValue) {
      setDownloadError(
        downloadErrorValue instanceof Error
          ? downloadErrorValue.message
          : 'Unable to download ticket PDF.'
      )
    } finally {
      setIsDownloading(false)
    }
  }

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
        {!data && !error && (
          <Box
            sx={{
              minHeight: 360,
              borderTop: '1px solid',
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            <CircularProgress size={32} />
          </Box>
        )}

        {error && (
          <Box sx={{ maxWidth: 760 }}>
            <Typography
              sx={{
                color: '#00A7E1',
                fontSize: '0.72rem',
                fontWeight: 850,
                letterSpacing: '.08em'
              }}
            >
              EVENT TICKET
            </Typography>
            <Typography
              component='h1'
              sx={{
                mt: 1.25,
                fontSize: { xs: '2rem', sm: '2.7rem' },
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: '-.03em'
              }}
            >
              Ticket could not be opened
            </Typography>
            <Alert severity='error' sx={{ mt: 3 }}>{error}</Alert>
            <Button
              component={Link}
              href='/home'
              variant='outlined'
              sx={{ mt: 3 }}
            >
              Browse events
            </Button>
          </Box>
        )}

        {data && (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(0,1fr) auto' },
                gap: 3,
                alignItems: 'start'
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color: '#00A7E1',
                    fontSize: '0.72rem',
                    fontWeight: 850,
                    letterSpacing: '.08em'
                  }}
                >
                  EVENT TICKET
                </Typography>
                <Typography
                  component='h1'
                  sx={{
                    mt: 1.25,
                    fontSize: { xs: '2.2rem', sm: '3rem' },
                    fontWeight: 900,
                    lineHeight: 1.04,
                    letterSpacing: '-.035em'
                  }}
                >
                  {data.eventName}
                </Typography>
                <Typography color='text.secondary' sx={{ mt: 1.5, lineHeight: 1.7 }}>
                  {data.eventPackageName ?? 'Event access'}
                </Typography>
              </Box>

              <Typography
                sx={{
                  color: 'success.main',
                  fontSize: '0.72rem',
                  fontWeight: 850,
                  letterSpacing: '.06em',
                  pt: { sm: .5 }
                }}
              >
                {data.status.toUpperCase()}
              </Typography>
            </Box>

            <Box
              sx={{
                mt: { xs: 5, md: 6 },
                py: 3,
                borderTop: '1px solid',
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,minmax(0,1fr))' },
                gap: { xs: 2.5, md: 4 }
              }}
            >
              {[
                ['Ticket no.', data.registrationId.replaceAll('-', '').slice(0, 12).toUpperCase()],
                ['Booking code', data.bookingCode],
                ['Participant', data.fullName],
                ['Price', data.grossAmount === 0 ? 'Free' : formatCurrency(data.grossAmount)]
              ].map(([label, value]) => (
                <Box key={String(label)} sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: '0.65rem',
                      color: 'text.secondary',
                      fontWeight: 800,
                      letterSpacing: '.05em',
                      textTransform: 'uppercase'
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    variant='body2'
                    fontWeight={700}
                    sx={{ mt: .55, overflowWrap: 'anywhere', lineHeight: 1.55 }}
                  >
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                mt: { xs: 5, md: 6 },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0,.72fr) minmax(0,1.28fr)' },
                gap: { xs: 3, md: 7 },
                alignItems: 'start'
              }}
            >
              <Box>
                <Typography variant='h6' fontWeight={850}>Event information</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: .75, lineHeight: 1.7 }}>
                  Keep this information together with your secure PDF ticket.
                </Typography>
              </Box>

              <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                {[
                  ['Schedule', formatSchedule(data.eventStartAtUtc, data.eventEndAtUtc)],
                  ['Location', data.eventLocation || 'Location to be announced'],
                  ['Registration option', data.eventPackageName ?? '-']
                ].map(([label, value]) => (
                  <Box
                    key={String(label)}
                    sx={{
                      py: 2.25,
                      borderBottom: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.65rem',
                        color: 'text.secondary',
                        fontWeight: 800,
                        letterSpacing: '.05em',
                        textTransform: 'uppercase'
                      }}
                    >
                      {label}
                    </Typography>
                    <Typography variant='body2' sx={{ mt: .55, lineHeight: 1.65 }}>
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Alert severity='info' sx={{ mt: 4 }}>
              Your secure QR check-in is included in the PDF ticket generated by the backend. Keep the ticket and QR private.
            </Alert>

            {downloadError && <Alert severity='error' sx={{ mt: 2 }}>{downloadError}</Alert>}

            <Box
              sx={{
                mt: 4,
                display: 'flex',
                gap: 1.5,
                flexWrap: 'wrap'
              }}
            >
              <Button
                variant='contained'
                size='large'
                onClick={() => void handleDownload()}
                disabled={isDownloading}
                startIcon={
                  isDownloading
                    ? <CircularProgress size={17} color='inherit' />
                    : <i className='tabler-download' />
                }
              >
                {isDownloading ? 'Preparing PDF...' : 'Download ticket PDF'}
              </Button>
              <Button
                component={Link}
                href={`/registration/${encodeURIComponent(bookingCode)}/status`}
                variant='outlined'
                size='large'
              >
                Registration status
              </Button>
              <Button component={Link} href='/home' variant='text' size='large'>
                Browse events
              </Button>
            </Box>
          </>
        )}
      </Box>
    </PublicSiteLayout>
  )
}

export default RegistrationTicketPage
