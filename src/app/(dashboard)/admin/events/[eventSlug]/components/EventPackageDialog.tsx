'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

import type { EventPackage, CreateEventPackageRequest } from '../registrations/services/types/event-package'
import { hasFieldErrors, integerValue, numericValue, requiredText, type FieldErrors } from '@/lib/form-validation'

export type RaceCategoryOption = {
  id: string
  title: string
  distance?: string
  linkedPackageName?: string | null
}

export type RaceCategorySelection =
  | { mode: 'existing'; id: string }
  | { mode: 'new'; title: string; distance: string }
  | null

type Props = {
  open: boolean
  packageItem?: EventPackage | null
  runningEvent?: boolean
  raceCategories?: RaceCategoryOption[]
  linkedRaceCategoryId?: string | null
  onClose: () => void
  onSubmit: (data: CreateEventPackageRequest, raceCategory: RaceCategorySelection) => Promise<void>
}

const NEW_RACE_CATEGORY = '__new_race_category__'

type PackageField =
  | 'name'
  | 'capacity'
  | 'price'
  | 'sortOrder'
  | 'raceCategoryId'
  | 'newRaceCategoryName'

const EventPackageDialog = ({
  open,
  packageItem,
  runningEvent = false,
  raceCategories = [],
  linkedRaceCategoryId,
  onClose,
  onSubmit
}: Props) => {
  const isEdit = Boolean(packageItem)

  const [name, setName] = useState('')
  const [benefits, setBenefits] = useState('')
  const [capacity, setCapacity] = useState('')
  const [price, setPrice] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [raceCategoryId, setRaceCategoryId] = useState('')
  const [newRaceCategoryName, setNewRaceCategoryName] = useState('')
  const [newRaceDistance, setNewRaceDistance] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<PackageField>>({})
  const submitLockRef = useRef(false)

  const selectableRaceCategories = useMemo(
    () => raceCategories.filter(category => !category.linkedPackageName || category.id === linkedRaceCategoryId),
    [linkedRaceCategoryId, raceCategories]
  )

  useEffect(() => {
    if (!open) return

    setName(packageItem?.name ?? '')
    setBenefits(packageItem?.benefits ?? '')
    setCapacity(packageItem?.capacity == null ? '' : String(packageItem.capacity))
    setPrice(packageItem ? String(packageItem.price) : '')
    setSortOrder(packageItem ? String(packageItem.sortOrder) : '0')
    setRaceCategoryId(
      runningEvent
        ? linkedRaceCategoryId || (selectableRaceCategories.length === 0 ? NEW_RACE_CATEGORY : '')
        : ''
    )
    setNewRaceCategoryName('')
    setNewRaceDistance('')
    setError('')
    setFieldErrors({})
  }, [open, packageItem, runningEvent, linkedRaceCategoryId, selectableRaceCategories.length])

  const handleSubmit = async () => {
    if (loading || submitLockRef.current) return

    setError('')

    const nextErrors: FieldErrors<PackageField> = {
      name: requiredText(name, 'Package name'),
      capacity: integerValue(capacity, { label: 'Capacity', min: 1, allowEmpty: true }),
      price: numericValue(price, { label: 'Price', min: 0 }),
      sortOrder: integerValue(sortOrder, { label: 'Sort order', min: 0 })
    }

    if (runningEvent) {
      if (!raceCategoryId) nextErrors.raceCategoryId = 'Race Category is required for a Running package.'
      if (raceCategoryId === NEW_RACE_CATEGORY) {
        nextErrors.newRaceCategoryName = requiredText(newRaceCategoryName, 'New Race Category name')
      }
    }

    setFieldErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) return

    const parsedCapacity = capacity.trim() ? Number(capacity) : null
    const parsedPrice = Number(price)
    const parsedSortOrder = Number(sortOrder)

    let raceCategory: RaceCategorySelection = null

    if (runningEvent) {
      if (raceCategoryId === NEW_RACE_CATEGORY) {
        raceCategory = {
          mode: 'new',
          title: newRaceCategoryName.trim(),
          distance: newRaceDistance.trim()
        }
      } else {
        raceCategory = { mode: 'existing', id: raceCategoryId }
      }
    }

    submitLockRef.current = true

    try {
      setLoading(true)

      await onSubmit({
        name: name.trim(),
        benefits: benefits.trim() || null,
        capacity: parsedCapacity,
        price: parsedPrice,
        sortOrder: parsedSortOrder
      }, raceCategory)

      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong.')
    } finally {
      setLoading(false)
      submitLockRef.current = false
    }
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth='sm'>
      <DialogTitle>{isEdit ? 'Edit Event Package' : 'Create Event Package'}</DialogTitle>

      <DialogContent>
        <Stack spacing={4} sx={{ mt: 2 }}>
          {error && <Alert severity='error'>{error}</Alert>}

          <TextField
            fullWidth
            required
            label='Package Name'
            value={name}
            onChange={event => {
              setName(event.target.value)
              setFieldErrors(current => ({ ...current, name: undefined }))
            }}
            error={Boolean(fieldErrors.name)}
            helperText={fieldErrors.name}
            placeholder='e.g. 10K Regular'
          />

          {runningEvent && (
            <>
              <TextField
                fullWidth
                required
                select
                label='Race Category'
                value={raceCategoryId}
                onChange={event => {
                  setRaceCategoryId(event.target.value)
                  setFieldErrors(current => ({ ...current, raceCategoryId: undefined }))
                }}
                error={Boolean(fieldErrors.raceCategoryId)}
                helperText={fieldErrors.raceCategoryId ?? 'Choose the race category while creating the package. Categories already linked to another package cannot be selected.'}
              >
                <MenuItem value=''><em>Select race category</em></MenuItem>
                {raceCategories.map(category => (
                  <MenuItem
                    key={category.id}
                    value={category.id}
                    disabled={Boolean(category.linkedPackageName) && category.id !== linkedRaceCategoryId}
                  >
                    {category.title}{category.distance ? ` — ${category.distance}` : ''}
                    {category.linkedPackageName && category.id !== linkedRaceCategoryId ? ` · used by ${category.linkedPackageName}` : ''}
                  </MenuItem>
                ))}
                <MenuItem value={NEW_RACE_CATEGORY}>+ Create new Race Category with this Package</MenuItem>
              </TextField>

              {raceCategoryId === NEW_RACE_CATEGORY && (
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    required
                    label='New Race Category Name'
                    value={newRaceCategoryName}
                    onChange={event => {
                      setNewRaceCategoryName(event.target.value)
                      setFieldErrors(current => ({ ...current, newRaceCategoryName: undefined }))
                    }}
                    error={Boolean(fieldErrors.newRaceCategoryName)}
                    helperText={fieldErrors.newRaceCategoryName}
                    placeholder='e.g. Half Marathon'
                  />
                  <TextField
                    fullWidth
                    label='Distance'
                    value={newRaceDistance}
                    onChange={event => setNewRaceDistance(event.target.value)}
                    placeholder='e.g. 21.1K'
                  />
                </Stack>
              )}
            </>
          )}

          <TextField
            fullWidth
            multiline
            minRows={3}
            label='Benefits'
            value={benefits}
            onChange={event => setBenefits(event.target.value)}
            placeholder={'Race jersey\nBib number\nTiming chip'}
            helperText='Optional. You can separate benefits by line.'
          />

          <TextField
            fullWidth
            type='number'
            label='Capacity'
            value={capacity}
            onChange={event => {
              setCapacity(event.target.value)
              setFieldErrors(current => ({ ...current, capacity: undefined }))
            }}
            error={Boolean(fieldErrors.capacity)}
            inputProps={{ min: 1, step: 1, inputMode: 'numeric' }}
            helperText={fieldErrors.capacity ?? 'Leave blank for unlimited package quota. The main event capacity still applies.'}
          />

          <TextField
            fullWidth
            required
            type='number'
            label='Price'
            value={price}
            onChange={event => {
              setPrice(event.target.value)
              setFieldErrors(current => ({ ...current, price: undefined }))
            }}
            error={Boolean(fieldErrors.price)}
            inputProps={{ min: 0, step: 'any', inputMode: 'decimal' }}
            helperText={fieldErrors.price ?? 'Use 0 for free packages.'}
          />

          <TextField
            fullWidth
            type='number'
            label='Sort Order'
            value={sortOrder}
            onChange={event => {
              setSortOrder(event.target.value)
              setFieldErrors(current => ({ ...current, sortOrder: undefined }))
            }}
            error={Boolean(fieldErrors.sortOrder)}
            inputProps={{ min: 0, step: 1, inputMode: 'numeric' }}
            helperText={fieldErrors.sortOrder ?? 'Lower numbers appear first.'}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant='contained' onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Package'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EventPackageDialog
