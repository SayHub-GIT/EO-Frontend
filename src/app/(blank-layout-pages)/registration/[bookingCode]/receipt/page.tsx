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
  getPublicRegistrationReceipt,
  getPublicRegistrationReceiptPdf,
  resolveRegistrationAccessToken,
  type PublicRegistrationReceiptResponse
} from '@/registrations/services/registration-public.service'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value)

const formatWib = (value: string) =>
  `${new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value))} WIB`

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

const RegistrationReceiptPage = () => {
  const params = useParams<{ bookingCode: string }>()
  const bookingCode = params.bookingCode
  const [data, setData] = useState<PublicRegistrationReceiptResponse | null>(null)
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const token = resolveRegistrationAccessToken(bookingCode)

      if (!token) {
        setError(
          'Registration access token is not available. Open the secure receipt link from your email or the registration status page first.'
        )
        return
      }

      try {
        const result = await getPublicRegistrationReceipt(bookingCode, token)
        if (!cancelled) setData(result)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load receipt.')
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
        'Secure receipt token is not available. Open this page again from the receipt link in your email.'
      )
      return
    }

    setDownloadError('')
    setIsDownloading(true)

    try {
      const blob = await getPublicRegistrationReceiptPdf(bookingCode, token)
      downloadBlob(blob, `${bookingCode}-receipt.pdf`)
    } catch (downloadErrorValue) {
      setDownloadError(
        downloadErrorValue instanceof Error
          ? downloadErrorValue.message
          : 'Unable to download receipt PDF.'
      )
    } finally {
      setIsDownloading(false)
    }
  }

  const details = data
    ? [
        ['Transaction ID', data.transactionId ?? '-'],
        ['Booking code', data.bookingCode],
        ['Date', formatWib(data.paidAtUtc)],
        ['Payment method', data.paymentType ?? '-'],
        ['Registration option', data.eventPackageName ?? '-'],
        ['Participant', data.fullName],
        ['Email', data.email],
        ['Nominal', formatCurrency(data.grossAmount)],
        ['Admin', formatCurrency(0)]
      ]
    : []

  return (
    <PublicSiteLayout>
      <Box
        sx={{
          width: '100%',
          maxWidth: 1000,
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
              PAYMENT RECEIPT
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
              Receipt could not be opened
            </Typography>
            <Alert severity='error' sx={{ mt: 3 }}>{error}</Alert>
            <Button component={Link} href='/home' variant='outlined' sx={{ mt: 3 }}>
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
                  PAYMENT RECEIPT
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
                  Payment confirmed
                </Typography>
                <Typography color='text.secondary' sx={{ mt: 1.5, maxWidth: 640, lineHeight: 1.7 }}>
                  Receipt for {data.eventName}. Keep this record together with your booking code.
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
                PAID
              </Typography>
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
                <Typography variant='h6' fontWeight={850}>Transaction details</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: .75, lineHeight: 1.7 }}>
                  Payment and participant information recorded for this registration.
                </Typography>
              </Box>

              <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                {details.map(([label, value]) => (
                  <Box
                    key={String(label)}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'minmax(150px,.72fr) minmax(0,1.28fr)' },
                      gap: { xs: .45, sm: 3 },
                      py: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      alignItems: 'start'
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.66rem',
                        color: 'text.secondary',
                        fontWeight: 800,
                        letterSpacing: '.04em',
                        textTransform: 'uppercase'
                      }}
                    >
                      {label}
                    </Typography>
                    <Typography
                      variant='body2'
                      fontWeight={650}
                      sx={{
                        textAlign: { xs: 'left', sm: 'right' },
                        overflowWrap: 'anywhere',
                        lineHeight: 1.6
                      }}
                    >
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                mt: 4,
                py: 2.75,
                borderTop: '2px solid',
                borderBottom: '1px solid',
                borderColor: 'text.primary',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 2
              }}
            >
              <Typography variant='h6' fontWeight={800}>Total</Typography>
              <Typography variant='h5' fontWeight={900}>{formatCurrency(data.grossAmount)}</Typography>
            </Box>

            {downloadError && <Alert severity='error' sx={{ mt: 3 }}>{downloadError}</Alert>}

            <Box sx={{ mt: 4, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
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
                {isDownloading ? 'Preparing PDF...' : 'Download receipt PDF'}
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

export default RegistrationReceiptPage
