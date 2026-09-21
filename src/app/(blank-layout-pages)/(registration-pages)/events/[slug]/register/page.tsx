import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
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

  if (isBeforeOpen || isAfterClose || isFull) {
    const title = isBeforeOpen ? 'Registration has not opened yet' : isFull ? 'Event quota is full' : 'Registration is closed'
    const detail = isBeforeOpen
      ? `Registration opens ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(event.registrationStart!))} WIB.`
      : isAfterClose
        ? `Registration closed ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(event.registrationEnd!))} WIB.`
        : 'All available event seats have been filled.'

    return (
      <Box sx={{ minHeight: '100dvh', px: 3, py: 8, display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
        <Card sx={{ width: '100%', maxWidth: 620 }}>
          <CardContent sx={{ p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Box sx={{ width: 64, height: 64, mx: 'auto', borderRadius: '50%', bgcolor: 'action.hover', color: 'warning.main', display: 'grid', placeItems: 'center' }}>
              <i className='tabler-calendar-off text-3xl' />
            </Box>
            <Typography variant='h4' fontWeight={750} sx={{ mt: 3 }}>{title}</Typography>
            <Typography color='text.secondary' sx={{ mt: 1.5, lineHeight: 1.7 }}>{detail}</Typography>
            
            <Button component={Link} href={`/events/${encodeURIComponent(slug)}`} variant='contained' sx={{ mt: 4 }}>Back to Event</Button>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return <EventRegistration slug={slug} />
}

export default RegistrationPage
