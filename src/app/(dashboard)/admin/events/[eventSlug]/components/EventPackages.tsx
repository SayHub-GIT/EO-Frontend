'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import ConfirmActionDialog from '@/components/feedback/ConfirmActionDialog'

import EventPackageDialog, {
  type RaceCategoryOption,
  type RaceCategorySelection
} from './EventPackageDialog'
import type { EventPackage, CreateEventPackageRequest } from '../registrations/services/types/event-package'
import {
  getEventPackages,
  createEventPackage,
  updateEventPackage,
  deactivateEventPackage
} from '../registrations/services/event-package.service'
import {
  getAdminEventExperience,
  updateAdminEventExperience,
  type EventExperienceConfig,
  type EventWorkspaceItem
} from '@/lib/event-experience'

type Props = {
  eventId: string
  readOnly?: boolean
}

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `race-category-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const normalizeWorkspaceItems = (value: unknown): EventWorkspaceItem[] => {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
    const record = entry as Record<string, unknown>
    const id = typeof record.id === 'string' && record.id.trim() ? record.id : `legacy-${index}`
    const title = typeof record.title === 'string' ? record.title : ''

    return [{ ...record, id, title, active: record.active !== false } as EventWorkspaceItem]
  })
}

const EventPackages = ({ eventId, readOnly = false }: Props) => {
  const [packages, setPackages] = useState<EventPackage[]>([])
  const [experience, setExperience] = useState<EventExperienceConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<EventPackage | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<EventPackage | null>(null)
  const deactivateLockRef = useRef(false)

  const raceCategories = useMemo(
    () => normalizeWorkspaceItems(experience?.moduleData?.['race-categories']),
    [experience]
  )
  const runningEvent = experience?.kind === 'Running'

  const loadPackages = async () => {
    try {
      setLoading(true)
      setError('')
      const [packageResult, experienceResult] = await Promise.all([
        getEventPackages(eventId),
        getAdminEventExperience(eventId)
      ])
      setPackages([...packageResult].sort((a, b) => a.sortOrder - b.sortOrder))
      setExperience(experienceResult)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load packages.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPackages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const linkedRaceCategory = (packageId: string) =>
    raceCategories.find(category => String(category.packageId ?? '') === packageId)

  const raceCategoryOptions = useMemo<RaceCategoryOption[]>(
    () => raceCategories.map(category => {
      const packageId = String(category.packageId ?? '')
      const linkedPackage = packageId ? packages.find(item => item.id === packageId) : undefined

      return {
        id: category.id,
        title: category.title || 'Untitled race category',
        distance: typeof category.distance === 'string' ? category.distance : undefined,
        linkedPackageName: linkedPackage?.name ?? (packageId ? 'another package' : null)
      }
    }),
    [packages, raceCategories]
  )

  const syncRaceCategory = async (packageId: string, selection: RaceCategorySelection) => {
    if (!experience || experience.kind !== 'Running' || !selection) return

    const current = normalizeWorkspaceItems(experience.moduleData?.['race-categories'])
    const withoutCurrentPackage = current.map(item => {
      if (String(item.packageId ?? '') !== packageId) return item
      const { packageId: _packageId, ...rest } = item
      return rest as EventWorkspaceItem
    })

    let next: EventWorkspaceItem[]

    if (selection.mode === 'new') {
      next = [
        ...withoutCurrentPackage,
        {
          id: createId(),
          title: selection.title,
          distance: selection.distance || undefined,
          packageId,
          active: true
        }
      ]
    } else {
      const selected = withoutCurrentPackage.find(item => item.id === selection.id)
      if (!selected) throw new Error('The selected Race Category no longer exists. Reload and try again.')

      const usedByAnotherPackage = String(selected.packageId ?? '')
      if (usedByAnotherPackage && usedByAnotherPackage !== packageId) {
        throw new Error('That Race Category is already linked to another Package.')
      }

      next = withoutCurrentPackage.map(item =>
        item.id === selection.id ? { ...item, packageId } : item
      )
    }

    const updatedExperience = await updateAdminEventExperience(eventId, {
      enabledModules: experience.enabledModules,
      registrationFields: experience.registrationFields,
      moduleData: {
        ...experience.moduleData,
        'race-categories': next
      }
    })

    setExperience(updatedExperience)
  }

  const handleCreate = async (data: CreateEventPackageRequest, raceCategory: RaceCategorySelection) => {
    const created = await createEventPackage(eventId, data)

    try {
      await syncRaceCategory(created.id, raceCategory)
    } catch (syncError) {
      await loadPackages()
      throw new Error(
        `Package was created, but the Race Category link could not be saved. ${syncError instanceof Error ? syncError.message : 'Edit the Package and try again.'}`
      )
    }

    await loadPackages()
  }

  const handleUpdate = async (data: CreateEventPackageRequest, raceCategory: RaceCategorySelection) => {
    if (!selectedPackage) return
    await updateEventPackage(eventId, selectedPackage.id, data)
    await syncRaceCategory(selectedPackage.id, raceCategory)
    await loadPackages()
  }

  const handleDeactivate = async (packageItem: EventPackage) => {
    if (actionLoading || deactivateLockRef.current) return

    deactivateLockRef.current = true

    try {
      setActionLoading(true)
      setError('')
      await deactivateEventPackage(eventId, packageItem.id)
      await loadPackages()
      setDeactivateTarget(null)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to deactivate package.')
    } finally {
      setActionLoading(false)
      deactivateLockRef.current = false
    }
  }

  const formatPrice = (value: number) =>
    value === 0
      ? 'Free'
      : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

  return (
    <>
      <Card elevation={0}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 3 }}>
            <Box>
              <Typography variant='h5' fontWeight={600}>Event Packages</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                {readOnly
                  ? 'Archived package history is read-only.'
                  : runningEvent
                    ? 'Configure pricing and quota here, and choose the Race Category at the same time. You can also create a new Race Category directly from the Package form.'
                    : 'Configure package pricing, benefits and package-level allocation before or after publishing.'}
              </Typography>
            </Box>

            {!readOnly && (
              <Button
                variant='contained'
                startIcon={<i className='tabler-plus' />}
                onClick={() => {
                  setSelectedPackage(null)
                  setDialogOpen(true)
                }}
              >
                Add Package
              </Button>
            )}
          </Box>

          {error && <Alert severity='error' sx={{ mt: 4 }}>{error}</Alert>}
          <Divider sx={{ my: 5 }} />

          {loading ? (
            <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={28} /></Box>
          ) : packages.length === 0 ? (
            <Box sx={{ py: 10, textAlign: 'center' }}>
              <i className='tabler-ticket text-5xl' />
              <Typography variant='h6' sx={{ mt: 2 }}>No packages yet</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                {readOnly ? 'This event was archived without packages.' : 'Add at least one package to set event pricing.'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 4 }}>
              {packages.map(packageItem => {
                const category = linkedRaceCategory(packageItem.id)

                return (
                  <Card key={packageItem.id} variant='outlined'>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                        <Box>
                          <Typography variant='h6' fontWeight={700}>{packageItem.name}</Typography>
                          <Typography variant='h6' color='primary' sx={{ mt: 1 }}>{formatPrice(packageItem.price)}</Typography>
                        </Box>
                        <Chip size='small' label={packageItem.isActive ? 'Active' : 'Inactive'} color={packageItem.isActive ? 'success' : 'default'} />
                      </Box>

                      {runningEvent && (
                        <Box sx={{ mt: 2 }}>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={category ? 'primary' : 'warning'}
                            icon={<i className='tabler-run' />}
                            label={category ? `${category.title}${category.distance ? ` · ${String(category.distance)}` : ''}` : 'Race Category not linked'}
                          />
                        </Box>
                      )}

                      <Box sx={{ display: 'grid', gap: 1, mt: 3 }}>
                        <Typography variant='body2' color='text.secondary'>
                          Capacity: {packageItem.isUnlimited ? 'Unlimited' : packageItem.capacity?.toLocaleString()}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>Registered: {packageItem.registeredCount.toLocaleString()}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          Remaining: {packageItem.isUnlimited ? 'Unlimited' : packageItem.remainingQuota?.toLocaleString() ?? '0'}
                        </Typography>
                      </Box>

                      {packageItem.benefits && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant='body2' fontWeight={600}>Benefits</Typography>
                          <Typography variant='body2' color='text.secondary' sx={{ mt: 1, whiteSpace: 'pre-line' }}>{packageItem.benefits}</Typography>
                        </Box>
                      )}

                      {!readOnly && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 1 }}>
                          <Tooltip title='Edit package'>
                            <span>
                              <IconButton
                                size='small'
                                disabled={!packageItem.isActive || actionLoading}
                                onClick={() => {
                                  setSelectedPackage(packageItem)
                                  setDialogOpen(true)
                                }}
                              >
                                <i className='tabler-edit' />
                              </IconButton>
                            </span>
                          </Tooltip>
                          {packageItem.isActive && (
                            <Tooltip title='Deactivate package'>
                              <span>
                                <IconButton size='small' color='error' disabled={actionLoading} onClick={() => setDeactivateTarget(packageItem)}>
                                  <i className='tabler-ban' />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      <ConfirmActionDialog
        open={Boolean(deactivateTarget)}
        title='Deactivate package?'
        description='This package will stop accepting new registrations. Existing participant and transaction history will remain available.'
        confirmLabel='Confirm Deactivate'
        loading={actionLoading}
        onClose={() => {
          if (!actionLoading) setDeactivateTarget(null)
        }}
        onConfirm={async () => {
          if (!deactivateTarget) return
          await handleDeactivate(deactivateTarget)
        }}
        details={deactivateTarget ? [
          { label: 'Package', value: deactivateTarget.name },
          { label: 'Registered', value: deactivateTarget.registeredCount.toLocaleString() },
          { label: 'Current status', value: deactivateTarget.isActive ? 'Active' : 'Inactive' }
        ] : []}
        warning='Participants already registered under this package are not deleted.'
      />

      {!readOnly && (
        <EventPackageDialog
          open={dialogOpen}
          packageItem={selectedPackage}
          runningEvent={runningEvent}
          raceCategories={raceCategoryOptions}
          linkedRaceCategoryId={selectedPackage ? linkedRaceCategory(selectedPackage.id)?.id ?? null : null}
          onClose={() => {
            if (!actionLoading) {
              setDialogOpen(false)
              setSelectedPackage(null)
            }
          }}
          onSubmit={selectedPackage ? handleUpdate : handleCreate}
        />
      )}
    </>
  )
}

export default EventPackages
