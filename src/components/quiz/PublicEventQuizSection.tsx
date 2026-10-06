'use client'

import NextLink from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import type { PublicEvent } from '@/lib/api'

type Props = {
  event: PublicEvent
}

const PublicEventQuizSection = ({ event }: Props) => (
  <Box component='section' id='quiz'>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
        gap: { xs: 3, md: 6 },
        alignItems: 'end'
      }}
    >
      <Box sx={{ maxWidth: 760 }}>
        <Typography
          sx={{
            color: '#00A7E1',
            fontSize: '0.7rem',
            fontWeight: 850,
            letterSpacing: '.08em'
          }}
        >
          LIVE QUIZ
        </Typography>
        <Typography
          component='h2'
          sx={{
            mt: 1,
            fontSize: { xs: '1.55rem', md: '1.9rem' },
            lineHeight: 1.12,
            fontWeight: 900,
            letterSpacing: '-.02em'
          }}
        >
          Join the event quiz
        </Typography>
        <Typography color='text.secondary' sx={{ mt: 1, maxWidth: 680, fontSize: '0.9rem', lineHeight: 1.7 }}>
          Use the room code shown by the host, or scan the session QR code to open the correct room automatically.
        </Typography>
      </Box>

      <Button
        component={NextLink}
        href={`/events/${encodeURIComponent(event.slug)}/quiz`}
        variant='contained'
        size='large'
        endIcon={<i className='tabler-arrow-right' />}
        sx={{ minHeight: 46, minWidth: { md: 168 } }}
      >
        Join quiz
      </Button>
    </Box>

    <Divider sx={{ mt: 4 }} />

    <Box
      sx={{
        pt: 3,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
        gap: { xs: 2, sm: 3 }
      }}
    >
      <Box>
        <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'text.secondary', letterSpacing: '.05em' }}>
          ROOM CODE
        </Typography>
        <Typography sx={{ mt: 0.45, fontSize: '0.86rem', lineHeight: 1.55 }}>
          Enter the code displayed by the host.
        </Typography>
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'text.secondary', letterSpacing: '.05em' }}>
          QR ACCESS
        </Typography>
        <Typography sx={{ mt: 0.45, fontSize: '0.86rem', lineHeight: 1.55 }}>
          QR links open the matching event room directly.
        </Typography>
      </Box>
      <Box>
        <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'text.secondary', letterSpacing: '.05em' }}>
          SESSION
        </Typography>
        <Typography sx={{ mt: 0.45, fontSize: '0.86rem', lineHeight: 1.55 }}>
          Join is available after the host opens the session.
        </Typography>
      </Box>
    </Box>
  </Box>
)

export default PublicEventQuizSection
