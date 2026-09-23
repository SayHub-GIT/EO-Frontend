'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import NextLink from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import AdminSessionGuard from '@/components/auth/AdminSessionGuard'
import { getAdminEvent, type AdminEvent } from '@/lib/admin-events'
import {
  getAdminEventExperience,
  type EventExperienceConfig,
  type EventWorkspaceItem
} from '@/lib/event-experience'
import {
  confirmDoorprizeWinner,
  declineDoorprizeWinner,
  drawDoorprize,
  getDoorprizeEligible,
  type DoorprizeDrawResult,
  type DoorprizeWinner
} from '@/lib/doorprize'

type PendingWinner = DoorprizeWinner & { drawId?: string }

const normalizeItems = (value: unknown): EventWorkspaceItem[] =>
  Array.isArray(value)
    ? value.filter((item): item is EventWorkspaceItem =>
        Boolean(item && typeof item === 'object' && typeof (item as EventWorkspaceItem).id === 'string'))
    : []

const prizeType = (prize: EventWorkspaceItem | undefined) =>
  String(prize?.prizeType ?? '').toLowerCase() === 'regular' ? 'regular' : 'doorprize'

const quantity = (prize: EventWorkspaceItem | undefined) => {
  const value = Number(prize?.quantity ?? 1)
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1
}

const normalizeWinner = (value: unknown): PendingWinner | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>

  if (typeof record.fullName !== 'string' || typeof record.drawnAtUtc !== 'string') return null

  const registrationId = typeof record.registrationId === 'string' ? record.registrationId : null
  const candidateId =
    typeof record.candidateId === 'string'
      ? record.candidateId
      : registrationId
        ? `registration:${registrationId.replaceAll('-', '')}`
        : null

  if (!candidateId) return null

  const reference =
    typeof record.reference === 'string'
      ? record.reference
      : typeof record.bookingCode === 'string'
        ? record.bookingCode
        : null

  return {
    candidateId,
    registrationId,
    source: record.source === 'manual' ? 'manual' : 'registration',
    fullName: record.fullName,
    reference,
    eventPackageName: typeof record.eventPackageName === 'string' ? record.eventPackageName : null,
    drawnAtUtc: record.drawnAtUtc,
    drawId: typeof record.drawId === 'string' ? record.drawId : undefined
  }
}

const winners = (prize: EventWorkspaceItem | undefined): DoorprizeWinner[] =>
  Array.isArray(prize?.winners)
    ? prize.winners
        .map(normalizeWinner)
        .filter((item): item is PendingWinner => Boolean(item))
    : []

const pendingWinner = (prize: EventWorkspaceItem | undefined): PendingWinner | null =>
  normalizeWinner(prize?.pendingWinner)

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))

const SpinContent = () => {
  const params = useParams<{ eventSlug: string }>()
  const eventId = params.eventSlug
  const spinStageRef = useRef<HTMLDivElement | null>(null)

  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [experience, setExperience] = useState<EventExperienceConfig | null>(null)
  const [selectedPrizeId, setSelectedPrizeId] = useState('')
  const [eligibleCount, setEligibleCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [savingDecision, setSavingDecision] = useState(false)
  const [activeDraw, setActiveDraw] = useState<DoorprizeDrawResult | null>(null)
  const [displayName, setDisplayName] = useState('READY')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const prizes = useMemo(
    () => normalizeItems(experience?.moduleData?.doorprize).filter(item => item.active !== false),
    [experience]
  )

  const selectedPrize = prizes.find(item => item.id === selectedPrizeId)
  const selectedWinners = winners(selectedPrize)
  const selectedPending = pendingWinner(selectedPrize)
  const isComplete = selectedWinners.length >= quantity(selectedPrize)

  const reload = async () => {
    const [loadedEvent, loadedExperience] = await Promise.all([
      getAdminEvent(eventId),
      getAdminEventExperience(eventId)
    ])

    setEvent(loadedEvent)
    setExperience(loadedExperience)

    const loadedPrizes = normalizeItems(loadedExperience.moduleData?.doorprize).filter(item => item.active !== false)
    setSelectedPrizeId(current =>
      current && loadedPrizes.some(item => item.id === current)
        ? current
        : loadedPrizes[0]?.id ?? ''
    )
  }

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const [loadedEvent, loadedExperience] = await Promise.all([
          getAdminEvent(eventId),
          getAdminEventExperience(eventId)
        ])

        if (!active) return
        setEvent(loadedEvent)
        setExperience(loadedExperience)

        const loadedPrizes = normalizeItems(loadedExperience.moduleData?.doorprize).filter(item => item.active !== false)
        setSelectedPrizeId(loadedPrizes[0]?.id ?? '')
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load prize draw.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [eventId])

  useEffect(() => {
    if (!selectedPrizeId) {
      setEligibleCount(null)
      return
    }

    let active = true

    const loadEligible = async () => {
      try {
        const result = await getDoorprizeEligible(eventId, selectedPrizeId)
        if (active) setEligibleCount(result.total)
      } catch (loadError) {
        if (active) {
          setEligibleCount(null)
          setError(loadError instanceof Error ? loadError.message : 'Unable to load eligible participants.')
        }
      }
    }

    void loadEligible()
    return () => { active = false }
  }, [eventId, selectedPrizeId, experience])

  useEffect(() => {
    if (selectedPending) {
      setDisplayName(selectedPending.fullName)
    } else if (!drawing) {
      setDisplayName(selectedPrize ? 'READY TO SPIN' : 'SELECT A PRIZE')
    }
  }, [selectedPrizeId, selectedPending?.candidateId, drawing])

  const startSpin = async () => {
    if (!selectedPrize || drawing || savingDecision || selectedPending || isComplete) return

    try {
      setDrawing(true)
      setError(null)
      setNotice(null)
      setActiveDraw(null)
      setDisplayName('DRAWING...')

      const result = await drawDoorprize(eventId, selectedPrize.id)
      setActiveDraw(result)

      const intervalMs = Math.max(55, Math.floor(result.durationMs / Math.max(result.reelItems.length, 1)))
      const startedAt = Date.now()
      let index = 0

      while (Date.now() - startedAt < result.durationMs && result.reelItems.length > 0) {
        setDisplayName(result.reelItems[index % result.reelItems.length] ?? result.winner.fullName)
        index += 1
        await wait(intervalMs)
      }

      setDisplayName(result.winner.fullName)
      await reload()
    } catch (drawError) {
      setError(drawError instanceof Error ? drawError.message : 'Unable to run prize draw.')
    } finally {
      setDrawing(false)
    }
  }

  const resolveWinner = async (confirm: boolean) => {
    const pending = pendingWinner(selectedPrize)
    const drawId = activeDraw?.drawId ?? pending?.drawId

    if (!selectedPrize || !pending || !drawId || savingDecision) return

    try {
      setSavingDecision(true)
      setError(null)

      if (confirm) {
        await confirmDoorprizeWinner(eventId, selectedPrize.id, drawId)
        setNotice(`${pending.fullName} confirmed as winner.`)
      } else {
        await declineDoorprizeWinner(eventId, selectedPrize.id, drawId)
        setNotice(`${pending.fullName} declined / did not claim. Spin can run again.`)
      }

      setActiveDraw(null)
      await reload()
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Unable to save winner decision.')
    } finally {
      setSavingDecision(false)
    }
  }

  const enterFullscreen = async () => {
    try {
      await spinStageRef.current?.requestFullscreen?.()
    } catch {
      // Fullscreen may be blocked by browser policy; the page still works normally.
    }
  }

  if (loading) {
    return <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: 'background.default',
        color: 'text.primary',
        p: { xs: 2, md: 4 },
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        gap: 3
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box>
          <Typography variant='overline' color='text.secondary'>Prize Draw Operator</Typography>
          <Typography variant='h4' fontWeight={900}>{event?.name ?? 'Event Doorprize'}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            component={NextLink}
            href={`/admin/events/${encodeURIComponent(eventId)}/modules/doorprize`}
            variant='outlined'
            startIcon={<i className='tabler-settings' />}
          >
            Prize Management
          </Button>
          <Button variant='outlined' onClick={() => void enterFullscreen()} startIcon={<i className='tabler-maximize' />}>
            Fullscreen
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '340px minmax(0, 1fr)' }, gap: 3 }}>
        <Card variant='outlined' sx={{ alignSelf: 'start' }}>
          <CardContent sx={{ display: 'grid', gap: 2.5 }}>
            <Box>
              <Typography variant='h6' fontWeight={800}>Operator Control</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: .5 }}>
                Choose a prize. Winner selection is performed by the backend and recorded in the audit trail.
              </Typography>
            </Box>

            <TextField
              select
              label='Prize'
              value={selectedPrizeId}
              onChange={e => {
                setSelectedPrizeId(e.target.value)
                setActiveDraw(null)
                setNotice(null)
                setError(null)
              }}
              disabled={drawing || savingDecision}
            >
              {prizes.map(prize => (
                <MenuItem key={prize.id} value={prize.id}>
                  {prize.title} ({prizeType(prize) === 'doorprize' ? 'Doorprize' : 'Regular'})
                </MenuItem>
              ))}
            </TextField>

            {selectedPrize && (
              <>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={prizeType(selectedPrize) === 'doorprize' ? 'Doorprize' : 'Regular'}
                    color={prizeType(selectedPrize) === 'doorprize' ? 'primary' : 'default'}
                    variant='tonal'
                  />
                  <Chip label={`${selectedWinners.length}/${quantity(selectedPrize)} winner`} variant='outlined' />
                  <Chip label={eligibleCount === null ? 'Eligible —' : `${eligibleCount} eligible`} color='success' variant='outlined' />
                </Box>

                <Alert severity={prizeType(selectedPrize) === 'doorprize' ? 'warning' : 'info'}>
                  {prizeType(selectedPrize) === 'doorprize'
                    ? 'A confirmed Doorprize winner is removed from eligibility for every remaining prize in this event.'
                    : 'A Regular winner is removed only from this prize and may still win another prize.'}
                </Alert>
              </>
            )}

            {error && <Alert severity='error'>{error}</Alert>}
            {notice && <Alert severity='success'>{notice}</Alert>}

            <Button
              size='large'
              variant='contained'
              disabled={!selectedPrize || drawing || savingDecision || Boolean(selectedPending) || isComplete || eligibleCount === 0}
              onClick={() => void startSpin()}
              startIcon={drawing ? <CircularProgress size={18} color='inherit' /> : <i className='tabler-player-play-filled' />}
            >
              {isComplete ? 'Prize Complete' : selectedPending ? 'Decision Required' : drawing ? 'Spinning...' : 'Start Spin'}
            </Button>
          </CardContent>
        </Card>

        <Card
          ref={spinStageRef}
          elevation={12}
          sx={{
            minHeight: { xs: 480, md: 620 },
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            position: 'relative',
            borderRadius: 5,
            background: theme =>
              `radial-gradient(circle at 50% 25%, ${theme.palette.primary.main}22, transparent 45%), ${theme.palette.background.paper}`,
            '&:fullscreen': {
              width: '100vw',
              height: '100vh',
              minHeight: '100vh',
              borderRadius: 0,
              border: 0,
              bgcolor: 'background.paper'
            }
          }}
        >
          <CardContent sx={{ width: '100%', textAlign: 'center', p: { xs: 3, md: 6 } }}>
            <Typography variant='overline' color='text.secondary' sx={{ letterSpacing: '.2em' }}>
              {selectedPrize?.title ?? 'PRIZE DRAW'}
            </Typography>

            <Box
              sx={{
                my: { xs: 5, md: 8 },
                minHeight: 180,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover',
                px: 3
              }}
            >
              <Typography
                sx={{
                  fontWeight: 1000,
                  fontSize: { xs: '2rem', sm: '3rem', md: '4.25rem' },
                  lineHeight: 1.05,
                  overflowWrap: 'anywhere'
                }}
              >
                {displayName}
              </Typography>
            </Box>

            {selectedPending && (
              <Box sx={{ maxWidth: 650, mx: 'auto', display: 'grid', gap: 2 }}>
                <Typography variant='h5' fontWeight={850}>Confirm winner claim</Typography>
                <Typography color='text.secondary'>
                  {selectedPending.source === 'manual' ? 'Manual pool' : selectedPending.reference ?? 'Registered participant'}
                  {selectedPending.reference ? ` • ${selectedPending.reference}` : ''}
                  {selectedPending.eventPackageName ? ` • ${selectedPending.eventPackageName}` : ''}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Button
                    size='large'
                    variant='outlined'
                    color='error'
                    disabled={savingDecision}
                    onClick={() => void resolveWinner(false)}
                    startIcon={<i className='tabler-user-x' />}
                  >
                    Decline / Tidak Claim
                  </Button>
                  <Button
                    size='large'
                    variant='contained'
                    color='success'
                    disabled={savingDecision}
                    onClick={() => void resolveWinner(true)}
                    startIcon={<i className='tabler-trophy' />}
                  >
                    Confirm Winner
                  </Button>
                </Box>
              </Box>
            )}

            {selectedPrize && selectedWinners.length > 0 && (
              <Box sx={{ mt: 5 }}>
                <Typography variant='body2' color='text.secondary'>Confirmed winners</Typography>
                <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {selectedWinners.map(item => (
                    <Chip key={item.candidateId} label={item.fullName} color='success' variant='tonal' />
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

const DoorprizeSpinPage = () => (
  <AdminSessionGuard>
    <SpinContent />
  </AdminSessionGuard>
)

export default DoorprizeSpinPage
