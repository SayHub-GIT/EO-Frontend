'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import LegalPolicyContent from '@/components/legal/LegalPolicyContent'
import LegalRichEditor from '@/components/legal/LegalRichEditor'
import { useUnsavedChanges } from '@/components/navigation/UnsavedChangesProvider'
import {
  canonicalizeLegalContent,
  getLegalTextContent,
  normalizeLegalContentForEditor
} from '@/lib/legal-content'
import {
  getGlobalLegalPolicies,
  publishGlobalLegalPolicy,
  type LegalPolicyBundle
} from '@/lib/legal-policies'

const MAX_POLICY_LENGTH = 50_000
const MIN_POLICY_TEXT_LENGTH = 10

export default function LegalSettingsPage() {
  const [bundle, setBundle] = useState<LegalPolicyBundle | null>(null)
  const [terms, setTerms] = useState('<p><br></p>')
  const [privacy, setPrivacy] = useState('<p><br></p>')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<'Terms' | 'Privacy' | null>(null)
  const [error, setError] = useState('')

  const currentTerms = bundle?.terms?.content ?? ''
  const currentPrivacy = bundle?.privacy?.content ?? ''
  const termsDirty = canonicalizeLegalContent(terms) !== canonicalizeLegalContent(currentTerms)
  const privacyDirty = canonicalizeLegalContent(privacy) !== canonicalizeLegalContent(currentPrivacy)

  useUnsavedChanges(termsDirty || privacyDirty)

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getGlobalLegalPolicies()

      setBundle(data)
      setTerms(normalizeLegalContentForEditor(data.terms?.content ?? ''))
      setPrivacy(normalizeLegalContentForEditor(data.privacy?.content ?? ''))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load legal policies.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const publish = async (kind: 'Terms' | 'Privacy') => {
    const source = kind === 'Terms' ? terms : privacy
    const content = canonicalizeLegalContent(source)
    const textContent = getLegalTextContent(content)

    if (textContent.length < MIN_POLICY_TEXT_LENGTH) {
      setError(kind + ' must contain at least 10 visible characters.')
      return
    }

    if (content.length > MAX_POLICY_LENGTH) {
      setError(kind + ' exceeds the 50,000 character storage limit after formatting.')
      return
    }

    try {
      setSaving(kind)
      setError('')
      const published = await publishGlobalLegalPolicy(kind, content)

      setBundle(current => {
        const existing = current ?? { terms: null, privacy: null }

        return kind === 'Terms'
          ? { ...existing, terms: published }
          : { ...existing, privacy: published }
      })

      if (kind === 'Terms') setTerms(normalizeLegalContentForEditor(published.content))
      else setPrivacy(normalizeLegalContentForEditor(published.content))

      pushAppAlert({
        severity: 'success',
        message: kind + ' published as a new version.'
      })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to publish policy.'

      setError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setSaving(null)
    }
  }

  if (loading && !bundle) {
    return (
      <Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Chip label='Legal Settings' color='primary' size='small' sx={{ mb: 1.5 }} />
        <Typography variant='h4' fontWeight={850}>Terms & Privacy</Typography>
        <Typography color='text.secondary' sx={{ mt: 0.75, maxWidth: 860 }}>
          Edit global Terms & Conditions and Privacy Policy with rich formatting. Publishing creates a new immutable version so registrations keep the exact policy version they accepted.
        </Typography>
      </Box>

      {error && <Alert severity='error'>{error}</Alert>}

      <Alert severity='info'>
        Event-specific legal policies can still override these global defaults. Existing registration acceptance records are not rewritten when a new version is published.
      </Alert>

      {([
        ['Terms', 'Terms & Conditions', terms, setTerms, bundle?.terms],
        ['Privacy', 'Privacy Policy', privacy, setPrivacy, bundle?.privacy]
      ] as const).map(([kind, title, value, setter, current]) => {
        const sanitized = canonicalizeLegalContent(value)
        const visibleCharacters = getLegalTextContent(sanitized).length
        const storageCharacters = sanitized.length
        const currentCanonical = canonicalizeLegalContent(current?.content ?? '')
        const isDirty = sanitized !== currentCanonical
        const valid =
          visibleCharacters >= MIN_POLICY_TEXT_LENGTH &&
          storageCharacters <= MAX_POLICY_LENGTH

        return (
          <Card key={kind} variant='outlined'>
            <CardContent sx={{ display: 'grid', gap: 2.5, p: { xs: 2, md: 3 } }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 2,
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}
              >
                <Box>
                  <Typography variant='h6' fontWeight={850}>{title}</Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                    {current
                      ? 'Current version ' + String(current.version) + ' • published ' + new Date(current.publishedAtUtc).toLocaleString('id-ID')
                      : 'No global version published yet.'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  {isDirty && <Chip label='Unpublished changes' color='warning' size='small' variant='tonal' />}
                  {current && <Chip label={'Version ' + String(current.version)} variant='outlined' />}
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.15fr) minmax(360px, .85fr)' },
                  gap: 2.5,
                  alignItems: 'start'
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='subtitle2' fontWeight={800} sx={{ mb: 1 }}>
                    Editor
                  </Typography>
                  <LegalRichEditor
                    value={value}
                    onChange={setter}
                    ariaLabel={title + ' editor'}
                    disabled={Boolean(saving)}
                  />
                  <Box
                    sx={{
                      mt: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 1,
                      flexWrap: 'wrap'
                    }}
                  >
                    <Typography
                      variant='caption'
                      color={visibleCharacters < MIN_POLICY_TEXT_LENGTH ? 'error.main' : 'text.secondary'}
                    >
                      {visibleCharacters.toLocaleString()} visible characters
                    </Typography>
                    <Typography
                      variant='caption'
                      color={storageCharacters > MAX_POLICY_LENGTH ? 'error.main' : 'text.secondary'}
                    >
                      {storageCharacters.toLocaleString()} / {MAX_POLICY_LENGTH.toLocaleString()} stored characters
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='subtitle2' fontWeight={800} sx={{ mb: 1 }}>
                    Safe Preview
                  </Typography>
                  <Box
                    sx={{
                      minHeight: 380,
                      maxHeight: 680,
                      overflowY: 'auto',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: { xs: 2, sm: 2.5 },
                      bgcolor: 'background.default'
                    }}
                  >
                    {visibleCharacters > 0 ? (
                      <LegalPolicyContent html={value} />
                    ) : (
                      <Typography color='text.secondary'>
                        Start writing to preview the published document.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant='body2' color='text.secondary'>
                  Publishing sanitizes the document and preserves the resulting HTML as an immutable policy version.
                </Typography>
                <Button
                  variant='contained'
                  disabled={Boolean(saving) || !valid || !isDirty}
                  onClick={() => void publish(kind)}
                  startIcon={
                    saving === kind
                      ? <CircularProgress size={16} color='inherit' />
                      : <i className='tabler-file-check' />
                  }
                >
                  Publish New Version
                </Button>
              </Box>
            </CardContent>
          </Card>
        )
      })}
    </Box>
  )
}
