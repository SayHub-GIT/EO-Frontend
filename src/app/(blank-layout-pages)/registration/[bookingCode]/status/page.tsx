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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value)

const formatDate = (value?: string | null) => {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
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

  return [hours, minutes, secs]
    .map(value => String(value).padStart(2, '0'))
    .join(':')
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

const DetailRow = ({
  label,
  value
}: {
  label: string
  value: React.ReactNode
}) => (
  <Box
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
    <Box
      component='div'
      sx={{
        textAlign: { xs: 'left', sm: 'right' },
        overflowWrap: 'anywhere',
        fontSize: theme => theme.typography.body2.fontSize,
        lineHeight: 1.6,
        fontWeight: 650
      }}
    >
      {value}
    </Box>
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
          setError(
            'Registration access token is not available in this browser. Open the secure link from your registration email or register from this browser first.'
          )
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

        if (
          result.paymentStatus.toLowerCase() === 'paid' &&
          result.receiptAvailable
        ) {
          try {
            const receiptResult = await getPublicRegistrationReceipt(
              bookingCode,
              token
            )

            if (!cancelled) setReceipt(receiptResult)
          } catch {
            if (!cancelled) setReceipt(null)
          }
        }

        if (result.status === 'PendingPayment') {
          timer = setTimeout(load, 3000)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load registration status.'
          )
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

    const updateCountdown = () =>
      setRemainingSeconds(secondsUntil(data.paymentDeadlineUtc))

    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)

    return () => window.clearInterval(timer)
  }, [data?.paymentDeadlineUtc, data?.status])

  const paymentStatus = data?.paymentStatus.toLowerCase()
  const paymentConfirmed = paymentStatus === 'paid'
  const paymentNotRequired =
    paymentStatus === 'notrequired' ||
    paymentStatus === 'not_required' ||
    paymentStatus === 'not required'
  const registrationActive = Boolean(
    data && ['Registered', 'CheckedIn'].includes(data.status)
  )
  const successfulPaid = registrationActive && paymentConfirmed
  const successfulFree = registrationActive && paymentNotRequired
  const deadlineReached =
    data?.status === 'PendingPayment' && remainingSeconds === 0

  const handleContinuePayment = async () => {
    if (
      !data?.snapToken ||
      data.status !== 'PendingPayment' ||
      deadlineReached
    ) {
      return
    }

    setOpeningPayment(true)
    setError('')

    try {
      await openMidtransSnap(data.snapToken, {
        onSuccess: () => window.location.reload(),
        onPending: () => window.location.reload(),
        onError: () =>
          setError(
            'Payment could not be completed. You can try again while the payment is still active.'
          ),
        onClose: () => setOpeningPayment(false)
      })
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : 'Unable to open secure payment.'
      )
    } finally {
      setOpeningPayment(false)
    }
  }

  const handleDownload = async (kind: 'ticket' | 'receipt') => {
    const token = resolveRegistrationAccessToken(bookingCode)

    if (!token || downloading) {
      if (!token) {
        setError('Secure registration token is not available in this browser.')
      }

      return
    }

    setDownloading(kind)
    setError('')

    try {
      const blob =
        kind === 'ticket'
          ? await getPublicRegistrationTicketPdf(bookingCode, token)
          : await getPublicRegistrationReceiptPdf(bookingCode, token)

      downloadBlob(
        blob,
        `${kind === 'ticket' ? 'ticket' : 'invoice-receipt'}-${bookingCode}.pdf`
      )
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : `Unable to download ${kind}.`
      )
    } finally {
      setDownloading(null)
    }
  }

  const documentButtons =
    data && registrationActive ? (
      <Box sx={{ mt: 4, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {data.ticketAvailable && (
          <Button
            variant='contained'
            size='large'
            startIcon={<i className='tabler-ticket' />}
            disabled={downloading !== null}
            onClick={() => void handleDownload('ticket')}
          >
            {downloading === 'ticket'
              ? 'Downloading ticket…'
              : 'Download ticket'}
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
            {downloading === 'receipt'
              ? 'Downloading receipt…'
              : 'Download receipt'}
          </Button>
        )}

        <Button component={Link} href='/account' variant='text' size='large'>
          My account
        </Button>
      </Box>
    ) : null

  const headline = successfulPaid
    ? 'Payment successful'
    : successfulFree
      ? 'Registration confirmed'
      : data?.status === 'PendingPayment'
        ? 'Payment pending'
        : data?.status === 'Expired'
          ? 'Payment expired'
          : 'Registration status'

  const eyebrow = successfulPaid || successfulFree
    ? 'REGISTRATION CONFIRMED'
    : 'REGISTRATION STATUS'

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
        {loading && (
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

        {error && !data && (
          <Box sx={{ maxWidth: 760 }}>
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
                fontSize: { xs: '2rem', sm: '2.7rem' },
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: '-.03em'
              }}
            >
              Secure registration link unavailable
            </Typography>
            <Alert severity='error' sx={{ mt: 3 }}>
              {error}
            </Alert>
            <Box sx={{ mt: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button component={Link} href='/account' variant='contained'>
                Open my account
              </Button>
              <Button component={Link} href='/home' variant='outlined'>
                Browse events
              </Button>
            </Box>
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
                  {eyebrow}
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
                  {headline}
                </Typography>
                <Typography
                  color='text.secondary'
                  sx={{ mt: 1.5, maxWidth: 660, lineHeight: 1.7 }}
                >
                  {successfulPaid
                    ? `${data.eventName} is confirmed. Payment received: ${formatCurrency(data.grossAmount)}.`
                    : successfulFree
                      ? `Your place for ${data.eventName} is confirmed. No payment is required for this registration option.`
                      : data.eventName}
                </Typography>
              </Box>

              <Typography
                sx={{
                  color:
                    successfulPaid || successfulFree
                      ? 'success.main'
                      : data.status === 'PendingPayment'
                        ? 'warning.main'
                        : 'text.secondary',
                  fontSize: '0.72rem',
                  fontWeight: 850,
                  letterSpacing: '.06em',
                  pt: { sm: .5 }
                }}
              >
                {data.status.toUpperCase()}
              </Typography>
            </Box>

            {data.status === 'PendingPayment' && data.paymentDeadlineUtc && (
              <Box
                sx={{
                  mt: { xs: 5, md: 6 },
                  py: 3,
                  borderTop: '1px solid',
                  borderBottom: '1px solid',
                  borderColor: deadlineReached ? 'error.main' : 'divider'
                }}
              >
                <Typography
                  variant='body2'
                  fontWeight={800}
                  color={deadlineReached ? 'error.main' : 'text.primary'}
                >
                  {deadlineReached
                    ? 'Payment deadline reached'
                    : 'Complete payment within'}
                </Typography>
                <Typography
                  sx={{
                    mt: .6,
                    fontSize: { xs: '2rem', sm: '2.55rem' },
                    fontWeight: 900,
                    letterSpacing: '.04em',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {remainingSeconds === null
                    ? '--:--:--'
                    : formatCountdown(remainingSeconds)}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mt: .65 }}
                >
                  Deadline: {formatDate(data.paymentDeadlineUtc)} WIB
                </Typography>
                {deadlineReached && (
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ display: 'block', mt: 1 }}
                  >
                    Checking the final payment status. This page updates automatically.
                  </Typography>
                )}
              </Box>
            )}

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
                <Typography variant='h6' fontWeight={850}>
                  {successfulPaid
                    ? 'Payment details'
                    : successfulFree
                      ? 'Registration details'
                      : 'Current registration'}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mt: .75, lineHeight: 1.7 }}
                >
                  Secure status information for booking {bookingCode}.
                </Typography>
              </Box>

              <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                {successfulPaid ? (
                  <>
                    <DetailRow
                      label='Transaction ID'
                      value={receipt?.transactionId ?? data.registrationId}
                    />
                    <DetailRow
                      label='Date'
                      value={formatDate(
                        receipt?.paidAtUtc ??
                          data.paidAtUtc ??
                          data.registeredAtUtc
                      )}
                    />
                    <DetailRow
                      label='Payment method'
                      value={receipt?.paymentType ?? data.paymentStatus}
                    />
                    <DetailRow
                      label='Registration option'
                      value={data.eventPackageName ?? '-'}
                    />
                    <DetailRow
                      label='Nominal'
                      value={formatCurrency(data.grossAmount)}
                    />
                    <DetailRow label='Admin' value={formatCurrency(0)} />
                    <DetailRow
                      label='Status'
                      value={
                        <Typography
                          component='span'
                          sx={{
                            color: 'success.main',
                            fontSize: '0.78rem',
                            fontWeight: 850
                          }}
                        >
                          SUCCESS
                        </Typography>
                      }
                    />
                  </>
                ) : successfulFree ? (
                  <>
                    <DetailRow label='Booking code' value={bookingCode} />
                    <DetailRow label='Program / event' value={data.eventName} />
                    <DetailRow
                      label='Registration option'
                      value={data.eventPackageName ?? '-'}
                    />
                    <DetailRow
                      label='Registration fee'
                      value={
                        <Typography
                          component='span'
                          sx={{
                            color: 'success.main',
                            fontSize: '0.78rem',
                            fontWeight: 850
                          }}
                        >
                          FREE
                        </Typography>
                      }
                    />
                    <DetailRow
                      label='Registered at'
                      value={formatDate(data.registeredAtUtc)}
                    />
                    <DetailRow
                      label='Status'
                      value={
                        <Typography
                          component='span'
                          sx={{
                            color: 'success.main',
                            fontSize: '0.78rem',
                            fontWeight: 850
                          }}
                        >
                          REGISTERED
                        </Typography>
                      }
                    />
                  </>
                ) : (
                  <>
                    <DetailRow label='Booking code' value={bookingCode} />
                    <DetailRow
                      label='Registration option'
                      value={data.eventPackageName ?? '-'}
                    />
                    <DetailRow label='Payment' value={data.paymentStatus} />
                    <DetailRow
                      label='Total'
                      value={formatCurrency(data.grossAmount)}
                    />
                    {data.paymentDeadlineUtc && (
                      <DetailRow
                        label='Payment deadline'
                        value={`${formatDate(data.paymentDeadlineUtc)} WIB`}
                      />
                    )}
                  </>
                )}
              </Box>
            </Box>

            {successfulPaid && (
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
                <Typography variant='h5' fontWeight={900}>
                  {formatCurrency(data.grossAmount)}
                </Typography>
              </Box>
            )}

            {successfulFree && (
              <Alert severity='success' sx={{ mt: 4 }}>
                Your ticket is ready and is also sent to the registered email address.
              </Alert>
            )}

            {error && <Alert severity='error' sx={{ mt: 3 }}>{error}</Alert>}

            {data.status === 'PendingPayment' && data.snapToken && (
              <Button
                variant='contained'
                size='large'
                sx={{ mt: 4 }}
                disabled={openingPayment || deadlineReached}
                onClick={() => void handleContinuePayment()}
              >
                {deadlineReached
                  ? 'Payment window ended'
                  : openingPayment
                    ? 'Opening payment...'
                    : 'Continue payment'}
              </Button>
            )}

            {data.status === 'Expired' && (
              <Alert severity='warning' sx={{ mt: 4 }}>
                This payment window has expired and the reserved quota has been released. You can register again using the same email address.
              </Alert>
            )}

            {['Failed', 'Cancelled'].includes(data.status) && (
              <Alert severity='warning' sx={{ mt: 4 }}>
                This registration is no longer active. Any reserved quota has been released by the backend.
              </Alert>
            )}

            {documentButtons}

            {!registrationActive && (
              <Box sx={{ mt: 4, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button component={Link} href='/home' variant='outlined' size='large'>
                  Browse events
                </Button>
                <Button component={Link} href='/account' variant='text' size='large'>
                  My account
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </PublicSiteLayout>
  )
}

export default RegistrationStatusPage
