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
  getPublicRegistrationReceipt,
  getPublicRegistrationReceiptPdf,
  resolveRegistrationAccessToken,
  type PublicRegistrationReceiptResponse
} from '@/registrations/services/registration-public.service'

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
const formatWib = (value: string) => `${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))} WIB`

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

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'minmax(150px, .7fr) minmax(0, 1.3fr)' },
      gap: { xs: 0.5, sm: 3 },
      py: 1.6,
      alignItems: 'start'
    }}
  >
    <Typography variant='body2' color='text.secondary'>{label}</Typography>
    <Typography variant='body2' fontWeight={650} sx={{ textAlign: { xs: 'left', sm: 'right' }, overflowWrap: 'anywhere' }}>{value}</Typography>
  </Box>
)

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
        setError('Registration access token is not available. Open the secure receipt link from your email or the registration status page first.')
        return
      }
      try {
        const result = await getPublicRegistrationReceipt(bookingCode, token)
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load receipt.')
      }
    }
    void load()
    return () => { cancelled = true }
  }, [bookingCode])

  const handleDownload = async () => {
    const token = resolveRegistrationAccessToken(bookingCode)
    if (!token) {
      setDownloadError('Secure receipt token is not available. Open this page again from the receipt link in your email.')
      return
    }
    setDownloadError('')
    setIsDownloading(true)
    try {
      const blob = await getPublicRegistrationReceiptPdf(bookingCode, token)
      downloadBlob(blob, `${bookingCode}-receipt.pdf`)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Unable to download receipt PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, px: { xs: 2.5, sm: 4, md: 6 }, py: { xs: 5, md: 8 } }}>
        <Box sx={{ width: '100%', maxWidth: 880, mx: 'auto' }}>
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
                  <Typography sx={{ color: '#00A7E1', fontSize: '0.72rem', fontWeight: 850, letterSpacing: '.07em' }}>PAYMENT RECEIPT</Typography>
                  <Typography component='h1' sx={{ mt: 1, fontSize: { xs: '2rem', sm: '2.65rem' }, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-.03em' }}>
                    Payment confirmed
                  </Typography>
                  <Typography color='text.secondary' sx={{ mt: 1.5, maxWidth: 620, lineHeight: 1.7 }}>
                    Receipt for {data.eventName}. Keep this record together with your booking code.
                  </Typography>
                </Box>
                <Typography sx={{ color: 'success.main', fontSize: '0.82rem', fontWeight: 800, pt: { sm: 0.5 } }}>
                  PAID
                </Typography>
              </Box>
              <Typography variant='h6' fontWeight={700} sx={{ mt: 6, mb: 2 }}>Transaction details</Typography>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 3, py: 1 }}>
                  <DetailRow label='Transaction ID' value={data.transactionId ?? '-'} /><Divider />
                  <DetailRow label='Booking Code' value={data.bookingCode} /><Divider />
                  <DetailRow label='Date' value={formatWib(data.paidAtUtc)} /><Divider />
                  <DetailRow label='Payment Method' value={data.paymentType ?? '-'} /><Divider />
                  <DetailRow label='Package' value={data.eventPackageName ?? '-'} /><Divider />
                  <DetailRow label='Participant' value={data.fullName} /><Divider />
                  <DetailRow label='Email' value={data.email} /><Divider />
                  <DetailRow label='Nominal' value={formatCurrency(data.grossAmount)} /><Divider />
                  <DetailRow label='Admin' value={formatCurrency(0)} />
                </Box>
                <Box sx={{ mt: 3, pt: 2.5, borderTop: '2px solid', borderColor: 'text.primary', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                  <Typography variant='h6' fontWeight={700}>Total</Typography>
                  <Typography variant='h6' fontWeight={850}>{formatCurrency(data.grossAmount)}</Typography>
                </Box>
                {downloadError && <Alert severity='error' sx={{ mt: 3 }}>{downloadError}</Alert>}
                <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'auto auto' }, gap: 1.5, justifyContent: { sm: 'start' } }}>
                  <Button variant='contained' size='large' onClick={() => void handleDownload()} disabled={isDownloading} startIcon={isDownloading ? <CircularProgress size={17} color='inherit' /> : <i className='tabler-download' />}>
                    {isDownloading ? 'Preparing PDF...' : 'Download Receipt PDF'}
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

export default RegistrationReceiptPage
