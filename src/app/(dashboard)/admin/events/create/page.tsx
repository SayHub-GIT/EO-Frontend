'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'
import NextLink from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

import EventForm, { type EventFormSubmission } from '../components/EventForm'
import { createAdminEvent, uploadAdminEventAsset } from '@/lib/admin-events'
import { updateAdminEventExperience } from '@/lib/event-experience'

const CreateEventPage = () => {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async ({ request, assets, experienceConfig }: EventFormSubmission) => {
    setSubmitting(true)
    setError(null)

    let createdEventId: string | null = null

    try {
      const created = await createAdminEvent(request)
      createdEventId = created.id

      await updateAdminEventExperience(created.id, {
        enabledModules: experienceConfig.enabledModules,
        registrationFields: experienceConfig.registrationFields
      })

      if (!assets.logo || !assets.hero || !assets.registration) {
        throw new Error('Logo, hero image, and registration visual are required for a new event.')
      }

      await uploadAdminEventAsset(created.id, 'logo', assets.logo)
      await uploadAdminEventAsset(created.id, 'hero', assets.hero)
      await uploadAdminEventAsset(created.id, 'registration', assets.registration)

      router.push(`/admin/events/${encodeURIComponent(created.id)}/dashboard`)
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to create event.'

      if (createdEventId) {
        router.push(`/admin/events/${encodeURIComponent(createdEventId)}/edit`)
        return
      }

      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link component={NextLink} href='/admin/home' color='inherit' underline='hover'>Home</Link>
          <Link component={NextLink} href='/admin/events' color='inherit' underline='hover'>Events</Link>
          <Typography color='text.primary'>Create Event</Typography>
        </Breadcrumbs>

        <Typography variant='h4' fontWeight={700}>Create Event</Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
          Choose Running or Seminar, then configure the operational modules and registration fields this event needs.
        </Typography>
        <Alert severity='info' sx={{ mt: 3 }}>
          Quiz is available as an event module. After the event is created, open Event Settings to configure the Quiz question bank, CYRA generation, answer markers, and live rooms.
        </Alert>
      </Box>

      <EventForm
        submitLabel='Create Event'
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/admin/events')}
      />
    </Box>
  )
}

export default CreateEventPage
