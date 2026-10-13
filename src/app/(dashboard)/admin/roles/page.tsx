'use client'

import { useEffect, useMemo, useState } from 'react'
import NextLink from 'next/link'

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
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import { listAdminEvents, type AdminEvent } from '@/lib/admin-events'
import { listAdminUsers, type AdminUser } from '@/lib/admin-users'
import Typography from '@mui/material/Typography'

import ConfirmActionDialog from '@/components/feedback/ConfirmActionDialog'
import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'
import { useUnsavedChanges } from '@/components/navigation/UnsavedChangesProvider'
import {
  createAccessRole,
  deleteAccessRole,
  getPermissionCatalog,
  listAccessRoles,
  updateAccessRole,
  type AccessRole,
  type PermissionDefinition
} from '@/lib/access-roles'

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

export default function RolesPage() {
  const [roles, setRoles] = useState<AccessRole[]>([])
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [adminKecilUsers, setAdminKecilUsers] = useState<AdminUser[]>([])
  const [selectedAdminKecilId, setSelectedAdminKecilId] = useState('')
  const [adminsError, setAdminsError] = useState('')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [eventsError, setEventsError] = useState('')
  const [catalog, setCatalog] = useState<PermissionDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AccessRole | null>(null)
  const [form, setForm] = useState<RoleForm>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<AccessRole | null>(null)

  useUnsavedChanges(dialogOpen || saving)
  const manageAccess = usePermissionAccess('roles.manage')

  const selectedAdminKecil = adminKecilUsers.find(user => user.id === selectedAdminKecilId)

  const modules = useMemo(() => {
    const grouped = new Map<string, PermissionDefinition[]>()

    for (const item of catalog) {
      grouped.set(item.module, [...(grouped.get(item.module) ?? []), item])
    }

    return [...grouped.entries()]
  }, [catalog])

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const [nextRoles, nextCatalog] = await Promise.all([
        listAccessRoles(),
        getPermissionCatalog()
      ])
      setRoles(nextRoles)
      setCatalog(nextCatalog)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load roles.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    void listAdminEvents()
      .then(result => setEvents(result))
      .catch(reason => setEventsError(reason instanceof Error ? reason.message : 'Unable to load events.'))
    void listAdminUsers()
      .then(users => setAdminKecilUsers(users.filter(user => user.isActive &&
        (user.role.toLowerCase() === 'admin_kecil' || user.roles.some(role => role.toLowerCase() === 'admin_kecil')))))
      .catch(reason => setAdminsError(reason instanceof Error ? reason.message : 'Unable to load Admin Kecil accounts.'))
  }, [])

  const openCreate = () => {
    if (!manageAccess.allowed) return
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (role: AccessRole) => {
    if (!manageAccess.allowed || role.isSystem) return
    setEditing(role)
    setForm({
      name: role.name,
      description: role.description ?? '',
      isActive: role.isActive,
      permissions: role.permissions.includes('*') ? catalog.map(item => item.value) : role.permissions
    })
    setDialogOpen(true)
  }

  const togglePermission = (permission: string) => {
    if (!manageAccess.allowed) return
    setForm(current => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter(value => value !== permission)
        : [...current.permissions, permission]
    }))
  }

  const toggleModule = (items: PermissionDefinition[]) => {
    if (!manageAccess.allowed) return
    const values = items.map(item => item.value)
    const allSelected = values.every(value => form.permissions.includes(value))

    setForm(current => ({
      ...current,
      permissions: allSelected
        ? current.permissions.filter(value => !values.includes(value))
        : [...new Set([...current.permissions, ...values])]
    }))
  }

  const save = async () => {
    if (!manageAccess.allowed || !form.name.trim() || saving || editing?.isSystem) return

    try {
      setSaving(true)
      setError('')
      const request = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        isActive: form.isActive,
        permissions: form.permissions
      }

      if (editing) await updateAccessRole(editing.id, request)
      else await createAccessRole(request)

      setDialogOpen(false)
      await load()
      pushAppAlert({ severity: 'success', message: editing ? 'Role updated.' : 'Role created.' })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save role.'
      setError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!manageAccess.allowed || !deleteTarget || deleteTarget.isSystem || saving) return

    try {
      setSaving(true)
      await deleteAccessRole(deleteTarget.id)
      setDeleteTarget(null)
      await load()
      pushAppAlert({ severity: 'success', message: 'Role deleted.' })
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Unable to delete role.'
      setError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box>
          <Chip label='RBAC' color='primary' size='small' sx={{ mb: 1.5 }} />
          <Typography variant='h4' fontWeight={850}>Roles & Permissions</Typography>
          <Typography color='text.secondary' sx={{ mt: .75, maxWidth: 820 }}>
            Build custom roles and choose exactly what each role can Read, Create, Update, Delete, Export, or operate per feature.
          </Typography>
        </Box>
        <Button variant='contained' onClick={openCreate} disabled={!manageAccess.allowed} startIcon={<i className='tabler-plus' />}>
          Create Role
        </Button>
      </Box>

      <Card variant='outlined' sx={{ borderRadius: 2.5, borderColor: 'primary.light' }}>
        <CardContent sx={{ display: 'grid', gap: 2.5, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 46, height: 46, display: 'grid', placeItems: 'center', bgcolor: 'primary.lighter', color: 'primary.main', borderRadius: 2 }}>
              <i className='tabler-shield-lock text-2xl' />
            </Box>
            <Box>
              <Typography variant='h6' fontWeight={750}>Admin Kecil — Hak Akses per Event</Typography>
              <Typography variant='body2' color='text.secondary'>
                Super Admin memilih satu event untuk setiap staf, lalu memberikan izin modul spesifik. Akun staf tidak bisa membuat admin lain atau mengubah role global.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <TextField select size='small' label='Pilih event yang akan dikelola' sx={{ flex: 1, minWidth: 210 }}
              value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}
              helperText='Permission ini berlaku hanya untuk event yang dipilih.'>
              <MenuItem value=''>Pilih Event</MenuItem>
              {events.map(event => <MenuItem value={event.id} key={event.id}>{event.name}</MenuItem>)}
            </TextField>
            <TextField select size='small' label='Akun Admin Kecil' sx={{ flex: 1, minWidth: 210 }}
              value={selectedAdminKecilId} onChange={e => setSelectedAdminKecilId(e.target.value)}
              helperText='Pilih akun yang akan diperiksa. Penetapan akses tetap dilakukan pada halaman event.'>
              <MenuItem value=''>Pilih Admin Kecil</MenuItem>
              {adminKecilUsers.map(user => <MenuItem value={user.id} key={user.id}>{user.fullName} — {user.email}</MenuItem>)}
            </TextField>
            <Button component={NextLink} href={selectedEventId
              ? `/admin/events/${encodeURIComponent(selectedEventId)}/staff-access?adminKecilId=${encodeURIComponent(selectedAdminKecilId)}`
              : '/admin/events'}
              variant='contained'
              startIcon={<i className='tabler-user-shield' />}
              disabled={!selectedEventId || !selectedAdminKecilId || !manageAccess.allowed}
              sx={{ minHeight: 42 }}>
              Atur Admin Event
            </Button>
          </Box>
          {eventsError && <Alert severity='warning'>{eventsError}</Alert>}
          {adminsError && <Alert severity='warning'>{adminsError}</Alert>}
          {selectedAdminKecil && selectedEventId && (
            <Typography variant='body2' color='text.secondary'>
              Konteks pemeriksaan: {selectedAdminKecil.fullName} pada event yang dipilih. Akun ini akan ditampilkan sebagai konteks pada halaman berikutnya; akses staf tetap dikelola berdasarkan event.
            </Typography>
          )}
          {events.length === 0 && !eventsError && <Typography variant='caption' color='text.secondary'>Belum ada event yang tersedia.</Typography>}
        </CardContent>
      </Card>

      {error && <Alert severity='error'>{error}</Alert>}

      {loading ? (
        <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,1fr)' }, gap: 2 }}>
          {roles.map(role => (
            <Card key={role.id} variant='outlined'>
              <CardContent sx={{ display: 'grid', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant='h6' fontWeight={850}>{role.name}</Typography>
                      {role.isSystem && <Chip size='small' label='System' icon={<i className='tabler-lock' />} />}
                      <Chip size='small' color={role.isActive ? 'success' : 'default'} label={role.isActive ? 'Active' : 'Inactive'} />
                    </Box>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: .75 }}>
                      {role.description || 'No description'}
                    </Typography>
                  </Box>
                  <Chip size='small' variant='outlined' label={String(role.userCount) + ' user' + (role.userCount === 1 ? '' : 's')} />
                </Box>

                <Box sx={{ display: 'flex', gap: .75, flexWrap: 'wrap' }}>
                  {role.permissions.includes('*')
                    ? <Chip size='small' color='primary' label='Full access' />
                    : role.permissions.slice(0, 8).map(permission => (
                        <Chip key={permission} size='small' variant='tonal' label={permission} />
                      ))}
                  {!role.permissions.includes('*') && role.permissions.length > 8 && (
                    <Chip size='small' label={'+' + String(role.permissions.length - 8) + ' more'} />
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size='small' variant='outlined' disabled={!role.isSystem && !manageAccess.allowed} onClick={() => openEdit(role)}>
                    {role.isSystem ? 'View Permissions' : 'Edit'}
                  </Button>
                  {!role.isSystem && (
                    <Button size='small' color='error' disabled={!manageAccess.allowed} onClick={() => setDeleteTarget(role)}>
                      Delete
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={saving ? undefined : () => setDialogOpen(false)} fullWidth maxWidth='lg'>
        <DialogTitle>{editing?.isSystem ? 'System Role: ' + editing.name : editing ? 'Edit Role' : 'Create Role'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 3, pt: '20px !important' }}>
          {editing?.isSystem && (
            <Alert severity='info'>System roles are protected. Create a custom role when you need a different permission set.</Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.5fr' }, gap: 2 }}>
            <TextField
              label='Role name'
              value={form.name}
              disabled={Boolean(editing?.isSystem)}
              onChange={event => setForm(value => ({ ...value, name: event.target.value }))}
            />
            <TextField
              label='Description'
              value={form.description}
              disabled={Boolean(editing?.isSystem)}
              onChange={event => setForm(value => ({ ...value, description: event.target.value }))}
            />
          </Box>

          {!editing?.isSystem && editing && (
            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={event => setForm(value => ({ ...value, isActive: event.target.checked }))} />}
              label='Role active'
            />
          )}

          <Box sx={{ display: 'grid', gap: 2 }}>
            {modules.map(([module, items]) => {
              const selectedCount = items.filter(item => form.permissions.includes(item.value)).length
              const allSelected = selectedCount === items.length
              const someSelected = selectedCount > 0 && !allSelected

              return (
                <Card key={module} variant='outlined'>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', mb: 1.5 }}>
                      <Typography fontWeight={850}>{module}</Typography>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={allSelected}
                            indeterminate={someSelected}
                            disabled={Boolean(editing?.isSystem)}
                            onChange={() => toggleModule(items)}
                          />
                        }
                        label='Select all'
                      />
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' }, gap: 1 }}>
                      {items.map(item => (
                        <FormControlLabel
                          key={item.value}
                          control={
                            <Checkbox
                              checked={form.permissions.includes(item.value)}
                              disabled={Boolean(editing?.isSystem)}
                              onChange={() => togglePermission(item.value)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant='body2' fontWeight={700}>{item.action}</Typography>
                              <Typography variant='caption' color='text.secondary'>{item.label}</Typography>
                            </Box>
                          }
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          {!editing?.isSystem && (
            <Button variant='contained' disabled={saving || !manageAccess.allowed || !form.name.trim()} onClick={() => void save()}>
              {saving ? 'Saving...' : 'Save Role'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        title='Delete custom role?'
        description='Users assigned to this role will immediately lose permissions from it and their active sessions will be revoked.'
        confirmLabel='Delete Role'
        loading={saving}
        onClose={() => !saving && setDeleteTarget(null)}
        onConfirm={() => void remove()}
        details={deleteTarget ? [
          { label: 'Role', value: deleteTarget.name },
          { label: 'Assigned users', value: String(deleteTarget.userCount) }
        ] : []}
      />
    </Box>
  )
}
