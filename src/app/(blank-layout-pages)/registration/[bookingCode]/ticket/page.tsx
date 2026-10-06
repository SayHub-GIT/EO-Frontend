'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import PublicFooter from '@/components/public/PublicFooter'
import {
  getPublicRegistrationTicket,
  getPublicRegistrationTicketPdf,
  resolveRegistrationAccessToken,
  type PublicRegistrationTicketResponse
} from '@/registrations/services/registration-public.service'

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

const formatSchedule = (startUtc: string, endUtc: string) => {
  const start = new Date(startUtc)
  const end = new Date(endUtc)
  const date = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric' }).format(start)
  const timeFormatter = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false })
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
        setError('Registration access token is not available. Open the secure ticket link from your email or the registration status page first.')
        return
      }
      try {
        const result = await getPublicRegistrationTicket(bookingCode, token)
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load ticket.')
      }
    }
    void load()
    return () => { cancelled = true }
  }, [bookingCode])

  const handleDownload = async () => {
    const token = resolveRegistrationAccessToken(bookingCode)
    if (!token) {
      setDownloadError('Secure ticket token is not available. Open this page again from the ticket link in your email.')
      return
    }
    setDownloadError('')
    setIsDownloading(true)
    try {
      const blob = await getPublicRegistrationTicketPdf(bookingCode, token)
      downloadBlob(blob, `${bookingCode}-ticket.pdf`)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Unable to download ticket PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, px: { xs: 2.5, sm: 4, md: 6 }, py: { xs: 5, md: 8 } }}>
        <Box sx={{ width: '100%', maxWidth: 920, mx: 'auto' }}>
          {!data && !error && (
            <Box sx={{ py: 10, borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={32} />
            </Box>
          )}
          {error && <Alert severity='error'>{error}</Alert>}
          {data && (
            <Box component='section' sx={{ borderTop: '1px solid', borderColor: 'divider', pt: { xs: 4, sm: 5 }, pb: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0,1fr) auto' }, gap: 3, alignItems: 'start' }}>
                <Box>
                  <Typography sx={{ color: '#00A7E1', fontSize: '0.72rem', fontWeight: 850, letterSpacing: '.07em' }}>EVENT TICKET</Typography>
                  <Typography component='h1' sx={{ mt: 1, fontSize: { xs: '2rem', sm: '2.65rem' }, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-.03em' }}>
                    {data.eventName}
                  </Typography>
                  <Typography color='text.secondary' sx={{ mt: 1.5, lineHeight: 1.7 }}>{data.eventPackageName ?? 'Event access'}</Typography>
                </Box>
                <Typography sx={{ color: 'success.main', fontSize: '0.82rem', fontWeight: 800, pt: { sm: 0.5 } }}>
                  {data.status.toUpperCase()}
                </Typography>
              </Box>
              <Divider sx={{ my: { xs: 4, sm: 5 } }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                  <Box><Typography variant='caption' color='text.secondary'>Ticket No.</Typography><Typography fontWeight={700} sx={{ mt: .5 }}>{data.registrationId.replaceAll('-', '').slice(0, 12).toUpperCase()}</Typography></Box>
                  <Box><Typography variant='caption' color='text.secondary'>Booking Code</Typography><Typography fontWeight={700} sx={{ mt: .5, overflowWrap: 'anywhere' }}>{data.bookingCode}</Typography></Box>
                  <Box><Typography variant='caption' color='text.secondary'>Participant</Typography><Typography fontWeight={700} sx={{ mt: .5 }}>{data.fullName}</Typography></Box>
                  <Box><Typography variant='caption' color='text.secondary'>Price</Typography><Typography fontWeight={700} sx={{ mt: .5 }}>{data.grossAmount === 0 ? 'Free' : formatCurrency(data.grossAmount)}</Typography></Box>
                </Box>
                <Box sx={{ mt: 5, pt: 3.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant='h6' fontWeight={700}>Event information</Typography>
                  <Box sx={{ display: 'grid', gap: 2.25, mt: 3 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr)', gap: 1.5, alignItems: 'start' }}><i className='tabler-calendar-event' /><Typography variant='body2'>{formatSchedule(data.eventStartAtUtc, data.eventEndAtUtc)}</Typography></Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr)', gap: 1.5, alignItems: 'start' }}><i className='tabler-map-pin' /><Typography variant='body2'>{data.eventLocation || 'Location to be announced'}</Typography></Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr)', gap: 1.5, alignItems: 'start' }}><i className='tabler-package' /><Typography variant='body2'>{data.eventPackageName ?? '-'}</Typography></Box>
                  </Box>
                </Box>
                <Alert severity='info' sx={{ mt: 3 }}>Your secure QR check-in is included in the PDF ticket sent by the backend. Keep the ticket and QR private.</Alert>
                {downloadError && <Alert severity='error' sx={{ mt: 3 }}>{downloadError}</Alert>}
                <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'auto auto' }, gap: 1.5, justifyContent: { sm: 'start' } }}>
                  <Button variant='contained' size='large' onClick={() => void handleDownload()} disabled={isDownloading} startIcon={isDownloading ? <CircularProgress size={17} color='inherit' /> : <i className='tabler-download' />}>
                    {isDownloading ? 'Preparing PDF...' : 'Download Ticket PDF'}
                  </Button>
                  <Button component={Link} href='/home' variant='outlined' size='large'>Browse events</Button>
                </Box>
              </Box>
          )}
        </Box>
      </Box>
      <PublicFooter />
    </Box>
  )
}

export default RegistrationTicketPage
