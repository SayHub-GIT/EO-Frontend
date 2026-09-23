'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import {
  addDoorprizeManualParticipant,
  getDoorprizeManualPool,
  removeDoorprizeManualParticipant,
  type DoorprizeManualParticipant
} from '@/lib/doorprize'

type Props = {
  eventId: string
  disabled?: boolean
}

const DoorprizeManualPool = ({ eventId, disabled = false }: Props) => {
  const [items, setItems] = useState<DoorprizeManualParticipant[]>([])
  const [fullName, setFullName] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeItems = useMemo(() => items.filter(item => item.active), [items])

  const load = async () => {
    const result = await getDoorprizeManualPool(eventId)
    setItems(result)
  }

  useEffect(() => {
    let active = true

    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getDoorprizeManualPool(eventId)
        if (active) setItems(result)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load manual eligible pool.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void run()
    return () => { active = false }
  }, [eventId])

  const add = async () => {
    if (!fullName.trim() || saving) return

    try {
      setSaving(true)
      setError(null)

      await addDoorprizeManualParticipant(eventId, {
        fullName: fullName.trim(),
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined
      })

      setFullName('')
      setReference('')
      setNotes('')
      await load()

      pushAppAlert({
        severity: 'success',
        message: 'Manual participant added to the event-wide eligible pool.'
      })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to add manual participant.'
      setError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (candidateId: string) => {
    if (removing) return

    try {
      setRemoving(candidateId)
      setError(null)
      await removeDoorprizeManualParticipant(eventId, candidateId)
      await load()

      pushAppAlert({
        severity: 'success',
        message: 'Manual participant removed from future prize eligibility.'
      })
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : 'Unable to remove manual participant.'
      setError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setRemoving(null)
    }
  }

  return (
    <Card variant='outlined'>
      <CardContent sx={{ p: { xs: 3, md: 4 }, display: 'grid', gap: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant='h6' fontWeight={800}>Manual Eligible Pool</Typography>
              <Chip size='small' color='primary' variant='tonal' label={String(activeItems.length) + ' active'} />
            </Box>
            <Typography variant='body2' color='text.secondary' sx={{ mt: .75, maxWidth: 850, lineHeight: 1.65 }}>
              Add someone once here and they become eligible for every prize in this event. Switching prizes does not require re-entry. Winner exclusion still follows the selected prize type: Regular only excludes from that prize; Doorprize excludes from all remaining prizes.
            </Typography>
          </Box>
          <Chip label='Event-wide pool' variant='outlined' icon={<i className='tabler-users-plus' />} />
        </Box>

        {error && <Alert severity='error'>{error}</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.15fr .8fr 1.3fr auto' }, gap: 2, alignItems: 'start' }}>
          <TextField
            label='Participant name'
            value={fullName}
            onChange={event => setFullName(event.target.value)}
            disabled={disabled || saving}
            required
            inputProps={{ maxLength: 150 }}
          />
          <TextField
            label='Reference'
            value={reference}
            onChange={event => setReference(event.target.value)}
            disabled={disabled || saving}
            placeholder='Nopek / guest ID / table'
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            label='Notes'
            value={notes}
            onChange={event => setNotes(event.target.value)}
            disabled={disabled || saving}
            placeholder='Optional operator note'
            inputProps={{ maxLength: 500 }}
          />
          <Button
            variant='contained'
            disabled={disabled || saving || !fullName.trim()}
            onClick={() => void add()}
            startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-plus' />}
            sx={{ minHeight: 56, px: 3 }}
          >
            Add
          </Button>
        </Box>

        <Divider />

        {loading ? (
          <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : activeItems.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}>
            <i className='tabler-users-off text-4xl' />
            <Typography sx={{ mt: 1.5 }}>No manual participants yet.</Typography>
            <Typography variant='body2' sx={{ mt: .5 }}>
              Checked-in registered participants remain automatically eligible.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 1.25 }}>
            {activeItems.map(item => (
              <Box
                key={item.candidateId}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 2,
                  alignItems: 'center'
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography fontWeight={750}>{item.fullName}</Typography>
                    <Chip size='small' label='Manual' variant='tonal' color='info' />
                    {item.reference && <Chip size='small' label={item.reference} variant='outlined' />}
                  </Box>
                  {item.notes && (
                    <Typography variant='body2' color='text.secondary' sx={{ mt: .75 }}>
                      {item.notes}
                    </Typography>
                  )}
                </Box>

                <IconButton
                  color='error'
                  disabled={disabled || Boolean(removing)}
                  onClick={() => void remove(item.candidateId)}
                  aria-label={'Remove ' + item.fullName + ' from eligible pool'}
                >
                  {removing === item.candidateId ? <CircularProgress size={18} /> : <i className='tabler-trash' />}
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export default DoorprizeManualPool
