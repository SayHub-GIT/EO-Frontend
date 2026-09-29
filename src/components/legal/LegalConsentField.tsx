'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Link from '@mui/material/Link'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'

import LegalPolicyDocument from '@/components/legal/LegalPolicyDocument'
import type { LegalPolicy, LegalPolicyBundle } from '@/lib/legal-policies'

type LegalKind = 'Terms' | 'Privacy'

type Props = {
  policies: LegalPolicyBundle | null
  loading?: boolean
  error?: string
  accepted: boolean
  disabled?: boolean
  onAcceptedChange: (accepted: boolean) => void
  onRetry?: () => void
  eventId?: string | null
  required?: boolean
}

const policyForKind = (policies: LegalPolicyBundle | null, kind: LegalKind) =>
  kind === 'Terms' ? policies?.terms ?? null : policies?.privacy ?? null

const LegalConsentField = ({
  policies,
  loading = false,
  error = '',
  accepted,
  disabled = false,
  onAcceptedChange,
  onRetry,
  eventId,
  required = true
}: Props) => {
  const [activeKind, setActiveKind] = useState<LegalKind | null>(null)
  const [reviewed, setReviewed] = useState({ terms: false, privacy: false })
  const [progress, setProgress] = useState({ terms: 0, privacy: 0 })
  const scrollRef = useRef<HTMLDivElement>(null)

  const termsId = policies?.terms?.id ?? ''
  const privacyId = policies?.privacy?.id ?? ''

  useEffect(() => {
    setReviewed({ terms: false, privacy: false })
    setProgress({ terms: 0, privacy: 0 })
    onAcceptedChange(false)
  }, [termsId, privacyId])

  const activePolicy = useMemo(
    () => activeKind ? policyForKind(policies, activeKind) : null,
    [activeKind, policies]
  )

  const reviewedAll = reviewed.terms && reviewed.privacy

  const setKindReviewed = (kind: LegalKind, value = true) => {
    const key = kind === 'Terms' ? 'terms' : 'privacy'

    setReviewed(current => ({ ...current, [key]: value }))
    if (value) setProgress(current => ({ ...current, [key]: 100 }))
  }

  const setKindProgress = (kind: LegalKind, value: number) => {
    const key = kind === 'Terms' ? 'terms' : 'privacy'

    setProgress(current => ({ ...current, [key]: value }))
  }

  const activeProgress =
    activeKind === 'Terms'
      ? progress.terms
      : activeKind === 'Privacy'
        ? progress.privacy
        : 0

  const activeReviewed =
    activeKind === 'Terms'
      ? reviewed.terms
      : activeKind === 'Privacy'
        ? reviewed.privacy
        : false

  const checkShortDocument = () => {
    if (!activeKind || !activePolicy || activePolicy.documentType === 'Pdf') return

    window.requestAnimationFrame(() => {
      const element = scrollRef.current

      if (!element) return

      if (element.scrollHeight <= element.clientHeight + 8) {
        setKindProgress(activeKind, 100)
        setKindReviewed(activeKind)
      }
    })
  }

  useEffect(() => {
    if (!activeKind) return
    checkShortDocument()
  }, [activeKind, activePolicy?.id])

  const handleScroll = () => {
    if (!activeKind || !activePolicy || activePolicy.documentType === 'Pdf') return

    const element = scrollRef.current
    if (!element) return

    const scrollable = Math.max(1, element.scrollHeight - element.clientHeight)
    const value = Math.min(100, Math.round((element.scrollTop / scrollable) * 100))

    setKindProgress(activeKind, value)

    if (element.scrollHeight - element.scrollTop - element.clientHeight <= 8) {
      setKindReviewed(activeKind)
    }
  }

  const openPolicy = (kind: LegalKind) => {
    setActiveKind(kind)
  }

  const closeDialog = () => {
    setActiveKind(null)
  }

  const publicHref = (kind: LegalKind) => {
    const base = '/legal/' + kind.toLowerCase()

    return eventId
      ? base + '?eventId=' + encodeURIComponent(eventId)
      : base
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', py: 1 }}>
        <CircularProgress size={18} />
        <Typography variant='body2' color='text.secondary'>Loading Terms and Privacy Policy...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert
        severity='warning'
        action={onRetry ? (
          <Button color='inherit' size='small' onClick={onRetry}>Retry</Button>
        ) : undefined}
      >
        {error}
      </Alert>
    )
  }

  if (!policies?.terms || !policies.privacy) {
    return (
      <Alert severity='warning'>
        Terms and Privacy Policy are not fully configured. This action is temporarily unavailable.
      </Alert>
    )
  }

  return (
    <>
      <Box sx={{ display: 'grid', gap: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
          <Checkbox
            checked={accepted}
            disabled={disabled || !reviewedAll}
            onChange={event => onAcceptedChange(event.target.checked)}
            inputProps={{ 'aria-label': 'Agree to Terms of Service and Privacy Policy' }}
            sx={{ mt: -0.7, ml: -1.1 }}
          />
          <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.7 }}>
            I agree to the current{' '}
            <Link
              component='button'
              type='button'
              underline='always'
              onClick={() => openPolicy('Terms')}
              sx={{ fontWeight: 800, verticalAlign: 'baseline' }}
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              component='button'
              type='button'
              underline='always'
              onClick={() => openPolicy('Privacy')}
              sx={{ fontWeight: 800, verticalAlign: 'baseline' }}
            >
              Privacy Policy
            </Link>
            {required ? ' *' : ''}
          </Typography>
        </Box>

        <Typography
          variant='caption'
          color={reviewedAll ? 'text.secondary' : 'warning.main'}
          sx={{ pl: 4.25 }}
        >
          {reviewedAll
            ? 'Both documents have been reviewed. You can now accept them.'
            : 'Open both links and review each document before the checkbox is enabled.'}
        </Typography>
      </Box>

      <Dialog
        open={Boolean(activeKind && activePolicy)}
        onClose={closeDialog}
        fullWidth
        maxWidth='lg'
        scroll='paper'
      >
        {activePolicy && activeKind && (
          <>
            <DialogTitle sx={{ pr: 7 }}>
              {activeKind === 'Terms' ? 'Terms of Service' : 'Privacy Policy'}
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                Version {activePolicy.version} · Published {new Date(activePolicy.publishedAtUtc).toLocaleDateString()}
              </Typography>
            </DialogTitle>

            <DialogContent
              ref={scrollRef}
              dividers
              onScroll={handleScroll}
              sx={{ maxHeight: '72vh' }}
            >
              <LegalPolicyDocument policy={activePolicy} minHeight='58vh' />
            </DialogContent>

            {activePolicy.documentType !== 'Pdf' && (
              <Box sx={{ px: 3, pt: 1.5 }}>
                <LinearProgress
                  variant='determinate'
                  value={activeProgress}
                  aria-label={activeKind + ' reading progress'}
                />
              </Box>
            )}

            <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
              <Typography variant='caption' color='text.secondary' sx={{ mr: 'auto' }}>
                {activePolicy.documentType === 'Pdf'
                  ? activeReviewed
                    ? 'PDF marked as reviewed'
                    : 'Review the PDF, then confirm below'
                  : activeReviewed
                    ? 'Read complete'
                    : activeProgress + '% read'}
              </Typography>

              <Button
                component='a'
                href={publicHref(activeKind)}
                target='_blank'
                rel='noopener noreferrer'
                startIcon={<i className='tabler-external-link' />}
              >
                Open in new tab
              </Button>

              {activePolicy.documentType === 'Pdf' && !activeReviewed && (
                <Button
                  variant='contained'
                  onClick={() => setKindReviewed(activeKind)}
                >
                  I Have Reviewed This PDF
                </Button>
              )}

              <Button onClick={closeDialog}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  )
}

export default LegalConsentField
