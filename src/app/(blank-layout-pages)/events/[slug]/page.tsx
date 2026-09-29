import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import EventDetail from '@views/EventDetail'
import { getPublicEventBySlug } from '@/lib/api'

type Props = {
  params: Promise<{ slug: string }>
}

const EventPage = async ({ params }: Props) => {
  const { slug } = await params

  try {
    const event = await getPublicEventBySlug(slug)

    return <EventDetail event={event} />
  } catch {
    return (
      <Box sx={{ minHeight: '70dvh', px: 3, py: 10, display: 'grid', placeItems: 'center' }}>
        <Card sx={{ width: '100%', maxWidth: 520 }}>
          <CardContent sx={{ p: { xs: 4, md: 6 }, textAlign: 'center' }}>
            <Box sx={{ width: 64, height: 64, mx: 'auto', borderRadius: '50%', bgcolor: 'action.hover', display: 'grid', placeItems: 'center', color: 'text.secondary' }}>
              <i className='tabler-calendar-off text-3xl' />
            </Box>
            <Typography variant='h4' fontWeight={700} sx={{ mt: 3 }}>Event unavailable</Typography>
            <Typography color='text.secondary' sx={{ mt: 1.5 }}>We couldn&apos;t load this event right now. It may be unpublished, archived, or unavailable.</Typography>
            <Button component={Link} href='/home' variant='contained' sx={{ mt: 4 }}>Back to Home</Button>
          </CardContent>
        </Card>
      </Box>
    )
  }
}

export default EventPage
