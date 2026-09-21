'use client'

import { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { useParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

import RegistrationStats from './components/RegistrationStats'
import RegistrationToolbar from './components/RegistrationToolbar'
import RegistrationTable from './components/RegistrationTable'
import ImportExcelDialog from './components/ImportExcelDialog'

import { cancelRegistration, getRegistrationStats, getRegistrations } from './services/registration.service'
import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import { getEventPackages } from './services/event-package.service'
import type { EventPackage } from './services/types/event-package'
import type { Registration, RegistrationFilters, RegistrationStatsData } from './types'
import { getAdminEvent, type AdminEvent } from '@/lib/admin-events'

const Page = () => {
  const params = useParams<{ eventSlug: string }>()
  const eventId = params.eventSlug
  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [filters, setFilters] = useState<RegistrationFilters>({
    search: '', participantType: 'ALL', status: 'ALL', eventPackageId: ''
  })
  const [eventPackages, setEventPackages] = useState<EventPackage[]>([])
  const [stats, setStats] = useState<RegistrationStatsData>({ total: 0, internal: 0, external: 0, registered: 0 })
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRegistrations = async () => {
    try {
      setLoading(true)
      setError(null)

      const [eventData, statsData, registrationData, packageData] = await Promise.all([
        getAdminEvent(eventId),
        getRegistrationStats(eventId),
        getRegistrations(eventId, filters),
        getEventPackages(eventId)
      ])

      setEvent(eventData)
      setStats(statsData)
      setRegistrations(filters.status === 'ALL' ? registrationData : registrationData.filter(item => item.status === filters.status))
      setEventPackages(packageData)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load registrations.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelRegistration = async (registrationId: string) => {
    if (event?.status === 'Archived') return
    try {
      setError(null)
      await cancelRegistration(registrationId)
      await loadRegistrations()
      pushAppAlert({ severity: 'success', message: 'Registration was cancelled.' })
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Unable to cancel registration.'
      setError(message)
      pushAppAlert({ severity: 'error', message })
    }
  }

  useEffect(() => {
    void loadRegistrations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, filters.search, filters.participantType, filters.status, filters.eventPackageId])

  const archived = event?.status === 'Archived'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 4 }}>
          <Box>
            <Typography variant='h4' fontWeight={700}>Registration Management</Typography>
            <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
              {archived ? 'Review participant history for ' : 'Manage participants registered for '}<strong>{event?.name ?? 'this event'}</strong>.
            </Typography>
          </Box>
          <Button component={NextLink} variant='outlined' startIcon={<i className='tabler-arrow-left' />} href={`/admin/events/${encodeURIComponent(eventId)}`}>
            Back to event
          </Button>
        </Box>
      </Box>

      {error && <Alert severity='error'>{error}</Alert>}
      {archived && <Alert severity='info'>Archived event registrations are read-only. Search and filters remain available for history review.</Alert>}

      {event && (
        <Card>
          <CardContent>
            <Typography variant='h6' fontWeight={600}>Event quota</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: .5 }}>Quota is shared across all packages for this event.</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mt: 3 }}>
              <Box><Typography variant='body2' color='text.secondary'>Event capacity</Typography><Typography variant='h6' fontWeight={700}>{event.capacity.toLocaleString()}</Typography></Box>
              <Box><Typography variant='body2' color='text.secondary'>Registered count</Typography><Typography variant='h6' fontWeight={700}>{event.registeredCount.toLocaleString()}</Typography></Box>
              <Box><Typography variant='body2' color='text.secondary'>Remaining quota</Typography><Typography variant='h6' fontWeight={700}>{event.remainingQuota.toLocaleString()}</Typography></Box>
            </Box>
          </CardContent>
        </Card>
      )}

      <RegistrationStats stats={stats} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Box>
          <Typography variant='h5' fontWeight={600}>Participants</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>View participant records and filter by type, package, or status.</Typography>
        </Box>

        <RegistrationToolbar
          filters={filters}
          packages={eventPackages}
          onFiltersChange={setFilters}
          onImport={() => setImportOpen(true)}
          allowImport={!archived}
        />

        <RegistrationTable
          registrations={registrations}
          loading={loading}
          onCancel={archived ? undefined : handleCancelRegistration}
        />
      </Box>

      {!archived && (
        <ImportExcelDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          eventSlug={eventId}
          onImported={loadRegistrations}
        />
      )}
    </Box>
  )
}

export default Page
