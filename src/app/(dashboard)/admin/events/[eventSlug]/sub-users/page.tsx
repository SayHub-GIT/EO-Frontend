'use client'

import { useEffect, useRef, useState } from 'react'
import NextLink from 'next/link'
import { useParams } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { createEventSubUser, listEventSubUsers, listEventCustomRoles, getEventSubUserRoles, saveEventSubUserRoles, type EventSubUser, type EventCustomRole } from '@/lib/event-sub-users'
import { useUnsavedChanges } from '@/components/navigation/UnsavedChangesProvider'
import { pushAppAlert } from '@/components/feedback/AppAlertProvider'

export default function EventSubUsersPage() {
  const { eventSlug: eventId } = useParams<{ eventSlug: string }>()
  const [users, setUsers] = useState<EventSubUser[]>([])
  const [roles, setRoles] = useState<EventCustomRole[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [assignedRoleIds, setAssignedRoleIds] = useState<string[]>([])
  const [accessActive, setAccessActive] = useState(false)
  const [rolesLoading, setRolesLoading] = useState(false)
  const latestRoleRequest = useRef(0)
  const [rolesLoaded, setRolesLoaded] = useState(false)
  const [roleBaseline, setRoleBaseline] = useState(JSON.stringify([[], false]))
  const [roleError, setRoleError] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const roleDraft = JSON.stringify([[...assignedRoleIds].sort(), accessActive])
  const rolesDirty = Boolean(selectedUserId && rolesLoaded && roleDraft !== roleBaseline)
  useUnsavedChanges(Boolean(fullName || email || password) || rolesDirty)

  useEffect(() => {
    let active = true
    void Promise.all([listEventSubUsers(eventId), listEventCustomRoles(eventId)])
      .then(([data, eventRoles]) => { if (active) { setUsers(data); setRoles(eventRoles) } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load accounts.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; latestRoleRequest.current += 1 }
  }, [eventId])

  const selectUser = async (userId: string) => {
    if (saving || (rolesDirty && !window.confirm('Perubahan role yang belum disimpan akan hilang. Lanjutkan?'))) return
    const requestId = ++latestRoleRequest.current
    setSelectedUserId(userId)
    setRoleError('')
    setAssignedRoleIds([])
    setAccessActive(false)
    setRolesLoaded(false)
    setRoleBaseline(JSON.stringify([[], false]))
    if (!userId) {
      setRolesLoading(false)
      return
    }
    setRolesLoading(true)
    try {
      const assignment = await getEventSubUserRoles(eventId, userId)
      if (requestId !== latestRoleRequest.current) return
      setAssignedRoleIds(assignment.roleIds)
      setAccessActive(assignment.isActive)
      setRoleBaseline(JSON.stringify([[...assignment.roleIds].sort(), assignment.isActive]))
      setRolesLoaded(true)
    } catch (reason) {
      if (requestId !== latestRoleRequest.current) return
      setRoleError(reason instanceof Error ? reason.message : 'Tidak dapat memuat role staf.')
    } finally {
      if (requestId === latestRoleRequest.current) setRolesLoading(false)
    }
  }

  const saveRoles = async () => {
    if (!selectedUserId || saving || rolesLoading || !rolesLoaded || !rolesDirty ||
        (accessActive && assignedRoleIds.length === 0)) return
    const userId = selectedUserId
    setSaving(true)
    setRoleError('')
    try {
      // Backend requires an empty role list on revocation; it also revokes sessions.
      const saved = await saveEventSubUserRoles(eventId, userId, accessActive ? assignedRoleIds : [], accessActive)
      setAssignedRoleIds(saved.roleIds)
      setAccessActive(saved.isActive)
      setRoleBaseline(JSON.stringify([[...saved.roleIds].sort(), saved.isActive]))
      pushAppAlert({ severity: 'success', message: 'Role dan status akses staf tersimpan.' })
      // Account state and delegated-access state are distinct backend fields.
      try {
        const current = await listEventSubUsers(eventId)
        setUsers(current)
      } catch {
        setRoleError('Role berhasil disimpan, tetapi daftar staf belum dapat diperbarui.')
      }
    } catch (reason) {
      setRoleError(reason instanceof Error ? reason.message : 'Gagal menyimpan role staf.')
    } finally {
      setSaving(false)
    }
  }

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
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button component={NextLink} variant='outlined' href={`/admin/events/${encodeURIComponent(eventId)}/custom-roles`} startIcon={<i className='tabler-shield-lock' />}>
          Kelola Custom Roles
        </Button>
      </Box>
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
      <Card variant='outlined'>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Typography variant='h6'>Role dan akses staf</Typography>
          <Typography variant='body2' color='text.secondary'>Pilih staf, tentukan custom role aktif, lalu simpan. Akses tetap dibatasi Backend sesuai event dan pemilik akun.</Typography>
          <TextField select size='small' label='Pilih staf' value={selectedUserId} onChange={event => void selectUser(event.target.value)} SelectProps={{ native: true }}>
            <option value=''>Pilih akun bawahan</option>
            {users.map(user => <option key={user.id} value={user.id}>{user.fullName}</option>)}
          </TextField>
          {rolesLoading && <CircularProgress size={20} />}
          {selectedUserId && !rolesLoading && !rolesLoaded && roleError && <Alert severity='error'>{roleError}</Alert>}
          {selectedUserId && rolesLoaded && !rolesLoading && (
            <Stack spacing={1}>
              {roles.filter(role => role.isActive || assignedRoleIds.includes(role.id)).map(role => (
                <FormControlLabel key={role.id} control={<Checkbox checked={assignedRoleIds.includes(role.id)} disabled={saving || (!role.isActive && !assignedRoleIds.includes(role.id))} onChange={(_, checked) => setAssignedRoleIds(values => checked ? [...new Set([...values, role.id])] : values.filter(id => id !== role.id))} />} label={role.isActive ? role.name : `${role.name} (nonaktif)`} />
              ))}
              {roles.length === 0 && <Alert severity='info'>Belum ada custom role. Buat role terlebih dahulu sebelum mengaktifkan akses.</Alert>}
              <FormControlLabel control={<Switch checked={accessActive} onChange={(_, checked) => {
                if (!checked && assignedRoleIds.length > 0 &&
                    !window.confirm('Menonaktifkan akses akan mencabut seluruh role dan sesi login staf. Lanjutkan?')) return
                setAccessActive(checked)
                if (!checked) setAssignedRoleIds([])
              }} disabled={saving} />} label='Aktifkan akses staf' />
              {!accessActive && <Alert severity='info'>Saat disimpan nonaktif, seluruh role staf dikosongkan dan sesi login dicabut oleh Backend.</Alert>}
              {roleError && <Alert severity='error'>{roleError}</Alert>}
              <Button variant='contained' disabled={saving || !rolesDirty || (accessActive && assignedRoleIds.length === 0)} onClick={() => void saveRoles()}>{saving ? 'Menyimpan...' : 'Simpan role staf'}</Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
