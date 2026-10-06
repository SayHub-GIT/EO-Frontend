'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import PublicFooter from '@/components/public/PublicFooter'
import { openMidtransSnap } from '@/registrations/lib/midtrans'
import {
  getPublicRegistrationReceipt,
  getPublicRegistrationReceiptPdf,
  getPublicRegistrationStatus,
  getPublicRegistrationTicketPdf,
  resolveRegistrationAccessToken,
  type PublicRegistrationReceiptResponse,
  type PublicRegistrationStatusResponse
} from '@/registrations/services/registration-public.service'

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}

const secondsUntil = (value?: string | null) => {
  if (!value) return null
  const deadline = new Date(value).getTime()
  if (Number.isNaN(deadline)) return null
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
}

const formatCountdown = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return [hours, minutes, secs].map(value => String(value).padStart(2, '0')).join(':')
}

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3, py: 1.5 }}>
    <Typography variant='body2' color='text.secondary'>{label}</Typography>
    <Box
      component='div'
      sx={{
        textAlign: 'right',
        overflowWrap: 'anywhere',
        fontSize: theme => theme.typography.body2.fontSize,
        lineHeight: theme => theme.typography.body2.lineHeight,
        fontWeight: 600
      }}
    >
      {value}
    </Box>
  </Box>
)

const SuccessIcon = () => (
  <Box
    sx={{
      width: 44,
      height: 44,
      display: 'grid',
      placeItems: 'center',
      border: '1px solid',
      borderColor: 'success.main',
      borderRadius: 1.5,
      color: 'success.main'
    }}
  >
    <i className='tabler-check text-2xl' />
  </Box>
)

const RegistrationStatusPage = () => {
  const params = useParams<{ bookingCode: string }>()
  const bookingCode = params.bookingCode
  const [data, setData] = useState<PublicRegistrationStatusResponse | null>(null)
  const [receipt, setReceipt] = useState<PublicRegistrationReceiptResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [openingPayment, setOpeningPayment] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [downloading, setDownloading] = useState<'ticket' | 'receipt' | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const load = async () => {
      const token = resolveRegistrationAccessToken(bookingCode)
      if (!token) {
        if (!cancelled) {
          setError('Registration access token is not available in this browser. Open the secure link from your registration email or register from this browser first.')
          setLoading(false)
        }
        return
      }

      try {
        const result = await getPublicRegistrationStatus(bookingCode, token)
        if (cancelled) return
        setData(result)
        setError('')
        setLoading(false)

        if (result.paymentStatus.toLowerCase() === 'paid' && result.receiptAvailable) {
          try {
            const receiptResult = await getPublicRegistrationReceipt(bookingCode, token)
            if (!cancelled) setReceipt(receiptResult)
          } catch {
            if (!cancelled) setReceipt(null)
          }
        }

        if (result.status === 'PendingPayment') timer = setTimeout(load, 3000)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load registration status.')
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [bookingCode])

  useEffect(() => {
    if (data?.status !== 'PendingPayment' || !data.paymentDeadlineUtc) {
      setRemainingSeconds(null)
      return
    }

    const updateCountdown = () => setRemainingSeconds(secondsUntil(data.paymentDeadlineUtc))
    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)

    return () => window.clearInterval(timer)
  }, [data?.paymentDeadlineUtc, data?.status])

  const paymentStatus = data?.paymentStatus.toLowerCase()
  const paymentConfirmed = paymentStatus === 'paid'
  const paymentNotRequired = paymentStatus === 'notrequired' || paymentStatus === 'not_required' || paymentStatus === 'not required'
  const registrationActive = Boolean(data && ['Registered', 'CheckedIn'].includes(data.status))
  const successfulPaid = registrationActive && paymentConfirmed
  const successfulFree = registrationActive && paymentNotRequired
  const deadlineReached = data?.status === 'PendingPayment' && remainingSeconds === 0

  const handleContinuePayment = async () => {
    if (!data?.snapToken || data.status !== 'PendingPayment' || deadlineReached) return
    setOpeningPayment(true)
    setError('')

    try {
      await openMidtransSnap(data.snapToken, {
        onSuccess: () => window.location.reload(),
        onPending: () => window.location.reload(),
        onError: () => setError('Payment could not be completed. You can try again while the payment is still active.'),
        onClose: () => setOpeningPayment(false)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open secure payment.')
    } finally {
      setOpeningPayment(false)
    }
  }

  const handleDownload = async (kind: 'ticket' | 'receipt') => {
    const token = resolveRegistrationAccessToken(bookingCode)
    if (!token || downloading) {
      if (!token) setError('Secure registration token is not available in this browser.')
      return
    }

    setDownloading(kind)
    setError('')
    try {
      const blob = kind === 'ticket'
        ? await getPublicRegistrationTicketPdf(bookingCode, token)
        : await getPublicRegistrationReceiptPdf(bookingCode, token)
      downloadBlob(blob, `${kind === 'ticket' ? 'ticket' : 'invoice-receipt'}-${bookingCode}.pdf`)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : `Unable to download ${kind}.`)
    } finally {
      setDownloading(null)
    }
  }

  const documentButtons = data && registrationActive ? (
    <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: data.receiptAvailable ? '1fr 1fr' : '1fr' }, gap: 1.5 }}>
      {data.ticketAvailable && (
        <Button
          variant='outlined'
          size='large'
          startIcon={<i className='tabler-ticket' />}
          disabled={downloading !== null}
          onClick={() => void handleDownload('ticket')}
        >
          {downloading === 'ticket' ? 'Downloading Ticket…' : 'Download Ticket'}
        </Button>
      )}
      {data.receiptAvailable && (
        <Button
          variant='outlined'
          size='large'
          startIcon={<i className='tabler-file-invoice' />}
          disabled={downloading !== null}
          onClick={() => void handleDownload('receipt')}
        >
          {downloading === 'receipt' ? 'Downloading Invoice…' : 'Download Invoice / Receipt'}
        </Button>
      )}
    </Box>
  ) : null

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, px: { xs: 2.5, sm: 4, md: 6 }, py: { xs: 5, md: 8 } }}>
        <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto' }}>
          {loading && (
            <Box sx={{ py: 10, borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={32} />
            </Box>
          )}
          {error && !data && <Alert severity='error'>{error}</Alert>}

          {data && (
            <Box
              component='section'
              sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
                pt: { xs: 4, sm: 5 },
                pb: { xs: 2, sm: 3 }
              }}
            >
                {successfulPaid ? (
                  <>
                    <Box>
                      <SuccessIcon />
                      <Typography sx={{ mt: 3, color: '#00A7E1', fontSize: '0.72rem', fontWeight: 850, letterSpacing: '.07em' }}>
                        REGISTRATION CONFIRMED
                      </Typography>
                      <Typography component='h1' sx={{ mt: 1, fontSize: { xs: '2rem', sm: '2.65rem' }, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-.03em' }}>
                        Payment successful
                      </Typography>
                      <Typography variant='body1' color='text.secondary' sx={{ mt: 1.5, maxWidth: 620, lineHeight: 1.7 }}>
                        {data.eventName} is confirmed. Payment received: {formatCurrency(data.grossAmount)}.
                      </Typography>
                    </Box>

                    <Typography variant='h6' fontWeight={600} sx={{ mt: 6, mb: 2 }}>Payment details</Typography>
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 3, py: 1 }}>
                      <DetailRow label='Transaction ID' value={receipt?.transactionId ?? data.registrationId} />
                      <Divider /><DetailRow label='Date' value={formatDate(receipt?.paidAtUtc ?? data.paidAtUtc ?? data.registeredAtUtc)} />
                      <Divider /><DetailRow label='Type of Transaction' value={receipt?.paymentType ?? data.paymentStatus} />
                      <Divider /><DetailRow label='Registration Option' value={data.eventPackageName ?? '-'} />
                      <Divider /><DetailRow label='Nominal' value={formatCurrency(data.grossAmount)} />
                      <Divider /><DetailRow label='Admin' value={formatCurrency(0)} />
                      <Divider /><DetailRow label='Status' value={<Chip label='Success' color='success' variant='tonal' size='small' icon={<i className='tabler-circle-check' />} />} />
                    </Box>
                    <Box sx={{ mt: 3, pt: 2.5, borderTop: '2px solid', borderColor: 'text.primary', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                      <Typography variant='h6' fontWeight={700}>Total</Typography>
                      <Typography variant='h6' fontWeight={850}>{formatCurrency(data.grossAmount)}</Typography>
                    </Box>
                    {error && <Alert severity='error' sx={{ mt: 3 }}>{error}</Alert>}
                    {documentButtons}
                    <Button component={Link} href='/home' fullWidth variant='contained' size='large' sx={{ mt: 2 }}>Back To Home Screen</Button>
                  </>
                ) : successfulFree ? (
                  <>
                    <Box>
                      <SuccessIcon />
                      <Typography sx={{ mt: 3, color: '#00A7E1', fontSize: '0.72rem', fontWeight: 850, letterSpacing: '.07em' }}>
                        REGISTRATION CONFIRMED
                      </Typography>
                      <Typography component='h1' sx={{ mt: 1, fontSize: { xs: '2rem', sm: '2.65rem' }, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-.03em' }}>
                        Registration successful
                      </Typography>
                      <Typography variant='body1' color='text.secondary' sx={{ mt: 1.5, maxWidth: 620, lineHeight: 1.7 }}>
                        Your place for {data.eventName} is confirmed. No payment is required for this registration option.
                      </Typography>
                    </Box>

                    <Typography variant='h6' fontWeight={600} sx={{ mt: 6, mb: 2 }}>Registration details</Typography>
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 3, py: 1 }}>
                      <DetailRow label='Booking Code' value={bookingCode} />
                      <Divider /><DetailRow label='Program / Event' value={data.eventName} />
                      <Divider /><DetailRow label='Registration Option' value={data.eventPackageName ?? '-'} />
                      <Divider /><DetailRow label='Registration Fee' value={<Chip label='Free' color='success' variant='tonal' size='small' />} />
                      <Divider /><DetailRow label='Registered At' value={formatDate(data.registeredAtUtc)} />
                      <Divider /><DetailRow label='Status' value={<Chip label='Registered' color='success' variant='tonal' size='small' icon={<i className='tabler-circle-check' />} />} />
                    </Box>
                    <Alert severity='success' sx={{ mt: 3 }}>Your ticket is ready and is also sent to the registered email address.</Alert>
                    {error && <Alert severity='error' sx={{ mt: 3 }}>{error}</Alert>}
                    {documentButtons}
                    <Button component={Link} href='/home' fullWidth variant='contained' size='large' sx={{ mt: 2 }}>Back To Home Screen</Button>
                  </>
                ) : (
                  <>
                    <Box sx={{ mb: 5 }}>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          display: 'grid',
                          placeItems: 'center',
                          border: '1px solid',
                          borderColor: data.status === 'PendingPayment' ? 'warning.main' : 'divider',
                          borderRadius: 1.5,
                          color: data.status === 'PendingPayment' ? 'warning.main' : 'text.secondary'
                        }}
                      >
                        <i className={`${data.status === 'PendingPayment' ? 'tabler-clock' : 'tabler-alert-circle'} text-2xl`} />
                      </Box>
                      <Typography sx={{ mt: 3, color: '#00A7E1', fontSize: '0.72rem', fontWeight: 850, letterSpacing: '.07em' }}>
                        REGISTRATION STATUS
                      </Typography>
                      <Typography component='h1' sx={{ mt: 1, fontSize: { xs: '2rem', sm: '2.65rem' }, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-.03em' }}>
                        {data.status === 'PendingPayment' ? 'Payment pending' : data.status === 'Expired' ? 'Payment expired' : 'Registration status'}
                      </Typography>
                      <Typography color='text.secondary' sx={{ mt: 1.5, maxWidth: 620, lineHeight: 1.7 }}>{data.eventName}</Typography>
                    </Box>

                    {data.status === 'PendingPayment' && data.paymentDeadlineUtc && (
                      <Box
                        sx={{
                          mb: 3,
                          p: 2.5,
                          borderRadius: 3,
                          textAlign: 'center',
                          border: '1px solid',
                          borderColor: deadlineReached ? 'error.light' : 'warning.light',
                          bgcolor: deadlineReached ? 'error.lighter' : 'warning.lighter'
                        }}
                      >
                        <Typography variant='body2' fontWeight={700} color={deadlineReached ? 'error.main' : 'warning.dark'}>
                          {deadlineReached ? 'Payment deadline reached' : 'Complete payment within'}
                        </Typography>
                        <Typography variant='h3' fontWeight={800} sx={{ my: 1, letterSpacing: '.04em', fontVariantNumeric: 'tabular-nums' }}>
                          {remainingSeconds === null ? '--:--:--' : formatCountdown(remainingSeconds)}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          Deadline: {formatDate(data.paymentDeadlineUtc)} WIB
                        </Typography>
                        {deadlineReached && (
                          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                            Checking the final payment status. This page will update automatically.
                          </Typography>
                        )}
                      </Box>
                    )}

                    {error && <Alert severity='error' sx={{ mb: 3 }}>{error}</Alert>}
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 3, py: 1 }}>
                      <DetailRow label='Booking Code' value={bookingCode} />
                      <Divider /><DetailRow label='Registration Option' value={data.eventPackageName ?? '-'} />
                      <Divider /><DetailRow label='Payment' value={data.paymentStatus} />
                      <Divider /><DetailRow label='Total' value={formatCurrency(data.grossAmount)} />
                      {data.paymentDeadlineUtc && <><Divider /><DetailRow label='Payment Deadline' value={`${formatDate(data.paymentDeadlineUtc)} WIB`} /></>}
                    </Box>

                    {data.status === 'PendingPayment' && data.snapToken && (
                      <Button fullWidth variant='contained' size='large' sx={{ mt: 4 }} disabled={openingPayment || deadlineReached} onClick={() => void handleContinuePayment()}>
                        {deadlineReached ? 'Payment Window Ended' : openingPayment ? 'Opening Payment...' : 'Continue Payment'}
                      </Button>
                    )}

                    {data.status === 'Expired' && (
                      <Alert severity='warning' sx={{ mt: 3 }}>
                        This payment window has expired and the reserved quota has been released. You can register again using the same email address.
                      </Alert>
                    )}
                    {['Failed', 'Cancelled'].includes(data.status) && <Alert severity='warning' sx={{ mt: 3 }}>This registration is no longer active. Any reserved quota has been released by the backend.</Alert>}
                    <Button component={Link} href='/home' fullWidth variant='outlined' sx={{ mt: 2 }}>Back To Home Screen</Button>
                  </>
                )}
            </Box>
          )}
        </Box>
      </Box>
      <PublicFooter />
    </Box>
  )
}

export default RegistrationStatusPage
