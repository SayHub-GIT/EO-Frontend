import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
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
      <Box
        sx={{
          minHeight: '70dvh',
          width: '100%',
          maxWidth: 860,
          mx: 'auto',
          px: { xs: 2.5, sm: 4, md: 6 },
          py: { xs: 7, md: 10 }
        }}
      >
        <Box
          sx={{
            mt: { xs: 4, md: 7 },
            pt: 4,
            borderTop: '1px solid',
            borderColor: 'divider'
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
            EVENT STATUS
          </Typography>
          <Typography
            component='h1'
            sx={{
              mt: 1.25,
              maxWidth: 680,
              fontSize: { xs: '2.15rem', sm: '2.9rem' },
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-.035em'
            }}
          >
            Event unavailable
          </Typography>
          <Typography
            color='text.secondary'
            sx={{ mt: 1.5, maxWidth: 660, lineHeight: 1.75 }}
          >
            We couldn&apos;t load this event right now. It may be unpublished, archived, or no longer publicly available.
          </Typography>

          <Box sx={{ mt: 3.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              component={Link}
              href='/home#event-categories'
              variant='contained'
            >
              Browse events
            </Button>
            <Button component={Link} href='/home' variant='outlined'>
              Back to home
            </Button>
          </Box>
        </Box>
      </Box>
    )
  }
}

export default EventPage
