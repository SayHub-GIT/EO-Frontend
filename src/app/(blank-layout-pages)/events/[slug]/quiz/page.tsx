import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'

import EventQuizRoomEntry from '@/components/quiz/EventQuizRoomEntry'
import { getPublicEventBySlug } from '@/lib/api'
import { getPublicEventExperience } from '@/lib/event-experience'

type Props = {
  params: Promise<{ slug: string }>
}

const EventQuizPage = async ({ params }: Props) => {
  const { slug } = await params

  try {
    const event = await getPublicEventBySlug(slug)
    const experience = await getPublicEventExperience(event.id)

    if (!experience.enabledModules.includes('quiz')) {
      return (
        <Box sx={{ minHeight: '70dvh', display: 'grid', placeItems: 'center', p: 3 }}>
          <Alert severity='info'>Quiz is not enabled for this event.</Alert>
        </Box>
      )
    }

    return <EventQuizRoomEntry event={event} />
  } catch {
    return (
      <Box sx={{ minHeight: '70dvh', display: 'grid', placeItems: 'center', p: 3 }}>
        <Alert severity='error'>This event is unavailable.</Alert>
      </Box>
    )
  }
}

export default EventQuizPage
