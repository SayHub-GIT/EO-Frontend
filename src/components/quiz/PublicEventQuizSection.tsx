'use client'

import NextLink from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import type { PublicEvent } from '@/lib/api'

type Props = {
  event: PublicEvent
}

const PublicEventQuizSection = ({ event }: Props) => {
  const quizContext =
    event.about?.trim() ||
    event.description?.trim() ||
    `Interactive Quiz for ${event.name}.`

  return (
    <Box component='section' id='quiz'>
      <Box sx={{ mb: 3 }}>
        <Chip label='Quiz' color='primary' variant='tonal' size='small' />
        <Typography variant='h4' fontWeight={700} sx={{ mt: 1.5 }}>
          Join the event Quiz
        </Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mt: 1, maxWidth: 820 }}>
          Enter the room prepared for this event using the PIN shared by the host. QR links and room validation remain scoped to this event.
        </Typography>
      </Box>

      <Card variant='outlined' sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
              gap: { xs: 3, md: 4 },
              alignItems: 'center'
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 58,
                    height: 58,
                    borderRadius: 2.5,
                    bgcolor: 'action.hover',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}
                >
                  {event.logoUrl ? (
                    <Box
                      component='img'
                      src={event.logoUrl}
                      alt=''
                      sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 0.75 }}
                    />
                  ) : (
                    <i className='tabler-help-hexagon text-3xl text-primary' />
                  )}
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='h5' fontWeight={800}>
                    Join Room
                  </Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.35 }}>
                    {event.name} Quiz
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2.5 }} />

              <Typography variant='overline' color='text.secondary' fontWeight={800}>
                Quiz context
              </Typography>
              <Typography
                variant='body1'
                color='text.secondary'
                sx={{ mt: 0.75, lineHeight: 1.75, maxWidth: 760, whiteSpace: 'pre-line' }}
              >
                {quizContext}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2.5 }}>
                <Chip
                  size='small'
                  variant='outlined'
                  icon={<i className='tabler-key' />}
                  label='Join with PIN'
                />
                <Chip
                  size='small'
                  variant='outlined'
                  icon={<i className='tabler-qrcode' />}
                  label='QR deep-link supported'
                />
                <Chip
                  size='small'
                  variant='outlined'
                  icon={<i className='tabler-lock-square-rounded' />}
                  label='Event-scoped room'
                />
              </Box>
            </Box>

            <Box
              sx={{
                minWidth: { md: 220 },
                display: 'grid',
                gap: 1.5,
                justifyItems: { xs: 'stretch', md: 'end' }
              }}
            >
              <Chip
                icon={<i className='tabler-key' />}
                label='Enter room code'
                color='primary'
                variant='tonal'
              />

              <Button
                component={NextLink}
                href={`/events/${encodeURIComponent(event.slug)}/quiz`}
                variant='contained'
                size='large'
                startIcon={<i className='tabler-login-2' />}
                sx={{ minWidth: 180 }}
              >
                Join Room
              </Button>
            </Box>
          </Box>

        </CardContent>
      </Card>
    </Box>
  )
}

export default PublicEventQuizSection
