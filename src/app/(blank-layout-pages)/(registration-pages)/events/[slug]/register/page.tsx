import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import EventRegistration from '@views/EventRegistration'
import { getPublicEventBySlug } from '@/lib/api'

type Props = {
  params: Promise<{ slug: string }>
}

const RegistrationPage = async ({ params }: Props) => {
  const { slug } = await params
  const event = await getPublicEventBySlug(slug)
  const now = Date.now()
  const opensAt = event.registrationStart ? new Date(event.registrationStart).getTime() : Number.NaN
  const closesAt = event.registrationEnd ? new Date(event.registrationEnd).getTime() : Number.NaN
  const isBeforeOpen = !Number.isNaN(opensAt) && now < opensAt
  const isAfterClose = !Number.isNaN(closesAt) && now > closesAt
  const isFull = typeof event.remainingQuota === 'number' && event.remainingQuota <= 0
  const normalizedStatus = event.registrationStatus?.toLowerCase().replace(/[\\s_-]/g, '') ?? ''
  const isExplicitlyClosed = ['archived', 'cancelled', 'canceled', 'closed', 'registrationclosed', 'soldout', 'full', 'ended']
    .some(value => normalizedStatus.includes(value))
  const isExplicitlyUpcoming = normalizedStatus.includes('comingsoon') || normalizedStatus.includes('upcoming')
  const isUnavailable = isBeforeOpen || isAfterClose || isFull || isExplicitlyClosed || isExplicitlyUpcoming

  if (isUnavailable) {
    const title = isBeforeOpen || isExplicitlyUpcoming
      ? 'Registration has not opened yet'
      : isFull
        ? 'Event quota is full'
        : 'Registration is closed'

    const detail = isBeforeOpen
      ? `Registration opens ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(event.registrationStart!))} WIB.`
      : isAfterClose
        ? `Registration closed ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(event.registrationEnd!))} WIB.`
        : isFull
          ? 'All available event seats have been filled.'
          : isExplicitlyUpcoming
            ? 'The organizer has marked registration as upcoming. Please check the event page again when registration opens.'
            : 'The organizer has marked registration as unavailable for this event.'

    const logoUrl = event.logoUrl || '/EO%20Navbar.png'

    return (
      <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary' }}>
        <Box
          sx={{
            width: '100%',
            maxWidth: 960,
            mx: 'auto',
            px: { xs: 2.5, sm: 4, md: 6 },
            py: { xs: 5, md: 8 }
          }}
        >
          <Button
            component={Link}
            href={`/events/${encodeURIComponent(slug)}`}
            variant='text'
            startIcon={<i className='tabler-arrow-left' />}
            sx={{ px: 0, color: 'text.secondary' }}
          >
            Back to event
          </Button>

          <Box sx={{ mt: { xs: 7, md: 11 }, maxWidth: 720 }}>
            <Box
              component='img'
              src={logoUrl}
              alt={`${event.name} logo`}
              sx={{
                display: 'block',
                maxWidth: 170,
                maxHeight: 96,
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                mb: 5
              }}
            />

            <Typography sx={{ color: '#00A7E1', fontSize: '0.72rem', fontWeight: 850, letterSpacing: '.07em' }}>
              REGISTRATION STATUS
            </Typography>
            <Typography
              component='h1'
              sx={{
                mt: 1.25,
                maxWidth: 680,
                fontSize: { xs: '2rem', sm: '2.7rem', md: '3.25rem' },
                fontWeight: 900,
                lineHeight: 1.04,
                letterSpacing: '-.035em'
              }}
            >
              {title}
            </Typography>
            <Typography
              color='text.secondary'
              sx={{ mt: 2, maxWidth: 620, fontSize: { xs: '0.95rem', sm: '1rem' }, lineHeight: 1.75 }}
            >
              {detail}
            </Typography>

            <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 800 }}>{event.name}</Typography>
              <Typography color='text.secondary' sx={{ mt: 0.5, fontSize: '0.88rem' }}>
                You can still review the event details while registration is unavailable.
              </Typography>
            </Box>

            <Button
              component={Link}
              href={`/events/${encodeURIComponent(slug)}`}
              variant='contained'
              sx={{ mt: 4, px: 3 }}
            >
              View event details
            </Button>
          </Box>
        </Box>
      </Box>
    )
  }

  return <EventRegistration slug={slug} />
}

export default RegistrationPage
