'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import ConfirmActionDialog from '@/components/feedback/ConfirmActionDialog'

import type { EventWorkspaceItem } from '@/lib/event-experience'
import { getAllRegistrations } from '../../registrations/services/registration.service'
import type { Registration } from '../../registrations/types'

type PrizeType = 'regular' | 'doorprize'
type DrawMode = 'random' | 'scripted'
type SelectionMode = DrawMode | 'manual'
type CandidateSource = 'registration' | 'manual'

type DoorprizeWinner = {
  registrationId: string
  fullName: string
  bookingCode: string
  eventPackageName: string | null
  drawnAtUtc: string
  source?: CandidateSource
  selectionMode?: SelectionMode
}

type DeclinedWinner = DoorprizeWinner & {
  declinedAtUtc: string
}

type ManualEntrant = {
  id: string
  fullName: string
  createdAtUtc: string
}

type DrawCandidate = {
  id: string
  fullName: string
  bookingCode: string
  eventPackageName: string | null
  source: CandidateSource
}

type Props = {
  eventId: string
  prizes: EventWorkspaceItem[]
  disabled?: boolean
  onUpdatePrize: (id: string, patch: Record<string, unknown>) => Promise<void>
}

const ITEM_HEIGHT = 84
const VISIBLE_ITEMS = 5
const CENTER_SLOT = Math.floor(VISIBLE_ITEMS / 2)
const REEL_DURATION_MS = 4300

const parseWinners = (value: unknown): DoorprizeWinner[] => {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is DoorprizeWinner => {
    if (!item || typeof item !== 'object') return false
    const record = item as Record<string, unknown>

    return typeof record.registrationId === 'string' && typeof record.fullName === 'string'
  })
}

const parseDeclinedWinners = (value: unknown): DeclinedWinner[] => {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is DeclinedWinner => {
    if (!item || typeof item !== 'object') return false
    const record = item as Record<string, unknown>

    return typeof record.registrationId === 'string' && typeof record.fullName === 'string'
  })
}

const parseManualEntrants = (value: unknown): ManualEntrant[] => {
  if (!Array.isArray(value)) return []

  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    const id = typeof record.id === 'string' ? record.id : ''
    const fullName = typeof record.fullName === 'string' ? record.fullName.trim() : ''

    if (!id || !fullName) return []

    return [{
      id,
      fullName,
      createdAtUtc: typeof record.createdAtUtc === 'string' ? record.createdAtUtc : ''
    }]
  })
}

const getQuantity = (prize: EventWorkspaceItem | undefined) => {
  const parsed = Number(prize?.quantity ?? 1)

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1
}

const getPrizeType = (prize: EventWorkspaceItem | undefined): PrizeType =>
  String(prize?.prizeType ?? '').toLowerCase() === 'regular' ? 'regular' : 'doorprize'

const createManualId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `manual-${crypto.randomUUID()}`

  return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const randomName = (pool: DrawCandidate[]) =>
  pool.length ? pool[Math.floor(Math.random() * pool.length)].fullName : '—'

const buildReel = (pool: DrawCandidate[], winner: DrawCandidate) => {
  const names: string[] = []
  let previous = ''

  for (let index = 0; index < 52; index += 1) {
    let next = randomName(pool)

    if (pool.length > 1) {
      let guard = 0

      while (next === previous && guard < 6) {
        next = randomName(pool)
        guard += 1
      }
    }

    names.push(next)
    previous = next
  }

  const winnerIndex = names.length

  names.push(winner.fullName, randomName(pool), randomName(pool))

  return { names, winnerIndex }
}

const wait = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds))

export default function DoorprizeDraw({ eventId, prizes, disabled = false, onUpdatePrize }: Props) {
  const presentationRef = useRef<HTMLDivElement | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [selectedPrizeId, setSelectedPrizeId] = useState('')
  const [loading, setLoading] = useState(true)
  const [rolling, setRolling] = useState(false)
  const [savingPrizeType, setSavingPrizeType] = useState(false)
  const [savingManualEntrant, setSavingManualEntrant] = useState(false)
  const [savingDecision, setSavingDecision] = useState(false)
  const [drawMode, setDrawMode] = useState<DrawMode>('random')
  const [manualName, setManualName] = useState('')
  const [scriptedWinnerId, setScriptedWinnerId] = useState('')
  const [reelItems, setReelItems] = useState<string[]>([])
  const [reelOffset, setReelOffset] = useState(0)
  const [revealedWinner, setRevealedWinner] = useState<DoorprizeWinner | null>(null)
  const [pendingWinner, setPendingWinner] = useState<DoorprizeWinner | null>(null)
  const [presentationOpen, setPresentationOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [manualRemoveTarget, setManualRemoveTarget] = useState<ManualEntrant | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getAllRegistrations(eventId)

        if (mounted) setRegistrations(result)
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load checked-in participants.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()

    return () => { mounted = false }
  }, [eventId])

  useEffect(() => {
    const onFullscreenChange = () => {
      if (document.fullscreenElement === presentationRef.current) setPresentationOpen(true)
      else if (!document.fullscreenElement) setPresentationOpen(false)
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!selectedPrizeId && prizes.length) setSelectedPrizeId(prizes[0].id)
    if (selectedPrizeId && !prizes.some(prize => prize.id === selectedPrizeId)) {
      setSelectedPrizeId(prizes[0]?.id ?? '')
    }
  }, [prizes, selectedPrizeId])

  useEffect(() => {
    setReelItems([])
    setReelOffset(0)
    setRevealedWinner(null)
    setPendingWinner(null)
    setScriptedWinnerId('')
    setNotice(null)
  }, [selectedPrizeId, drawMode])

  const eligibleRegistrations = useMemo(
    () => registrations.filter(item => Boolean(item.checkedInAt) || item.status === 'CHECKED_IN'),
    [registrations]
  )

  const selectedPrize = prizes.find(prize => prize.id === selectedPrizeId)
  const selectedPrizeType = getPrizeType(selectedPrize)
  const selectedWinners = parseWinners(selectedPrize?.winners)
  const selectedDeclined = parseDeclinedWinners(selectedPrize?.declinedWinners)
  const manualEntrants = parseManualEntrants(selectedPrize?.manualEntrants)

  const allWinnerIds = useMemo(
    () => new Set(prizes.flatMap(prize => parseWinners(prize.winners).map(winner => winner.registrationId))),
    [prizes]
  )

  const doorprizeWinnerIds = useMemo(
    () => new Set(
      prizes
        .filter(prize => getPrizeType(prize) === 'doorprize')
        .flatMap(prize => parseWinners(prize.winners).map(winner => winner.registrationId))
    ),
    [prizes]
  )

  const selectedWinnerIds = new Set(selectedWinners.map(winner => winner.registrationId))
  const selectedDeclinedIds = new Set(selectedDeclined.map(winner => winner.registrationId))

  const candidatePool = useMemo<DrawCandidate[]>(() => [
    ...eligibleRegistrations.map(item => ({
      id: item.id,
      fullName: item.fullName,
      bookingCode: item.bookingCode,
      eventPackageName: item.eventPackageName ?? null,
      source: 'registration' as const
    })),
    ...manualEntrants.map(item => ({
      id: item.id,
      fullName: item.fullName,
      bookingCode: 'MANUAL',
      eventPackageName: null,
      source: 'manual' as const
    }))
  ], [eligibleRegistrations, manualEntrants])

  const available = candidatePool.filter(item => {
    if (selectedWinnerIds.has(item.id) || selectedDeclinedIds.has(item.id)) return false
    if (selectedPrizeType === 'doorprize') return !doorprizeWinnerIds.has(item.id)

    return !allWinnerIds.has(item.id)
  })

  const quantity = getQuantity(selectedPrize)
  const complete = selectedWinners.length >= quantity
  const scriptedWinner = available.find(item => item.id === scriptedWinnerId)
  const busy = rolling || savingDecision

  const changePrizeType = async (nextType: PrizeType) => {
    if (!selectedPrize || disabled || busy || pendingWinner || savingPrizeType || nextType === selectedPrizeType) return

    try {
      setSavingPrizeType(true)
      setError(null)
      setNotice(null)
      await onUpdatePrize(selectedPrize.id, { prizeType: nextType })
      setReelItems([])
      setReelOffset(0)
      setRevealedWinner(null)
      setScriptedWinnerId('')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update prize type.')
    } finally {
      setSavingPrizeType(false)
    }
  }

  const addManualEntrant = async () => {
    const fullName = manualName.trim()

    if (!selectedPrize || !fullName || disabled || busy || pendingWinner || savingManualEntrant) return
    if (manualEntrants.some(item => item.fullName.toLowerCase() === fullName.toLowerCase())) {
      setError('That manual name is already in this prize pool.')

      return
    }

    const next: ManualEntrant = {
      id: createManualId(),
      fullName,
      createdAtUtc: new Date().toISOString()
    }

    try {
      setSavingManualEntrant(true)
      setError(null)
      setNotice(null)
      await onUpdatePrize(selectedPrize.id, { manualEntrants: [...manualEntrants, next] })
      setManualName('')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to add manual entrant.')
    } finally {
      setSavingManualEntrant(false)
    }
  }

  const removeManualEntrant = async (entrantId: string) => {
    if (!selectedPrize || disabled || busy || pendingWinner || savingManualEntrant) return
    if (allWinnerIds.has(entrantId)) {
      setError('This manual entrant already appears in winner history and cannot be removed.')

      return
    }

    try {
      setSavingManualEntrant(true)
      setError(null)
      setNotice(null)
      await onUpdatePrize(selectedPrize.id, {
        manualEntrants: manualEntrants.filter(item => item.id !== entrantId)
      })
      if (scriptedWinnerId === entrantId) setScriptedWinnerId('')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to remove manual entrant.')
    } finally {
      setSavingManualEntrant(false)
    }
  }

  const createWinnerRecord = (candidate: DrawCandidate, mode: DrawMode): DoorprizeWinner => ({
    registrationId: candidate.id,
    fullName: candidate.fullName,
    bookingCode: candidate.bookingCode,
    eventPackageName: candidate.eventPackageName,
    drawnAtUtc: new Date().toISOString(),
    source: candidate.source,
    selectionMode: mode
  })

  const runReel = async (winner: DrawCandidate, mode: DrawMode) => {
    if (!selectedPrize || complete || busy || pendingWinner) return

    const reel = buildReel(available, winner)

    setRolling(true)
    setError(null)
    setNotice(null)
    setRevealedWinner(null)
    setReelItems(reel.names)
    setReelOffset(0)

    await wait(90)
    setReelOffset(Math.max(0, reel.winnerIndex - CENTER_SLOT) * ITEM_HEIGHT)
    await wait(REEL_DURATION_MS + 150)

    const winnerRecord = createWinnerRecord(winner, mode)

    setRevealedWinner(winnerRecord)
    setPendingWinner(winnerRecord)
    setRolling(false)
  }

  const startDraw = async () => {
    if (!available.length || complete || busy || pendingWinner) return

    if (drawMode === 'scripted') {
      if (!scriptedWinner) {
        setError('Choose the scripted winner in the admin controls first.')

        return
      }

      await runReel(scriptedWinner, 'scripted')

      return
    }

    await runReel(available[Math.floor(Math.random() * available.length)], 'random')
  }

  const confirmPrizeClaim = async () => {
    if (!selectedPrize || !pendingWinner || savingDecision) return

    try {
      setSavingDecision(true)
      setError(null)
      await onUpdatePrize(selectedPrize.id, {
        winners: [...selectedWinners, pendingWinner]
      })
      setPendingWinner(null)
      setScriptedWinnerId('')
      setNotice(`${pendingWinner.fullName} confirmed the prize claim.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to confirm the prize claim.')
    } finally {
      setSavingDecision(false)
    }
  }

  const removePrizeWinner = async () => {
    if (!selectedPrize || !pendingWinner || savingDecision) return

    const declinedRecord: DeclinedWinner = {
      ...pendingWinner,
      declinedAtUtc: new Date().toISOString()
    }

    try {
      setSavingDecision(true)
      setError(null)
      await onUpdatePrize(selectedPrize.id, {
        declinedWinners: [...selectedDeclined, declinedRecord]
      })
      setPendingWinner(null)
      setRevealedWinner(null)
      setReelItems([])
      setReelOffset(0)
      setScriptedWinnerId('')
      setNotice(`${declinedRecord.fullName} was removed and did not receive this prize. You can spin again.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to remove this draw result.')
    } finally {
      setSavingDecision(false)
    }
  }

  const enterPresentation = async () => {
    if (!presentationRef.current) return

    setPresentationOpen(true)

    try {
      if (presentationRef.current.requestFullscreen) {
        await presentationRef.current.requestFullscreen()
      }
    } catch {
      // Keep the fixed viewport presentation as a fallback when native fullscreen is unavailable.
    }
  }

  const exitPresentation = async () => {
    if (pendingWinner) return

    try {
      if (document.fullscreenElement === presentationRef.current) await document.exitFullscreen()
    } catch {
      // The browser can already be in the process of leaving fullscreen.
    } finally {
      setPresentationOpen(false)
    }
  }

  const idleReel = [
    `${available.length} ELIGIBLE`,
    selectedPrizeType === 'doorprize' ? 'DOORPRIZE' : 'REGULAR PRIZE',
    selectedPrize ? 'READY TO DRAW' : 'SELECT A PRIZE',
    selectedPrize?.title ? String(selectedPrize.title).toUpperCase() : 'CHECKED-IN PARTICIPANTS',
    'GOOD LUCK'
  ]
  const visibleReel = reelItems.length ? reelItems : idleReel

  const confirmationPopup = (insidePresentation: boolean) => {
    if (!pendingWinner) return null

    return (
      <Box
        sx={{
          position: insidePresentation ? 'absolute' : 'fixed',
          inset: 0,
          zIndex: insidePresentation ? 30 : 1800,
          display: 'grid',
          placeItems: 'center',
          p: 2,
          bgcolor: 'rgba(3, 8, 18, .72)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <Card
          elevation={insidePresentation ? 18 : 8}
          sx={{
            width: 'min(560px, 100%)',
            borderRadius: 4,
            border: theme => `1px solid ${theme.palette.divider}`
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 }, display: 'grid', gap: 2.5 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  mb: 2,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'success.lighter',
                  color: 'success.main',
                  fontSize: 30
                }}
              >
                <i className='tabler-trophy' />
              </Box>
              <Typography variant='h5' fontWeight={900}>Konfirmasi Pemenang</Typography>
              <Typography color='text.secondary' sx={{ mt: 1 }}>
                Pastikan pemenang benar-benar akan mengambil hadiah sebelum hasil ini disimpan.
              </Typography>
            </Box>

            <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover', textAlign: 'center' }}>
              <Typography variant='overline' color='text.secondary'>Pemenang hasil spin</Typography>
              <Typography variant='h5' fontWeight={900} sx={{ mt: .25 }}>{pendingWinner.fullName}</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: .75 }}>
                {pendingWinner.source === 'manual' ? 'Manual entrant' : pendingWinner.bookingCode}
                {pendingWinner.eventPackageName ? ` • ${pendingWinner.eventPackageName}` : ''}
              </Typography>
              <Chip
                size='small'
                label={selectedPrizeType === 'doorprize' ? 'Doorprize' : 'Regular Prize'}
                color='primary'
                variant='tonal'
                sx={{ mt: 1.5 }}
              />
            </Box>

            <Alert severity='warning'>
              <strong>Remove / Tidak Claim</strong> berarti orang ini tidak mendapatkan hadiah, tidak masuk winner history, dan slot hadiah tetap kosong untuk spin ulang.
            </Alert>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <Button
                size='large'
                variant='outlined'
                color='error'
                disabled={savingDecision}
                onClick={() => void removePrizeWinner()}
                startIcon={<i className='tabler-user-x' />}
              >
                Remove / Tidak Claim
              </Button>
              <Button
                size='large'
                variant='contained'
                color='success'
                disabled={savingDecision}
                onClick={() => void confirmPrizeClaim()}
                startIcon={<i className={savingDecision ? 'tabler-loader-2 animate-spin' : 'tabler-gift'} />}
              >
                {savingDecision ? 'Saving…' : 'Claim Hadiah'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    )
  }

  const presentationStage = (
    <Box
      ref={presentationRef}
      sx={{
        position: presentationOpen ? 'fixed' : 'relative',
        inset: presentationOpen ? 0 : 'auto',
        zIndex: presentationOpen ? 1600 : 'auto',
        width: presentationOpen ? '100vw' : '100%',
        height: presentationOpen ? '100dvh' : 'auto',
        minHeight: presentationOpen ? '100vh' : undefined,
        bgcolor: presentationOpen ? '#07101f' : 'transparent',
        color: presentationOpen ? '#fff' : 'text.primary',
        p: presentationOpen ? { xs: 2, md: 5 } : 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: presentationOpen ? 'center' : 'flex-start',
        overflow: presentationOpen ? 'hidden' : 'visible'
      }}
    >
      {presentationOpen && (
        <IconButton
          onClick={() => void exitPresentation()}
          disabled={Boolean(pendingWinner)}
          sx={{
            position: 'absolute',
            top: 18,
            right: 18,
            zIndex: 10,
            color: '#fff',
            bgcolor: 'rgba(255,255,255,.08)'
          }}
          aria-label='Exit presentation'
        >
          <i className='tabler-x' />
        </IconButton>
      )}

      <Box sx={{ width: '100%', maxWidth: presentationOpen ? 1320 : 'none', mx: 'auto' }}>
        <Box sx={{ textAlign: 'center', mb: presentationOpen ? 3 : 2 }}>
          <Typography
            variant={presentationOpen ? 'h3' : 'h5'}
            fontWeight={900}
            sx={{ color: presentationOpen ? '#fff' : 'text.primary', letterSpacing: '-.02em' }}
          >
            {String(selectedPrize?.title || 'Prize Draw')}
          </Typography>
          <Typography sx={{ mt: 1, color: presentationOpen ? 'rgba(255,255,255,.62)' : 'text.secondary' }}>
            {pendingWinner
              ? 'Waiting for winner confirmation…'
              : complete
                ? 'Prize complete'
                : rolling
                  ? 'Drawing winner…'
                  : `${available.length} eligible participant${available.length === 1 ? '' : 's'}`}
          </Typography>
        </Box>

        <Box
          sx={{
            position: 'relative',
            height: ITEM_HEIGHT * VISIBLE_ITEMS,
            overflow: 'hidden',
            borderRadius: presentationOpen ? 5 : 4,
            border: presentationOpen ? '1px solid rgba(255,255,255,.14)' : theme => `1px solid ${theme.palette.divider}`,
            bgcolor: presentationOpen ? '#0d1b2a' : 'background.paper',
            boxShadow: presentationOpen ? '0 26px 90px rgba(0,0,0,.38)' : undefined
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 4,
              background: presentationOpen
                ? 'linear-gradient(to bottom, #0d1b2a 0%, transparent 24%, transparent 76%, #0d1b2a 100%)'
                : theme => `linear-gradient(to bottom, ${theme.palette.background.paper} 0%, transparent 24%, transparent 76%, ${theme.palette.background.paper} 100%)`
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              left: presentationOpen ? 28 : 14,
              right: presentationOpen ? 28 : 14,
              top: CENTER_SLOT * ITEM_HEIGHT,
              height: ITEM_HEIGHT,
              borderRadius: 3,
              border: revealedWinner
                ? '1px solid #4ade80'
                : presentationOpen
                  ? '1px solid #60a5fa'
                  : theme => `1px solid ${theme.palette.primary.main}`,
              background: revealedWinner
                ? 'rgba(74,222,128,.08)'
                : presentationOpen
                  ? 'rgba(96,165,250,.08)'
                  : 'transparent',
              zIndex: 3,
              pointerEvents: 'none',
              boxShadow: revealedWinner ? '0 0 36px rgba(74,222,128,.18)' : undefined
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              transform: `translateY(-${reelOffset}px)`,
              transition: rolling && reelOffset > 0
                ? `transform ${REEL_DURATION_MS}ms cubic-bezier(0.08, 0.78, 0.12, 1)`
                : 'none',
              willChange: rolling ? 'transform' : 'auto'
            }}
          >
            {visibleReel.map((name, index) => (
              <Box
                key={`${name}-${index}`}
                sx={{
                  height: ITEM_HEIGHT,
                  display: 'grid',
                  placeItems: 'center',
                  px: 4,
                  borderBottom: presentationOpen
                    ? '1px solid rgba(255,255,255,.07)'
                    : theme => `1px solid ${theme.palette.divider}`
                }}
              >
                <Typography
                  fontWeight={900}
                  noWrap
                  sx={{
                    width: '100%',
                    textAlign: 'center',
                    textOverflow: 'ellipsis',
                    fontSize: presentationOpen ? { xs: 24, md: 34 } : 20,
                    color: presentationOpen ? '#fff' : 'text.primary'
                  }}
                >
                  {name}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box
            sx={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 5,
              color: revealedWinner ? '#4ade80' : '#60a5fa'
            }}
          >
            <i className='tabler-caret-right-filled text-2xl' />
          </Box>
          <Box
            sx={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%) rotate(180deg)',
              zIndex: 5,
              color: revealedWinner ? '#4ade80' : '#60a5fa'
            }}
          >
            <i className='tabler-caret-right-filled text-2xl' />
          </Box>
        </Box>

        {revealedWinner && (
          <Box
            sx={{
              mt: 2.5,
              py: presentationOpen ? 2.5 : 2,
              px: 3,
              borderRadius: 3,
              textAlign: 'center',
              border: presentationOpen
                ? '1px solid rgba(74,222,128,.45)'
                : theme => `1px solid ${theme.palette.success.main}`,
              bgcolor: presentationOpen ? 'rgba(74,222,128,.08)' : 'success.lighter'
            }}
          >
            <Typography
              variant='overline'
              fontWeight={900}
              sx={{ color: presentationOpen ? '#86efac' : 'success.main', letterSpacing: '.22em' }}
            >
              {pendingWinner ? 'WINNER — PENDING CONFIRMATION' : 'WINNER'}
            </Typography>
            <Typography
              variant={presentationOpen ? 'h3' : 'h5'}
              fontWeight={900}
              sx={{ mt: .5, color: presentationOpen ? '#fff' : 'text.primary' }}
            >
              {revealedWinner.fullName}
            </Typography>
          </Box>
        )}

        {presentationOpen && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              size='large'
              variant='contained'
              onClick={() => void startDraw()}
              disabled={busy || Boolean(pendingWinner) || complete || available.length === 0 || (drawMode === 'scripted' && !scriptedWinner)}
              startIcon={<i className={rolling ? 'tabler-loader-2 animate-spin' : 'tabler-confetti'} />}
              sx={{ minWidth: 240, py: 1.4, fontWeight: 900 }}
            >
              {rolling ? 'Drawing…' : pendingWinner ? 'Confirm winner first' : complete ? 'Prize complete' : 'Start Draw'}
            </Button>
          </Box>
        )}
      </Box>

      {presentationOpen && confirmationPopup(true)}
    </Box>
  )

  return (
    <>
      <Card variant='outlined'>
        <CardContent sx={{ p: { xs: 3, md: 4 }, display: 'grid', gap: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant='h5' fontWeight={800}>Live Prize Draw</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: .75, maxWidth: 820 }}>
                Every spin result must be confirmed before it counts as a winner. Random Draw picks from the eligible pool; Scripted Draw keeps the same reel presentation while the selection mode remains recorded in admin history.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`${eligibleRegistrations.length} checked in`} color='success' variant='tonal' />
              <Chip label={`${manualEntrants.length} manual`} color='info' variant='tonal' />
              <Chip label={`${available.length} available`} variant='outlined' />
            </Box>
          </Box>

          <Alert severity='info'>
            <strong>After every spin:</strong> choose <strong>Claim Hadiah</strong> to finalize the winner, or <strong>Remove / Tidak Claim</strong> to keep the prize slot open and spin again.
          </Alert>
          <Alert severity='info'>
            <strong>Regular Prize:</strong> a confirmed winner may still win a Doorprize. <strong>Doorprize:</strong> after a confirmed claim, that person is blocked from later prizes.
          </Alert>
          {notice && <Alert severity='success'>{notice}</Alert>}
          {error && <Alert severity='error'>{error}</Alert>}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
          ) : prizes.length === 0 ? (
            <Alert severity='info'>Create at least one prize item before starting the draw.</Alert>
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1.3fr) minmax(220px,.7fr)' }, gap: 2, maxWidth: 860 }}>
                <TextField
                  select
                  label='Prize to draw'
                  value={selectedPrizeId}
                  onChange={event => setSelectedPrizeId(event.target.value)}
                  disabled={disabled || busy || Boolean(pendingWinner) || savingPrizeType || savingManualEntrant}
                >
                  {prizes.map(prize => (
                    <MenuItem key={prize.id} value={prize.id}>
                      {prize.title} · {getPrizeType(prize) === 'doorprize' ? 'Doorprize' : 'Regular'} ({parseWinners(prize.winners).length}/{getQuantity(prize)})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label='Prize type'
                  value={selectedPrizeType}
                  onChange={event => void changePrizeType(event.target.value as PrizeType)}
                  disabled={disabled || busy || Boolean(pendingWinner) || savingPrizeType || !selectedPrize}
                >
                  <MenuItem value='regular'>Regular Prize</MenuItem>
                  <MenuItem value='doorprize'>Doorprize</MenuItem>
                </TextField>
              </Box>

              <Card variant='outlined'>
                <CardContent sx={{ display: 'grid', gap: 2 }}>
                  <Box>
                    <Typography variant='subtitle1' fontWeight={800}>Manual entrants</Typography>
                    <Typography variant='body2' color='text.secondary'>Add names outside registration data to this prize pool.</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <TextField
                      size='small'
                      label='Add name manually'
                      value={manualName}
                      onChange={event => setManualName(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void addManualEntrant()
                        }
                      }}
                      disabled={disabled || busy || Boolean(pendingWinner) || savingManualEntrant || !selectedPrize}
                      sx={{ minWidth: 280, flex: '1 1 320px' }}
                    />
                    <Button
                      variant='outlined'
                      onClick={() => void addManualEntrant()}
                      disabled={disabled || busy || Boolean(pendingWinner) || savingManualEntrant || !manualName.trim()}
                      startIcon={<i className='tabler-user-plus' />}
                    >
                      Add name
                    </Button>
                  </Box>
                  {!!manualEntrants.length && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {manualEntrants.map(entrant => (
                        <Chip
                          key={entrant.id}
                          label={entrant.fullName}
                          color='info'
                          variant='tonal'
                          onDelete={disabled || busy || pendingWinner || savingManualEntrant ? undefined : () => setManualRemoveTarget(entrant)}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px minmax(0,1fr)' }, gap: 2 }}>
                <TextField
                  select
                  label='Draw mode'
                  value={drawMode}
                  onChange={event => setDrawMode(event.target.value as DrawMode)}
                  disabled={disabled || busy || Boolean(pendingWinner)}
                  helperText={drawMode === 'random' ? 'Randomly selected from the eligible pool.' : 'Admin preselects the winner; admin history records this mode.'}
                >
                  <MenuItem value='random'>Random Draw</MenuItem>
                  <MenuItem value='scripted'>Scripted Draw</MenuItem>
                </TextField>

                {drawMode === 'scripted' && (
                  <TextField
                    select
                    label='Predetermined winner'
                    value={scriptedWinnerId}
                    onChange={event => setScriptedWinnerId(event.target.value)}
                    disabled={disabled || busy || Boolean(pendingWinner) || complete || available.length === 0}
                    helperText='This control is never shown in Presentation Fullscreen.'
                  >
                    <MenuItem value=''><em>Select eligible person</em></MenuItem>
                    {available.map(candidate => (
                      <MenuItem key={candidate.id} value={candidate.id}>
                        {candidate.fullName} · {candidate.source === 'manual' ? 'Manual entrant' : candidate.bookingCode}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </Box>

              {presentationStage}

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  size='large'
                  variant='contained'
                  onClick={() => void startDraw()}
                  disabled={disabled || busy || Boolean(pendingWinner) || !selectedPrize || complete || available.length === 0 || (drawMode === 'scripted' && !scriptedWinner)}
                  startIcon={<i className={rolling ? 'tabler-loader-2 animate-spin' : 'tabler-confetti'} />}
                >
                  {rolling
                    ? 'Drawing winner…'
                    : pendingWinner
                      ? 'Confirm winner first'
                      : complete
                        ? 'Prize complete'
                        : drawMode === 'scripted'
                          ? 'Run scripted draw'
                          : 'Start random draw'}
                </Button>
                <Button
                  size='large'
                  variant='outlined'
                  onClick={() => void enterPresentation()}
                  disabled={!selectedPrize || Boolean(pendingWinner)}
                  startIcon={<i className='tabler-maximize' />}
                >
                  Presentation Fullscreen
                </Button>
              </Box>

              {selectedPrize && available.length === 0 && !complete && !pendingWinner && (
                <Alert severity='warning'>No eligible person is currently available under this prize type&apos;s winner rules.</Alert>
              )}

              {selectedPrize && selectedWinners.length > 0 && (
                <Box>
                  <Typography variant='subtitle1' fontWeight={800}>Winner history — {selectedPrize.title}</Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: .5 }}>
                    Only confirmed prize claims appear here.
                  </Typography>
                  <Box sx={{ mt: 1.5, display: 'grid', gap: 1 }}>
                    {selectedWinners.map((winner, index) => {
                      const scripted = winner.selectionMode === 'scripted' || winner.selectionMode === 'manual'

                      return (
                        <Box
                          key={`${winner.registrationId}-${index}`}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            border: theme => `1px solid ${theme.palette.divider}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 2,
                            flexWrap: 'wrap',
                            alignItems: 'center'
                          }}
                        >
                          <Box>
                            <Typography fontWeight={700}>{index + 1}. {winner.fullName}</Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {winner.source === 'manual' ? 'Manual entrant' : winner.bookingCode}
                              {winner.eventPackageName ? ` • ${winner.eventPackageName}` : ''}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Chip size='small' label='Claimed' color='success' variant='tonal' />
                            <Chip size='small' label={scripted ? 'Scripted draw' : 'Random draw'} color={scripted ? 'warning' : 'info'} variant='tonal' />
                            <Tooltip title={selectedPrizeType === 'doorprize' ? 'Confirmed Doorprize winner: blocked from later prizes' : 'Confirmed Regular Prize winner'}>
                              <span>
                                <IconButton size='small' disabled>
                                  <i className={selectedPrizeType === 'doorprize' ? 'tabler-lock' : 'tabler-gift'} />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </Box>
                      )
                    })}
                  </Box>
                </Box>
              )}

              {selectedPrize && selectedDeclined.length > 0 && (
                <Box>
                  <Typography variant='subtitle1' fontWeight={800}>Removed / not claimed</Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: .5 }}>
                    These draw results did not receive this prize and are skipped if this same prize is spun again.
                  </Typography>
                  <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedDeclined.map((winner, index) => (
                      <Chip
                        key={`${winner.registrationId}-${index}`}
                        label={`${winner.fullName} · Not claimed`}
                        color='default'
                        variant='outlined'
                        icon={<i className='tabler-user-x' />}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmActionDialog
        open={Boolean(manualRemoveTarget)}
        title='Remove manual entrant?'
        description='This manually added name will be removed from the selected prize pool.'
        confirmLabel='Confirm Remove'
        loading={savingManualEntrant}
        onClose={() => {
          if (!savingManualEntrant) setManualRemoveTarget(null)
        }}
        onConfirm={async () => {
          if (!manualRemoveTarget || savingManualEntrant) return
          await removeManualEntrant(manualRemoveTarget.id)
          setManualRemoveTarget(null)
        }}
        details={manualRemoveTarget ? [
          { label: 'Entrant', value: manualRemoveTarget.fullName },
          { label: 'Prize', value: String(selectedPrize?.title || 'Selected prize') }
        ] : []}
        warning='Entrants already present in winner history cannot be removed.'
      />

      {!presentationOpen && confirmationPopup(false)}
    </>
  )
}
