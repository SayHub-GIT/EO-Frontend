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
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { createEventSubUser, listEventSubUsers, listEventCustomRoles, getEventSubUserRoles, saveEventSubUserRoles, type EventSubUser, type EventCustomRole } from '@/lib/event-sub-users'
import { useUnsavedChanges } from '@/components/navigation/UnsavedChangesProvider'
import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'

export default function EventSubUsersPage() {
  const { eventSlug: eventId } = useParams<{ eventSlug: string }>()
  const access = usePermissionAccess('event.read')
  const isAdminKecil = access.session?.role.toLowerCase() === 'admin_kecil' && access.allowed
  const [users, setUsers] = useState<EventSubUser[]>([])
  const [roles, setRoles] = useState<EventCustomRole[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [assignedRoleIds, setAssignedRoleIds] = useState<string[]>([])
  const [effectivePermissions, setEffectivePermissions] = useState<string[]>([])
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
    if (!access.resolved || !isAdminKecil) {
      if (access.resolved) setLoading(false)
      return
    }
    let active = true
    latestRoleRequest.current += 1
    setSelectedUserId('')
    setRolesLoaded(false)
    setAssignedRoleIds([])
    setEffectivePermissions([])
    setAccessActive(false)
    setRoleBaseline(JSON.stringify([[], false]))
    setUsers([])
    setRoles([])
    setLoading(true)
    setError('')
    void Promise.all([listEventSubUsers(eventId), listEventCustomRoles(eventId)])
      .then(([data, eventRoles]) => { if (active) { setUsers(data); setRoles(eventRoles) } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load accounts.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; latestRoleRequest.current += 1 }
  }, [access.resolved, eventId, isAdminKecil]

  const selectUser = async (userId: string) => {
    if (!isAdminKecil || saving || (rolesDirty && !window.confirm('Perubahan role yang belum disimpan akan hilang. Lanjutkan?'))) return
    const requestId = ++latestRoleRequest.current
    setSelectedUserId(userId)
    setRoleError('')
    setAssignedRoleIds([])
    setEffectivePermissions([])
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
      setEffectivePermissions(assignment.effectivePermissions)
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
    if (!isAdminKecil || !selectedUserId || saving || rolesLoading || !rolesLoaded || !rolesDirty ||
        (accessActive && assignedRoleIds.length === 0)) return
    const userId = selectedUserId
    setSaving(true)
    setRoleError('')
    try {
      // Backend requires an empty role list on revocation; it also revokes sessions.
      const saved = await saveEventSubUserRoles(eventId, userId, accessActive ? assignedRoleIds : [], accessActive)
      setAssignedRoleIds(saved.roleIds)
      setEffectivePermissions(saved.effectivePermissions)
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
    if (!isAdminKecil || saving || fullName.trim().length < 2 || !email.trim() || password.length < 12) return
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

  if (!access.resolved) {
    return <Box role='status' sx={{ py: 9, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  }

  if (!isAdminKecil) {
    return <Alert severity='warning'>Halaman Assigned Staff hanya tersedia untuk Admin Kecil yang memiliki akses event. Staf bawahan tidak dapat mengelola akun lain.</Alert>
  }

  return (
    <Box sx={{ display: 'grid', gap: 3, maxWidth: 1160 }}>
      <Box>
        <Typography variant='h4' fontWeight={750}>Assigned Staff</Typography>
        <Typography color='text.secondary'>
          Buat dan atur akun bawahan untuk event ini. Hak akses bawahan selalu dibatasi permission Admin Kecil.
        </Typography>
      </Box>
      <Alert severity='info'>
        Akun baru dibuat nonaktif. Role seperti Check-in atau Manager ditetapkan lewat Custom Roles, bukan role sistem global.
      </Alert>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button component={NextLink} variant='outlined'
          href={`/admin/events/${encodeURIComponent(eventId)}/custom-roles`}
          startIcon={<i className='tabler-shield-lock' />}>
          Kelola Custom Roles
        </Button>
      </Box>
      {error && <Alert severity='error'>{error}</Alert>}
      <Box sx={{ display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.45fr) minmax(290px, 0.85fr)' },
        gap: 2.5, alignItems: 'start' }}>
      <Card variant='outlined'>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Typography variant='h6'>Hak akses Assigned Staff</Typography>
          <Typography variant='body2' color='text.secondary'>Pilih staf bawahan, lalu tetapkan custom role (misalnya Check-in atau Manager) dengan izin yang tidak boleh melebihi Admin Kecil.</Typography>
          <TextField select size='small' label='Pilih staf' value={selectedUserId} onChange={event => void selectUser(event.target.value)} SelectProps={{ native: true }}>
            <option value=''>Pilih staf yang telah dibuat</option>
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
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Typography variant='body2' fontWeight={650}>Izin efektif tersimpan</Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {effectivePermissions.length > 0 ? effectivePermissions.map(permission => (
                    <Chip key={permission} size='small' label={permission} variant='outlined' />
                  )) : <Typography variant='caption' color='text.secondary'>Belum ada izin efektif.</Typography>}
                </Box>
              </Box>
              {roleError && <Alert severity='error'>{roleError}</Alert>}
              <Button variant='contained' disabled={saving || !rolesDirty || (accessActive && assignedRoleIds.length === 0)} onClick={() => void saveRoles()}>{saving ? 'Menyimpan...' : 'Simpan role staf'}</Button>
            </Stack>
          )}
        </CardContent>
      </Card>
        <Card variant='outlined'>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 1 }}>Assigned Staff</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>Hanya akun bawahan milik Admin Kecil pada event ini.</Typography>
            {loading ? <CircularProgress size={24} /> : users.length === 0 ? (
              <Typography color='text.secondary'>Belum ada staf bawahan yang ditugaskan pada event ini.</Typography>
            ) : (
              <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />} spacing={1.5}>
                {users.map(user => (
                  <Box key={user.id} sx={{ py: 1, minWidth: 0 }}>
                    <Typography fontWeight={650} sx={{ overflowWrap: 'anywhere' }}>{user.fullName}</Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>{user.email}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', mt: 1 }}>
                      <Chip size='small' variant='outlined' color={user.isActive ? 'success' : 'default'} label={user.isActive ? 'Aktif' : 'Nonaktif'} />
                      <Button size='small' variant='outlined' onClick={() => void selectUser(user.id)} disabled={saving || rolesLoading}>
                        Atur Akses
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
        <Card variant='outlined'>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant='h6'>Buat akun bawahan</Typography>
              <TextField label='Nama lengkap' value={fullName} onChange={event => setFullName(event.target.value)} inputProps={{ maxLength: 150 }} />
              <TextField label='Email' type='email' value={email} onChange={event => setEmail(event.target.value)} />
              <TextField label='Password sementara' type='password' value={password} onChange={event => setPassword(event.target.value)} helperText='Minimal 12 karakter; berlaku kebijakan password Backend.' />
              <Button variant='contained' disabled={saving || fullName.trim().length < 2 || !email.trim() || password.length < 12} onClick={() => void create()}>
                {saving ? 'Menyimpan...' : 'Buat akun'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
    </Box>
  )
}
