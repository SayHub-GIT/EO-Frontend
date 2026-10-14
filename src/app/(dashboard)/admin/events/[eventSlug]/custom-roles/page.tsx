'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import NextLink from 'next/link'
import { useParams } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { PermissionDefinition } from '@/lib/access-roles'
import {
  createEventCustomRole,
  deleteEventCustomRole,
  listEventCustomRoles,
  listEventRolePermissions,
  listEventSubUsers,
  getEventSubUserRoles,
  updateEventCustomRole,
  type EventCustomRole
} from '@/lib/event-sub-users'
import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import { useUnsavedChanges } from '@/components/navigation/UnsavedChangesProvider'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'

type RoleForm = {
  name: string
  description: string
  isActive: boolean
  permissions: string[]
}

const emptyForm: RoleForm = {
  name: '',
  description: '',
  isActive: true,
  permissions: []
}

const keyOf = (value: RoleForm) =>
  JSON.stringify([value.name, value.description, value.isActive, [...value.permissions].sort()])

const reservedSystemNames = new Set(['ADMIN', 'ADMIN_KECIL', 'SUPER ADMIN', 'MAIN ADMIN', 'PARTICIPANT'])

export default function EventCustomRolesPage() {
  const { eventSlug: eventId } = useParams<{ eventSlug: string }>()

  return <EventCustomRolesEditor key={eventId} eventId={eventId} />
}

function EventCustomRolesEditor({ eventId }: { eventId: string }) {
  const access = usePermissionAccess('event.read')
  const isAdminKecil = access.session?.role.toLowerCase() === 'admin_kecil' && access.allowed
  const [roles, setRoles] = useState<EventCustomRole[]>([])
  const [catalog, setCatalog] = useState<PermissionDefinition[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [form, setForm] = useState<RoleForm>(emptyForm)
  const [baseline, setBaseline] = useState(keyOf(emptyForm))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<EventCustomRole | null>(null)
  const mounted = useRef(false)
  const [reload, setReload] = useState(0)

  const dirty = keyOf(form) !== baseline
  const { confirmDiscardChanges } = useUnsavedChanges(dirty)
  const availablePermissions = useMemo(() => new Set(catalog.map(item => item.value)), [catalog])
  const unknownPermissions = form.permissions.filter(permission => !availablePermissions.has(permission))
  const reservedName = reservedSystemNames.has(form.name.trim().toUpperCase())
  const groups = useMemo(() => {
    const result = new Map<string, PermissionDefinition[]>()
    for (const item of catalog) result.set(item.module, [...(result.get(item.module) ?? []), item])
    return [...result.entries()]
  }, [catalog])

  useEffect(() => {
    mounted.current = true

    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (!access.resolved || !isAdminKecil) {
      if (access.resolved) setLoading(false)
      return
    }
    let active = true
    // Reloading the event discards the previous role draft after confirmation.
    setSelectedRoleId(null)
    setDeleteTarget(null)
    setForm({ ...emptyForm, permissions: [] })
    setBaseline(keyOf(emptyForm))
    setRoles([])
    setCatalog([])
    setError('')
    setLoading(true)
    void Promise.all([listEventCustomRoles(eventId), listEventRolePermissions(eventId)])
      .then(([nextRoles, permissions]) => {
        if (!active) return
        setRoles(nextRoles)
        setCatalog(permissions)
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'Gagal memuat custom role event.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [access.resolved, eventId, isAdminKecil, reload])

  const selectRole = (role: EventCustomRole | null) => {
    if (saving || loading || !confirmDiscardChanges()) return
    const next = role ? {
      name: role.name,
      description: role.description ?? '',
      isActive: role.isActive,
      permissions: [...role.permissions]
    } : { ...emptyForm, permissions: [] }
    setSelectedRoleId(role?.id ?? null)
    setForm(next)
    setBaseline(keyOf(next))
    setError('')
  }

  const togglePermission = (permission: string) => {
    if (saving) return
    setForm(current => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter(value => value !== permission)
        : [...current.permissions, permission]
    }))
  }

  const save = async () => {
    const name = form.name.trim()
    if (!mounted.current || !isAdminKecil || saving || loading || reservedName || name.length < 2 || name.length > 100 ||
        form.description.length > 500 || form.permissions.length === 0 ||
        unknownPermissions.length > 0 || !dirty) return

    setSaving(true)
    setError('')
    try {
      const request = {
        name,
        description: form.description.trim() || null,
        permissions: form.permissions
      }
      const saved = selectedRoleId
        ? await updateEventCustomRole(eventId, selectedRoleId, { ...request, isActive: form.isActive })
        : await createEventCustomRole(eventId, request)
      if (!mounted.current) return
      setRoles(current => [...current.filter(role => role.id !== saved.id), saved]
        .sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedRoleId(saved.id)
      const next = {
        name: saved.name,
        description: saved.description ?? '',
        isActive: saved.isActive,
        permissions: [...saved.permissions]
      }
      setForm(next)
      setBaseline(keyOf(next))
      pushAppAlert({ severity: 'success', message: 'Custom role event berhasil disimpan.' })
    } catch (reason) {
      if (mounted.current) {
        setError(reason instanceof Error ? reason.message : 'Gagal menyimpan custom role.')
      }
    } finally {
      if (mounted.current) setSaving(false)
    }
  }

  const remove = async () => {
    if (!mounted.current || !isAdminKecil || !deleteTarget || saving || loading) return
    const roleId = deleteTarget.id
    setSaving(true)
    setError('')
    try {
      // Fail closed if role usage cannot be verified. The Backend currently does
      // not enforce this check; concurrent changes still require a server guard.
      const subUsers = await listEventSubUsers(eventId)
      if (!mounted.current) return
      for (let offset = 0; offset < subUsers.length; offset += 8) {
        const checks = await Promise.all(
          subUsers.slice(offset, offset + 8).map(user => getEventSubUserRoles(eventId, user.id))
        )
        if (!mounted.current) return
        if (checks.some(assignment => assignment.roleIds.includes(roleId))) {
          setError('Role masih digunakan oleh akun bawahan. Cabut assignment terlebih dahulu sebelum menghapus role.')
          setDeleteTarget(null)
          return
        }
      }
      if (!mounted.current) return
      await deleteEventCustomRole(eventId, roleId)
      if (!mounted.current) return
      setRoles(current => current.filter(role => role.id !== roleId))
      if (selectedRoleId === roleId) {
        setSelectedRoleId(null)
        setForm({ ...emptyForm, permissions: [] })
        setBaseline(keyOf(emptyForm))
      }
      pushAppAlert({ severity: 'success', message: 'Custom role dihapus.' })
      setDeleteTarget(null)
    } catch (reason) {
      if (mounted.current) {
        setError(reason instanceof Error ? reason.message : 'Penghapusan dibatalkan karena pemeriksaan assignment atau API gagal.')
        setDeleteTarget(null)
      }
    } finally {
      if (mounted.current) setSaving(false)
    }
  }

  const retry = () => {
    if (!saving && confirmDiscardChanges()) setReload(value => value + 1)
  }

  if (!access.resolved) {
    return <Box role='status' sx={{ py: 9, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  }

  if (!isAdminKecil) {
    return <Alert severity='warning'>Hanya Admin Kecil yang mengelola Custom Roles dan hak akses bawahan pada event ini.</Alert>
  }

  return (
    <Box sx={{ maxWidth: 1200, display: 'grid', gap: 3 }}>
      <Box>
        <Button component={NextLink} href={`/admin/events/${encodeURIComponent(eventId)}/sub-users`}
          size='small' startIcon={<i className='tabler-arrow-left' />} sx={{ mb: 1 }}>
          Kembali ke akun bawahan
        </Button>
        <Typography variant='h4' fontWeight={750}>Custom role event</Typography>
        <Typography color='text.secondary' sx={{ mt: 0.75 }}>
          Atur izin hanya untuk event ini. Perubahan role tidak memberi akses global.
        </Typography>
      </Box>

      {error && (
        <Alert severity='error' role='alert'
          action={<Button color='inherit' size='small' onClick={retry} disabled={saving}>Ulangi</Button>}>
          {error}
        </Alert>
      )}
      {loading ? <Box role='status' sx={{ py: 8, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(240px, 0.8fr) minmax(0, 1.8fr)' }, gap: 2.5, alignItems: 'start' }}>
          <Card variant='outlined'>
            <CardContent sx={{ display: 'grid', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1 }}>
                <Typography variant='h6'>Role tersedia</Typography>
                <Button size='small' onClick={() => selectRole(null)} disabled={saving || loading} startIcon={<i className='tabler-plus' />}>Baru</Button>
              </Box>
              {roles.length === 0 && <Typography variant='body2' color='text.secondary'>Belum ada custom role untuk event ini.</Typography>}
              {roles.map(role => (
                <Box key={role.id} sx={{
                  border: '1px solid',
                  borderColor: selectedRoleId === role.id ? 'primary.main' : 'divider',
                  borderRadius: 1.5, p: 1.5
                }}>
                  <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={650} sx={{ overflowWrap: 'anywhere' }}>{role.name}</Typography>
                      <Typography variant='caption' color='text.secondary'>{role.permissions.length} izin</Typography>
                    </Box>
                    <Chip size='small' label={role.isActive ? 'Aktif' : 'Nonaktif'} color={role.isActive ? 'success' : 'default'} />
                  </Stack>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 1 }}>
                    <Button size='small' disabled={saving} onClick={() => selectRole(role)}>Edit</Button>
                    <Button size='small' color='error' disabled={saving || dirty}
                      onClick={() => setDeleteTarget(role)}>Hapus</Button>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
          <Card variant='outlined'>
            <CardContent sx={{ display: 'grid', gap: 2.5 }}>
              <Typography variant='h6'>{selectedRoleId ? 'Edit custom role' : 'Buat custom role'}</Typography>
              <TextField label='Nama role' value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                inputProps={{ maxLength: 100 }} error={reservedName} helperText={reservedName ? 'Nama ini digunakan oleh role sistem dan tidak boleh dipakai.' : '2–100 karakter'} disabled={saving} fullWidth />
              <TextField label='Deskripsi (opsional)' multiline minRows={2} value={form.description}
                onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
                inputProps={{ maxLength: 500 }} disabled={saving} fullWidth />
              {selectedRoleId && (
                <FormControlLabel control={<Switch checked={form.isActive}
                  onChange={(_, checked) => setForm(current => ({ ...current, isActive: checked }))}
                  disabled={saving} />} label={form.isActive ? 'Role aktif' : 'Role nonaktif'} />
              )}
              <Box>
                <Typography fontWeight={700}>Permission event</Typography>
                <Typography variant='body2' color='text.secondary'>Pilih hak akses yang diperlukan. Backend akan membatasi izin maksimum sesuai Admin Kecil.</Typography>
              </Box>
              {groups.length === 0 && <Alert severity='warning'>Tidak ada permission yang dapat ditetapkan pada event ini.</Alert>}
              {unknownPermissions.length > 0 && (
                <Alert severity='warning'>
                  Role memuat izin yang tidak lagi tersedia: {unknownPermissions.join(', ')}.
                  <Button size='small' color='inherit' onClick={() => setForm(current => ({
                    ...current, permissions: current.permissions.filter(p => availablePermissions.has(p))
                  }))}>Keluarkan izin tidak tersedia</Button>
                </Alert>
              )}
              {groups.map(([module, items]) => (
                <Box key={module} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 2 }}>
                  <Typography fontWeight={700} sx={{ mb: 1 }}>{module}</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 0.5 }}>
                    {items.map(item => (
                      <FormControlLabel key={item.value} sx={{ m: 0, alignItems: 'flex-start' }}
                        control={<Checkbox size='small' checked={form.permissions.includes(item.value)}
                          onChange={() => togglePermission(item.value)} disabled={saving} />}
                        label={<Box sx={{ pt: 0.5 }}>
                          <Typography variant='body2' fontWeight={600}>{item.action}</Typography>
                          <Typography variant='caption' color='text.secondary'>{item.label}</Typography>
                        </Box>} />
                    ))}
                  </Box>
                </Box>
              ))}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button variant='outlined' disabled={saving} onClick={() => selectRole(null)}>Batal</Button>
                <Button variant='contained' onClick={() => void save()}
                  disabled={saving || !dirty || reservedName || form.name.trim().length < 2 || form.permissions.length === 0 ||
                    unknownPermissions.length > 0 || groups.length === 0}
                  startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}>
                  {saving ? 'Menyimpan...' : 'Simpan role'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
      <Dialog open={Boolean(deleteTarget)} onClose={saving ? undefined : () => setDeleteTarget(null)}>
        <DialogTitle>Hapus custom role?</DialogTitle>
        <DialogContent>
          <Typography>Role {deleteTarget?.name} akan dihapus permanen. Sistem akan memeriksa apakah role masih dipakai akun bawahan. Jika pemeriksaan gagal, penghapusan dibatalkan.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={saving}>Batal</Button>
          <Button color='error' variant='contained' disabled={saving} onClick={() => void remove()}>Hapus</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
