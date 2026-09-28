'use client'

import { useEffect, useMemo, useState } from 'react'

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
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import ConfirmActionDialog from '@/components/feedback/ConfirmActionDialog'
import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import { useUnsavedChanges } from '@/components/navigation/UnsavedChangesProvider'
import { getStoredSession } from '@/lib/auth'
import { listAccessRoles, type AccessRole } from '@/lib/access-roles'
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUser,
  type AdminUser
} from '@/lib/admin-users'
import { emailAddress, hasFieldErrors, requiredText, type FieldErrors } from '@/lib/form-validation'

type FormState = {
  fullName: string
  email: string
  password: string
  roleIds: string[]
  isActive: boolean
}

type UserField = 'fullName' | 'email' | 'password' | 'roles'

const emptyForm: FormState = {
  fullName: '',
  email: '',
  password: '',
  roleIds: [],
  isActive: true
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [roles, setRoles] = useState<AccessRole[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<UserField>>({})
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

  useUnsavedChanges(dialogOpen || saving)
  const currentSession = getStoredSession()

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const [nextUsers, nextRoles] = await Promise.all([
        listAdminUsers(),
        listAccessRoles()
      ])
      setUsers(nextUsers)
      setRoles(nextRoles.filter(role => role.isActive))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return users.filter(user => {
      const matchesName = !query || user.fullName.toLowerCase().includes(query)
      const matchesRole = roleFilter === 'all' || user.roleIds.includes(roleFilter)

      return matchesName && matchesRole
    })
  }, [roleFilter, search, users])

  const openCreate = () => {
    const staffRole = roles.find(role => role.systemKey === 'Staff')
    setEditing(null)
    setForm({
      ...emptyForm,
      roleIds: staffRole ? [staffRole.id] : []
    })
    setFieldErrors({})
    setDialogOpen(true)
  }

  const openEdit = (user: AdminUser) => {
    setEditing(user)
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      roleIds: user.roleIds,
      isActive: user.isActive
    })
    setFieldErrors({})
    setDialogOpen(true)
  }

  const submit = async () => {
    if (saving) return

    const nextErrors: FieldErrors<UserField> = {
      fullName: requiredText(form.fullName, 'Full name'),
      email: emailAddress(form.email),
      roles: form.roleIds.length === 0 ? 'Select at least one role.' : undefined,
      password: !editing
        ? !form.password
          ? 'Temporary password is required.'
          : form.password.length < 12
            ? 'Temporary password must contain at least 12 characters.'
            : undefined
        : undefined
    }

    setFieldErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) return

    try {
      setSaving(true)
      setError('')

      if (editing) {
        await updateAdminUser(editing.id, {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          roleIds: form.roleIds,
          isActive: form.isActive
        })
      } else {
        await createAdminUser({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          roleIds: form.roleIds
        })
      }

      setDialogOpen(false)
      await load()
      pushAppAlert({ severity: 'success', message: editing ? 'User updated.' : 'User created.' })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save user.'
      setError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget || saving) return

    try {
      setSaving(true)
      await deleteAdminUser(deleteTarget.id)
      setDeleteTarget(null)
      await load()
      pushAppAlert({ severity: 'success', message: 'User deleted.' })
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Unable to delete user.'
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
          <Chip label='Access Control' color='primary' size='small' sx={{ mb: 1.5 }} />
          <Typography variant='h4' fontWeight={850}>Users</Typography>
          <Typography color='text.secondary' sx={{ mt: .75, maxWidth: 820 }}>
            Create accounts and assign one or multiple roles. Effective access is the union of permissions from every assigned role.
          </Typography>
        </Box>
        <Button variant='contained' onClick={openCreate} startIcon={<i className='tabler-user-plus' />}>
          Add User
        </Button>
      </Box>

      {error && <Alert severity='error'>{error}</Alert>}

      <Card variant='outlined'>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box>
              <Typography variant='h6' fontWeight={800}>System users</Typography>
              <Typography variant='body2' color='text.secondary'>Role changes revoke active sessions so new permissions apply immediately.</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                size='small'
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder='Search by name...'
                inputProps={{ 'aria-label': 'Search users by name' }}
              />
              <FormControl size='small' sx={{ minWidth: 180 }}>
                <InputLabel id='user-role-filter-label'>Role</InputLabel>
                <Select
                  labelId='user-role-filter-label'
                  label='Role'
                  value={roleFilter}
                  onChange={event => setRoleFilter(String(event.target.value))}
                >
                  <MenuItem value='all'>All roles</MenuItem>
                  {roles.map(role => (
                    <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
              <i className='tabler-users-off text-5xl' />
              <Typography sx={{ mt: 1.5 }}>No users found.</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Box component='table' sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                <Box component='thead' sx={{ bgcolor: 'action.hover' }}>
                  <Box component='tr'>
                    {['User', 'Email', 'Roles', 'Status', 'Actions'].map(label => (
                      <Box component='th' key={label} sx={{ px: 3, py: 2, textAlign: 'left', fontSize: 13, color: 'text.secondary' }}>{label}</Box>
                    ))}
                  </Box>
                </Box>
                <Box component='tbody'>
                  {filtered.map(user => (
                    <Box component='tr' key={user.id} sx={{ borderTop: theme => '1px solid ' + theme.palette.divider }}>
                      <Box component='td' sx={{ px: 3, py: 2.25, fontWeight: 750 }}>{user.fullName}</Box>
                      <Box component='td' sx={{ px: 3, py: 2.25 }}>{user.email}</Box>
                      <Box component='td' sx={{ px: 3, py: 2.25 }}>
                        <Box sx={{ display: 'flex', gap: .75, flexWrap: 'wrap' }}>
                          {user.roles.map(role => <Chip key={role} size='small' label={role} variant='outlined' />)}
                        </Box>
                      </Box>
                      <Box component='td' sx={{ px: 3, py: 2.25 }}>
                        <Chip size='small' label={user.isActive ? 'Active' : 'Disabled'} color={user.isActive ? 'success' : 'default'} />
                      </Box>
                      <Box component='td' sx={{ px: 3, py: 2.25 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size='small' onClick={() => openEdit(user)}>Edit</Button>
                          <Button
                            size='small'
                            color='error'
                            disabled={user.id === currentSession?.userId}
                            onClick={() => setDeleteTarget(user)}
                          >
                            Delete
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={saving ? undefined : () => setDialogOpen(false)} fullWidth maxWidth='sm'>
        <DialogTitle>{editing ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2.5, pt: '20px !important' }}>
          <TextField
            label='Full name'
            value={form.fullName}
            onChange={event => setForm(value => ({ ...value, fullName: event.target.value }))}
            error={Boolean(fieldErrors.fullName)}
            helperText={fieldErrors.fullName}
          />
          <TextField
            label='Email'
            type='email'
            value={form.email}
            onChange={event => setForm(value => ({ ...value, email: event.target.value }))}
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email}
          />
          {!editing && (
            <TextField
              label='Temporary password'
              type='password'
              value={form.password}
              onChange={event => setForm(value => ({ ...value, password: event.target.value }))}
              error={Boolean(fieldErrors.password)}
              helperText={fieldErrors.password ?? 'Minimum 12 characters and must satisfy the password policy.'}
            />
          )}

          <FormControl error={Boolean(fieldErrors.roles)}>
            <InputLabel id='user-roles-label'>Roles</InputLabel>
            <Select
              labelId='user-roles-label'
              multiple
              label='Roles'
              value={form.roleIds}
              onChange={event => setForm(value => ({
                ...value,
                roleIds: typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value
              }))}
              renderValue={selected =>
                selected
                  .map(id => roles.find(role => role.id === id)?.name ?? id)
                  .join(', ')
              }
            >
              {roles.map(role => (
                <MenuItem key={role.id} value={role.id}>
                  <Checkbox checked={form.roleIds.includes(role.id)} />
                  <ListItemText
                    primary={role.name}
                    secondary={role.isSystem ? 'System role' : role.description ?? 'Custom role'}
                  />
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.roles && <Typography variant='caption' color='error' sx={{ ml: 1.75, mt: .5 }}>{fieldErrors.roles}</Typography>}
          </FormControl>

          {editing && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Box>
                <Typography fontWeight={700}>Account active</Typography>
                <Typography variant='body2' color='text.secondary'>Disabling the account revokes active sessions.</Typography>
              </Box>
              <Switch checked={form.isActive} onChange={event => setForm(value => ({ ...value, isActive: event.target.checked }))} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant='contained' onClick={() => void submit()} disabled={saving}>
            {saving ? 'Saving...' : 'Save User'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        title='Delete user account?'
        description='The account and its role assignments will be removed.'
        confirmLabel='Delete User'
        loading={saving}
        onClose={() => !saving && setDeleteTarget(null)}
        onConfirm={() => void remove()}
        details={deleteTarget ? [
          { label: 'User', value: deleteTarget.fullName },
          { label: 'Email', value: deleteTarget.email },
          { label: 'Roles', value: deleteTarget.roles.join(', ') }
        ] : []}
        warning='You cannot delete the currently signed-in account.'
      />
    </Box>
  )
}
