'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import LegalPolicyDocument from '@/components/legal/LegalPolicyDocument'
import LegalRichEditor from '@/components/legal/LegalRichEditor'
import { useUnsavedChanges } from '@/components/navigation/UnsavedChangesProvider'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'
import {
  canonicalizeLegalContent,
  getLegalTextContent,
  normalizeLegalContentForEditor
} from '@/lib/legal-content'
import {
  getGlobalLegalPolicies,
  publishGlobalLegalPolicy,
  uploadGlobalLegalPolicyPdf,
  type LegalDocumentType,
  type LegalPolicy,
  type LegalPolicyBundle
} from '@/lib/legal-policies'

const MAX_POLICY_LENGTH = 50_000
const MIN_POLICY_TEXT_LENGTH = 10
const MAX_PDF_BYTES = 10 * 1024 * 1024

type LegalKind = 'Terms' | 'Privacy'

type LegalDraft = {
  documentType: LegalDocumentType
  content: string
  pdfUrl: string
}

const emptyDraft = (): LegalDraft => ({
  documentType: 'RichText',
  content: '<p><br></p>',
  pdfUrl: ''
})

const draftFromPolicy = (policy: LegalPolicy | null | undefined): LegalDraft => ({
  documentType: policy?.documentType === 'Pdf' ? 'Pdf' : 'RichText',
  content: normalizeLegalContentForEditor(policy?.content ?? ''),
  pdfUrl: policy?.pdfUrl ?? ''
})

const isDraftDirty = (draft: LegalDraft, current: LegalPolicy | null | undefined) => {
  if (!current) {
    if (draft.documentType === 'Pdf') return Boolean(draft.pdfUrl)
    return getLegalTextContent(draft.content).length > 0
  }

  if (draft.documentType !== current.documentType) return true

  if (draft.documentType === 'Pdf') {
    return draft.pdfUrl !== (current.pdfUrl ?? '')
  }

  return canonicalizeLegalContent(draft.content) !== canonicalizeLegalContent(current.content)
}

export default function LegalSettingsPage() {
  const [bundle, setBundle] = useState<LegalPolicyBundle | null>(null)
  const [terms, setTerms] = useState<LegalDraft>(emptyDraft)
  const [privacy, setPrivacy] = useState<LegalDraft>(emptyDraft)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<LegalKind | null>(null)
  const [uploading, setUploading] = useState<LegalKind | null>(null)
  const [error, setError] = useState('')
  const manageAccess = usePermissionAccess('legal.manage')

  const termsDirty = isDraftDirty(terms, bundle?.terms)
  const privacyDirty = isDraftDirty(privacy, bundle?.privacy)

  useUnsavedChanges(termsDirty || privacyDirty)

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getGlobalLegalPolicies()

      setBundle(data)
      setTerms(draftFromPolicy(data.terms))
      setPrivacy(draftFromPolicy(data.privacy))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load legal policies.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const updateDraft = (kind: LegalKind, patch: Partial<LegalDraft>) => {
    const setter = kind === 'Terms' ? setTerms : setPrivacy

    setter(current => ({ ...current, ...patch }))
  }

  const uploadPdf = async (kind: LegalKind, file: File | null) => {
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Only PDF files can be uploaded for legal documents.')
      return
    }

    if (file.size <= 0 || file.size > MAX_PDF_BYTES) {
      setError('Legal PDF must be larger than 0 bytes and no more than 10 MB.')
      return
    }

    try {
      setUploading(kind)
      setError('')
      const url = await uploadGlobalLegalPolicyPdf(kind, file)

      updateDraft(kind, {
        documentType: 'Pdf',
        pdfUrl: url
      })

      pushAppAlert({
        severity: 'success',
        message: kind + ' PDF uploaded. Publish a new version to make it active.'
      })
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Unable to upload PDF.'

      setError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setUploading(null)
    }
  }

  const publish = async (kind: LegalKind) => {
    const draft = kind === 'Terms' ? terms : privacy
    const richContent = canonicalizeLegalContent(draft.content)
    const visibleCharacters = getLegalTextContent(richContent).length

    if (draft.documentType === 'RichText') {
      if (visibleCharacters < MIN_POLICY_TEXT_LENGTH) {
        setError(kind + ' must contain at least 10 visible characters.')
        return
      }

      if (richContent.length > MAX_POLICY_LENGTH) {
        setError(kind + ' exceeds the 50,000 character storage limit after formatting.')
        return
      }
    } else if (!draft.pdfUrl) {
      setError('Upload a PDF before publishing ' + kind + '.')
      return
    }

    try {
      setSaving(kind)
      setError('')

      const published = await publishGlobalLegalPolicy(kind, {
        documentType: draft.documentType,
        content: draft.documentType === 'RichText' ? richContent : null,
        pdfUrl: draft.documentType === 'Pdf' ? draft.pdfUrl : null
      })

      setBundle(current => {
        const existing = current ?? { terms: null, privacy: null }

        return kind === 'Terms'
          ? { ...existing, terms: published }
          : { ...existing, privacy: published }
      })

      const nextDraft = draftFromPolicy(published)
      if (kind === 'Terms') setTerms(nextDraft)
      else setPrivacy(nextDraft)

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
        <Typography color='text.secondary' sx={{ mt: 0.75, maxWidth: 900 }}>
          Publish each legal document as designed rich text or as a PDF. Every publish creates an immutable version so existing consent evidence keeps the exact document that was accepted.
        </Typography>
      </Box>

      {error && <Alert severity='error'>{error}</Alert>}

      <Alert severity='info'>
        The editor preview uses the same renderer as signup, registration, modal preview, and the standalone public legal page.
      </Alert>

      {([
        ['Terms', 'Terms of Service', terms, bundle?.terms],
        ['Privacy', 'Privacy Policy', privacy, bundle?.privacy]
      ] as const).map(([kind, title, draft, current]) => {
        const sanitized = canonicalizeLegalContent(draft.content)
        const visibleCharacters = getLegalTextContent(sanitized).length
        const storageCharacters = sanitized.length
        const dirty = kind === 'Terms' ? termsDirty : privacyDirty
        const valid =
          draft.documentType === 'Pdf'
            ? Boolean(draft.pdfUrl)
            : visibleCharacters >= MIN_POLICY_TEXT_LENGTH &&
              storageCharacters <= MAX_POLICY_LENGTH

        const previewPolicy: LegalPolicy = {
          id: current?.id ?? 'preview-' + kind.toLowerCase(),
          eventId: null,
          kind,
          version: current?.version ?? 0,
          content: draft.documentType === 'RichText' ? draft.content : '',
          contentHash: current?.contentHash ?? '',
          isEventOverride: false,
          publishedAtUtc: current?.publishedAtUtc ?? new Date().toISOString(),
          documentType: draft.documentType,
          pdfUrl: draft.documentType === 'Pdf' ? draft.pdfUrl : null
        }

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
                      ? 'Current version ' + String(current.version) + ' • ' + current.documentType + ' • published ' + new Date(current.publishedAtUtc).toLocaleString('id-ID')
                      : 'No global version published yet.'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  {dirty && <Chip label='Unpublished changes' color='warning' size='small' variant='tonal' />}
                  {current && <Chip label={'Version ' + String(current.version)} variant='outlined' />}
                </Box>
              </Box>

              <ToggleButtonGroup
                exclusive
                size='small'
                value={draft.documentType}
                disabled={!manageAccess.allowed || Boolean(saving) || Boolean(uploading)}
                onChange={(_, next: LegalDocumentType | null) => {
                  if (next) updateDraft(kind, { documentType: next })
                }}
              >
                <ToggleButton value='RichText'>
                  <i className='tabler-text-size me-2' />
                  Designed Text
                </ToggleButton>
                <ToggleButton value='Pdf'>
                  <i className='tabler-file-type-pdf me-2' />
                  PDF
                </ToggleButton>
              </ToggleButtonGroup>

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
                    {draft.documentType === 'Pdf' ? 'PDF Document' : 'Editor'}
                  </Typography>

                  {draft.documentType === 'RichText' ? (
                    <>
                      <LegalRichEditor
                        value={draft.content}
                        onChange={value => updateDraft(kind, { content: value })}
                        ariaLabel={title + ' editor'}
                        disabled={!manageAccess.allowed || Boolean(saving)}
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
                    </>
                  ) : (
                    <Box
                      sx={{
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 3,
                        display: 'grid',
                        gap: 2,
                        justifyItems: 'start'
                      }}
                    >
                      <Typography fontWeight={800}>
                        Upload {title} as PDF
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        PDF only, maximum 10 MB. Uploading does not publish automatically.
                      </Typography>
                      <Button
                        component='label'
                        variant='outlined'
                        disabled={!manageAccess.allowed || Boolean(saving) || Boolean(uploading)}
                        startIcon={
                          uploading === kind
                            ? <CircularProgress size={16} color='inherit' />
                            : <i className='tabler-upload' />
                        }
                      >
                        {uploading === kind ? 'Uploading...' : 'Choose PDF'}
                        <input
                          hidden
                          type='file'
                          accept='application/pdf,.pdf'
                          onChange={event => {
                            const file = event.target.files?.[0] ?? null
                            void uploadPdf(kind, file)
                            event.currentTarget.value = ''
                          }}
                        />
                      </Button>

                      {draft.pdfUrl && (
                        <Button
                          component='a'
                          href={draft.pdfUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          size='small'
                          endIcon={<i className='tabler-external-link' />}
                        >
                          Open uploaded PDF
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='subtitle2' fontWeight={800} sx={{ mb: 1 }}>
                    Live Preview
                  </Typography>
                  <Box
                    sx={{
                      minHeight: 380,
                      maxHeight: 680,
                      overflowY: 'auto',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: draft.documentType === 'RichText' ? { xs: 2, sm: 2.5 } : 0,
                      bgcolor: 'background.default'
                    }}
                  >
                    {valid ? (
                      <LegalPolicyDocument policy={previewPolicy} minHeight={560} />
                    ) : (
                      <Typography color='text.secondary' sx={{ p: 2.5 }}>
                        {draft.documentType === 'Pdf'
                          ? 'Upload a PDF to preview it.'
                          : 'Start writing to preview the published document.'}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant='body2' color='text.secondary'>
                  Publishing creates a new immutable version. Existing account and registration consent records are never rewritten.
                </Typography>
                <Button
                  variant='contained'
                  disabled={
                    Boolean(saving) ||
                    Boolean(uploading) ||
                    !manageAccess.allowed ||
                    !valid ||
                    !dirty
                  }
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
