import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ eventSlug: string; sessionId: string }>
}

const LegacyQuizLiveHostPage = async ({ params }: Props) => {
  const { eventSlug, sessionId } = await params

  redirect(
    `/quiz/host/${encodeURIComponent(eventSlug)}/${encodeURIComponent(sessionId)}`
  )
}

export default LegacyQuizLiveHostPage
