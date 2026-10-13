'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { createEventSubUser, listEventSubUsers, type EventSubUser } from '@/lib/event-sub-users'
import { useUnsavedChanges } from '@/components/navigation/UnsavedChangesProvider'
import { pushAppAlert } from '@/components/feedback/AppAlertProvider'

export default function EventSubUsersPage() {
  const { eventSlug: eventId } = useParams<{ eventSlug: string }>()
  const [users, setUsers] = useState<EventSubUser[]>([])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useUnsavedChanges(Boolean(fullName || email || password))

  useEffect(() => {
    let active = true
    void listEventSubUsers(eventId)
      .then(data => { if (active) setUsers(data) })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load accounts.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [eventId])

  const create = async () => {
    if (saving || fullName.trim().length < 2 || !email.trim() || password.length < 12) return
    setSaving(true)
    setError('')
    try {
      const user = await createEventSubUser(eventId, {
        fullName: fullName.trim(), email: email.trim(), password
      })
      setUsers(previous => [...previous, user])
      setFullName('')
      setEmail('')
      setPassword('')
      pushAppAlert({ severity: 'success', message: 'Akun bawahan dibuat. Akses masih nonaktif hingga role ditetapkan.' })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Gagal membuat akun bawahan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ display: 'grid', gap: 3, maxWidth: 1100 }}>
      <Box>
        <Typography variant='h4' fontWeight={750}>Akun bawahan event</Typography>
        <Typography color='text.secondary'>Akun di bawah Admin Kecil untuk event ini. Role dan izin akses dikelola secara terpisah.</Typography>
      </Box>
      <Alert severity='info'>Akun baru dibuat dalam keadaan nonaktif. Membuat akun tidak otomatis memberikan akses event.</Alert>
      {error && <Alert severity='error'>{error}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1.2fr)' }, gap: 2 }}>
        <Card variant='outlined'>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant='h6'>Buat akun staf</Typography>
              <TextField label='Nama lengkap' value={fullName} onChange={event => setFullName(event.target.value)} inputProps={{ maxLength: 150 }} />
              <TextField label='Email' type='email' value={email} onChange={event => setEmail(event.target.value)} />
              <TextField label='Password sementara' type='password' value={password} onChange={event => setPassword(event.target.value)} helperText='Minimal 12 karakter; berlaku kebijakan password Backend.' />
              <Button variant='contained' disabled={saving || fullName.trim().length < 2 || !email.trim() || password.length < 12} onClick={() => void create()}>
                {saving ? 'Menyimpan...' : 'Buat akun'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
        <Card variant='outlined'>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 2 }}>Akun yang terdaftar</Typography>
            {loading ? <CircularProgress size={24} /> : users.length === 0 ? (
              <Typography color='text.secondary'>Belum ada akun bawahan pada event ini.</Typography>
            ) : (
              <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />} spacing={1.5}>
                {users.map(user => (
                  <Box key={user.id} sx={{ py: 1, minWidth: 0 }}>
                    <Typography fontWeight={650} sx={{ overflowWrap: 'anywhere' }}>{user.fullName}</Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>{user.email}</Typography>
                    <Typography variant='caption' color='text.secondary'>{user.status} · {user.isActive ? 'Aktif' : 'Nonaktif'}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
