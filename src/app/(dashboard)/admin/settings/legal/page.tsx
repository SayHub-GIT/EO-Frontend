'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import {
  getGlobalLegalPolicies,
  publishGlobalLegalPolicy,
  type LegalPolicyBundle
} from '@/lib/legal-policies'

export default function LegalSettingsPage() {
  const [bundle, setBundle] = useState<LegalPolicyBundle | null>(null)
  const [terms, setTerms] = useState('')
  const [privacy, setPrivacy] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<'Terms' | 'Privacy' | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getGlobalLegalPolicies()
      setBundle(data)
      setTerms(data.terms?.content ?? '')
      setPrivacy(data.privacy?.content ?? '')
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
    const content = kind === 'Terms' ? terms : privacy
    if (content.trim().length < 10) {
      setError(kind + ' must contain at least 10 characters.')
      return
    }

    try {
      setSaving(kind)
      setError('')
      await publishGlobalLegalPolicy(kind, content.trim())
      await load()
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
    return <Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Chip label='Legal Settings' color='primary' size='small' sx={{ mb: 1.5 }} />
        <Typography variant='h4' fontWeight={850}>Terms & Privacy</Typography>
        <Typography color='text.secondary' sx={{ mt: .75, maxWidth: 860 }}>
          Edit global Terms & Conditions and Privacy Policy. Publishing creates a new immutable version so registrations keep the exact policy version they accepted.
        </Typography>
      </Box>

      {error && <Alert severity='error'>{error}</Alert>}
      <Alert severity='info'>
        Event-specific legal policies can still override these global defaults. Existing registration acceptance records are not rewritten.
      </Alert>

      {([
        ['Terms', 'Terms & Conditions', terms, setTerms, bundle?.terms],
        ['Privacy', 'Privacy Policy', privacy, setPrivacy, bundle?.privacy]
      ] as const).map(([kind, title, value, setter, current]) => (
        <Card key={kind} variant='outlined'>
          <CardContent sx={{ display: 'grid', gap: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box>
                <Typography variant='h6' fontWeight={850}>{title}</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: .5 }}>
                  {current
                    ? 'Current version ' + String(current.version) + ' • published ' + new Date(current.publishedAtUtc).toLocaleString('id-ID')
                    : 'No global version published yet.'}
                </Typography>
              </Box>
              {current && <Chip label={'Version ' + String(current.version)} variant='outlined' />}
            </Box>

            <TextField
              multiline
              minRows={12}
              maxRows={28}
              value={value}
              onChange={event => setter(event.target.value)}
              placeholder={'Write ' + title + ' content here...'}
              inputProps={{ maxLength: 50000 }}
              helperText={value.length.toLocaleString() + ' / 50,000 characters'}
            />

            <Button
              variant='contained'
              disabled={Boolean(saving) || value.trim().length < 10 || value.trim() === (current?.content ?? '')}
              onClick={() => void publish(kind)}
              startIcon={saving === kind ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-file-check' />}
              sx={{ justifySelf: 'start' }}
            >
              Publish New Version
            </Button>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}
