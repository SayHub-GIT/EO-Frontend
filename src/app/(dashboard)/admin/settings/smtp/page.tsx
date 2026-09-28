'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'
import { useUnsavedChanges } from '@/components/navigation/UnsavedChangesProvider'
import {
  getSmtpSettings,
  testSmtpSettings,
  updateSmtpSettings,
  type SmtpSettings
} from '@/lib/smtp-settings'

type FormState = {
  enabled: boolean
  host: string
  port: string
  enableSsl: boolean
  username: string
  password: string
  fromName: string
}

const emptyForm: FormState = {
  enabled: false,
  host: 'smtp.gmail.com',
  port: '587',
  enableSsl: true,
  username: '',
  password: '',
  fromName: 'PTC Event Organizer'
}

export default function SmtpSettingsPage() {
  const [settings, setSettings] = useState<SmtpSettings | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [testEmail, setTestEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  const manageAccess = usePermissionAccess('settings.manage')

  const settingsSnapshot = settings
    ? {
        enabled: settings.enabled,
        host: settings.host,
        port: String(settings.port),
        enableSsl: settings.enableSsl,
        username: settings.username,
        password: '',
        fromName: settings.fromName
      }
    : emptyForm

  const formDirty = Boolean(settings) && (
    form.enabled !== settingsSnapshot.enabled ||
    form.host !== settingsSnapshot.host ||
    form.port !== settingsSnapshot.port ||
    form.enableSsl !== settingsSnapshot.enableSsl ||
    form.username !== settingsSnapshot.username ||
    Boolean(form.password) ||
    form.fromName !== settingsSnapshot.fromName
  )

  useUnsavedChanges(formDirty)

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getSmtpSettings()
      setSettings(data)
      setForm({
        enabled: data.enabled,
        host: data.host,
        port: String(data.port),
        enableSsl: data.enableSsl,
        username: data.username,
        password: '',
        fromName: data.fromName
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load SMTP settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    const port = Number(form.port)
    if (!form.host.trim() || !form.username.trim() || !form.fromName.trim() || !Number.isInteger(port) || port < 1 || port > 65535) {
      setError('Complete SMTP host, port, sender email, and sender name correctly.')
      return
    }

    try {
      setSaving(true)
      setError('')
      const next = await updateSmtpSettings({
        enabled: form.enabled,
        host: form.host.trim(),
        port,
        enableSsl: form.enableSsl,
        username: form.username.trim(),
        password: form.password.trim() || undefined,
        fromName: form.fromName.trim()
      })
      setSettings(next)
      setForm(value => ({ ...value, password: '' }))
      pushAppAlert({ severity: 'success', message: 'SMTP settings saved and activated.' })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save SMTP settings.'
      setError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  const runTest = async () => {
    if (!testEmail.trim()) return

    try {
      setTesting(true)
      setError('')
      const result = await testSmtpSettings(testEmail.trim())
      pushAppAlert({ severity: result.success ? 'success' : 'error', message: result.message })
    } catch (testError) {
      const message = testError instanceof Error ? testError.message : 'SMTP test failed.'
      setError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setTesting(false)
    }
  }

  if (loading && !settings) {
    return <Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Chip label='Email Delivery' color='primary' size='small' sx={{ mb: 1.5 }} />
        <Typography variant='h4' fontWeight={850}>SMTP Email Settings</Typography>
        <Typography color='text.secondary' sx={{ mt: .75, maxWidth: 860 }}>
          Configure transactional email for verification codes, registration emails, tickets, receipts, and system notifications.
        </Typography>
      </Box>

      {error && <Alert severity='error'>{error}</Alert>}

      <Alert severity={settings?.passwordConfigured ? 'success' : 'warning'}>
        SMTP password is {settings?.passwordConfigured ? 'configured and stored encrypted' : 'not configured yet'}. The saved password is never returned to the browser.
      </Alert>

      <Card variant='outlined'>
        <CardContent sx={{ display: 'grid', gap: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
            <Box>
              <Typography variant='h6' fontWeight={850}>SMTP Connection</Typography>
              <Typography variant='body2' color='text.secondary'>
                Changes take effect immediately without restarting the backend.
              </Typography>
            </Box>
            <FormControlLabel
              control={<Switch checked={form.enabled} onChange={event => setForm(value => ({ ...value, enabled: event.target.checked }))} />}
              label={form.enabled ? 'Enabled' : 'Disabled'}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
            <TextField label='SMTP host' value={form.host} onChange={event => setForm(value => ({ ...value, host: event.target.value }))} placeholder='smtp.gmail.com' />
            <TextField label='Port' type='number' value={form.port} onChange={event => setForm(value => ({ ...value, port: event.target.value }))} />
          </Box>

          <FormControlLabel
            control={<Checkbox checked={form.enableSsl} onChange={event => setForm(value => ({ ...value, enableSsl: event.target.checked }))} />}
            label='Use TLS / SSL'
          />

          <TextField
            label='Sender email / SMTP username'
            type='email'
            value={form.username}
            onChange={event => setForm(value => ({ ...value, username: event.target.value }))}
            placeholder='events@company.com'
          />
          <TextField
            label='Sender name'
            value={form.fromName}
            onChange={event => setForm(value => ({ ...value, fromName: event.target.value }))}
            placeholder='PTC Event Organizer'
          />
          <TextField
            label={settings?.passwordConfigured ? 'New SMTP password / app password' : 'SMTP password / app password'}
            type='password'
            value={form.password}
            onChange={event => setForm(value => ({ ...value, password: event.target.value }))}
            helperText={settings?.passwordConfigured
              ? 'Leave blank to keep the current encrypted password.'
              : 'Required the first time SMTP is configured.'}
            autoComplete='new-password'
          />

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant='contained'
              disabled={saving || !manageAccess.allowed}
              onClick={() => void save()}
              startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}
            >
              Save SMTP Settings
            </Button>
            {settings?.updatedAtUtc && (
              <Typography variant='caption' color='text.secondary'>
                Last updated {new Date(settings.updatedAtUtc).toLocaleString('id-ID')}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      <Card variant='outlined'>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Box>
            <Typography variant='h6' fontWeight={850}>Send Test Email</Typography>
            <Typography variant='body2' color='text.secondary'>
              Test the currently active SMTP configuration before relying on verification or event emails.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              label='Recipient email'
              type='email'
              value={testEmail}
              onChange={event => setTestEmail(event.target.value)}
              sx={{ minWidth: { xs: '100%', sm: 360 } }}
            />
            <Button
              variant='outlined'
              disabled={testing || !manageAccess.allowed || !testEmail.trim()}
              onClick={() => void runTest()}
              startIcon={testing ? <CircularProgress size={16} /> : <i className='tabler-send' />}
              sx={{ minHeight: 56 }}
            >
              Send Test
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
