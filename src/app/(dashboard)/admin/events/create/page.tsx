'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'
import NextLink from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
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
    if (submitting) return

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

        <Typography variant='h4' fontWeight={700}>Create Program / Event</Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
          Start from Seminar, Workshop, Running, or Other, then enable only the modules and participant fields needed for this program.
        </Typography>
        <Alert severity='info' sx={{ mt: 3 }}>
          Participant-facing text, images, registration fields, access rules, schedule, modules, and program information are managed from admin so the same platform can be reused for different event formats.
        </Alert>
      </Box>

      <EventForm
        submitLabel='Create Program / Event'
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/admin/events')}
      />
    </Box>
  )
}

export default CreateEventPage
