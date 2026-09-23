import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'

import EventScopedQuizJoin from '@/components/quiz/EventScopedQuizJoin'
import { getPublicEventBySlug } from '@/lib/api'

type Props = {
  params: Promise<{ slug: string; roomCode: string }>
}

const EventQuizJoinPage = async ({ params }: Props) => {
  const { slug, roomCode } = await params

  try {
    const event = await getPublicEventBySlug(slug)

    return (
      <EventScopedQuizJoin
        event={event}
        roomCode={decodeURIComponent(roomCode)}
      />
    )
  } catch {
    return (
      <Box sx={{ minHeight: '70dvh', display: 'grid', placeItems: 'center', p: 3 }}>
        <Alert severity='error'>This event is unavailable.</Alert>
      </Box>
    )
  }
}

export default EventQuizJoinPage
