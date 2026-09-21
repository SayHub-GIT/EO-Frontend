'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import ConfirmActionDialog from '@/components/feedback/ConfirmActionDialog'

import { getStoredSession } from '@/lib/auth'
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUser,
  type AdminUser,
  type AdminUserRole
} from '@/lib/admin-users'
import { emailAddress, hasFieldErrors, requiredText, type FieldErrors } from '@/lib/form-validation'

type FormState = {
  fullName: string
  email: string
  password: string
  role: AdminUserRole
  isActive: boolean
}

type UserField = 'fullName' | 'email' | 'password'

const emptyForm: FormState = {
  fullName: '',
  email: '',
  password: '',
  role: 'Staff',
  isActive: true
}

const unavailableMessage =
  'Frontend User CRUD is ready, but the current backend does not expose /api/admin/users yet. No fake local data is written. Add the backend endpoint first, then this page will become fully operational.'

export default function Page() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apiAvailable, setApiAvailable] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<UserField>>({})
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const currentSession = getStoredSession()

  const loadUsers = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await listAdminUsers()
      setUsers(Array.isArray(result) ? result : [])
      setApiAvailable(true)
    } catch (err) {
      if (err instanceof Error && err.message === 'USER_MANAGEMENT_API_UNAVAILABLE') {
        setApiAvailable(false)
        setUsers([])
      } else {
        setError(err instanceof Error ? err.message : 'Unable to load users.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users

    return users.filter(user =>
      [user.fullName, user.email, user.role].some(value => value.toLowerCase().includes(query))
    )
  }, [search, users])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFieldErrors({})
    setError('')
    setDialogOpen(true)
  }

  const openEdit = (user: AdminUser) => {
    setEditing(user)
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive
    })
    setFieldErrors({})
    setError('')
    setDialogOpen(true)
  }

  const submit = async () => {
    if (saving) return

    const fullName = form.fullName.trim()
    const email = form.email.trim()
    const nextErrors: FieldErrors<UserField> = {
      fullName: requiredText(form.fullName, 'Full name'),
      email: emailAddress(form.email)
    }

    if (!editing) {
      nextErrors.password = !form.password
        ? 'Temporary password is required.'
        : form.password.length < 8
          ? 'Temporary password must contain at least 8 characters.'
          : undefined
    }

    setFieldErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) return

    setSaving(true)
    setError('')

    try {
      if (editing) {
        await updateAdminUser(editing.id, {
          fullName,
          email,
          role: form.role,
          isActive: form.isActive
        })
      } else {
        await createAdminUser({
          fullName,
          email,
          password: form.password,
          role: form.role
        })
      }

      setDialogOpen(false)
      await loadUsers()
    } catch (err) {
      if (err instanceof Error && err.message === 'USER_MANAGEMENT_API_UNAVAILABLE') {
        setApiAvailable(false)
        setDialogOpen(false)
      } else {
        setError(err instanceof Error ? err.message : 'Unable to save user.')
      }
    } finally {
      setSaving(false)
    }
  }

  const remove = async (user: AdminUser) => {
    if (deletingId) return

    setError('')
    setDeletingId(user.id)

    try {
      await deleteAdminUser(user.id)
      setDeleteTarget(null)
      await loadUsers()
    } catch (err) {
      if (err instanceof Error && err.message === 'USER_MANAGEMENT_API_UNAVAILABLE') {
        setApiAvailable(false)
      } else {
        setError(err instanceof Error ? err.message : 'Unable to delete user.')
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, alignItems: { xs: 'stretch', md: 'flex-end' }, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box>
          <Chip label='Access Control' color='primary' size='small' sx={{ mb: 1.5 }} />
          <Typography variant='h4' fontWeight={800}>Users</Typography>
          <Typography color='text.secondary' sx={{ mt: 1, maxWidth: 760 }}>
            Manage administrator and staff accounts. Backend roles currently available are Admin and Staff.
          </Typography>
        </Box>
        <Button variant='contained' startIcon={<i className='tabler-user-plus' />} onClick={openCreate} disabled={!apiAvailable}>
          Add user
        </Button>
      </Box>

      {!apiAvailable && <Alert severity='warning'>{unavailableMessage}</Alert>}
      {error && <Alert severity='error'>{error}</Alert>}

      {currentSession && (
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant='subtitle2' color='text.secondary'>Signed-in account</Typography>
            <Box sx={{ mt: 1.5, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
                {currentSession.fullName?.slice(0, 1).toUpperCase() || 'A'}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700}>{currentSession.fullName}</Typography>
                <Typography variant='body2' color='text.secondary'>{currentSession.email}</Typography>
              </Box>
              <Chip size='small' label={currentSession.role} color='primary' variant='outlined' />
            </Box>
          </CardContent>
        </Card>
      )}

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box>
              <Typography variant='h6' fontWeight={700}>System users</Typography>
              <Typography variant='body2' color='text.secondary'>Admin can manage events; Staff is intended for operational actions such as check-in.</Typography>
            </Box>
            <TextField
              size='small'
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder='Search user...'
              disabled={!apiAvailable}
            />
          </Box>

          {loading ? (
            <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
          ) : !apiAvailable ? (
            <Box sx={{ px: 3, pb: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              {[
                ['GET /api/admin/users', 'List system users'],
                ['POST /api/admin/users', 'Create Admin or Staff'],
                ['PUT / DELETE /api/admin/users/{id}', 'Edit, disable, or remove a user']
              ].map(([endpoint, description]) => (
                <Box key={endpoint} sx={{ p: 2.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                  <Typography fontFamily='monospace' fontWeight={700}>{endpoint}</Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>{description}</Typography>
                </Box>
              ))}
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
              <i className='tabler-users-off text-5xl' />
              <Typography sx={{ mt: 1.5 }}>No users found.</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Box component='table' sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                <Box component='thead' sx={{ bgcolor: 'action.hover' }}>
                  <Box component='tr'>
                    {['User', 'Email', 'Role', 'Status', 'Actions'].map(label => (
                      <Box component='th' key={label} sx={{ px: 3, py: 2, textAlign: 'left', fontSize: 13, color: 'text.secondary', fontWeight: 700 }}>{label}</Box>
                    ))}
                  </Box>
                </Box>
                <Box component='tbody'>
                  {filtered.map(user => (
                    <Box component='tr' key={user.id} sx={{ borderTop: theme => `1px solid ${theme.palette.divider}` }}>
                      <Box component='td' sx={{ px: 3, py: 2.25, fontWeight: 700 }}>{user.fullName}</Box>
                      <Box component='td' sx={{ px: 3, py: 2.25 }}>{user.email}</Box>
                      <Box component='td' sx={{ px: 3, py: 2.25 }}><Chip size='small' label={user.role} variant='outlined' /></Box>
                      <Box component='td' sx={{ px: 3, py: 2.25 }}><Chip size='small' label={user.isActive ? 'Active' : 'Disabled'} color={user.isActive ? 'success' : 'default'} /></Box>
                      <Box component='td' sx={{ px: 3, py: 2.25 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size='small' onClick={() => openEdit(user)}>Edit</Button>
                          <Button size='small' color='error' onClick={() => setDeleteTarget(user)} disabled={user.id === currentSession?.userId || Boolean(deletingId)}>Delete</Button>
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
        <DialogTitle>{editing ? 'Edit user' : 'Add user'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 3, pt: '20px !important' }}>
          <TextField label='Full name' value={form.fullName} onChange={event => { setForm(value => ({ ...value, fullName: event.target.value })); setFieldErrors(current => ({ ...current, fullName: undefined })) }} error={Boolean(fieldErrors.fullName)} helperText={fieldErrors.fullName} required />
          <TextField label='Email' type='email' value={form.email} onChange={event => { setForm(value => ({ ...value, email: event.target.value })); setFieldErrors(current => ({ ...current, email: undefined })) }} error={Boolean(fieldErrors.email)} helperText={fieldErrors.email} required />
          {!editing && <TextField label='Temporary password' type='password' value={form.password} onChange={event => { setForm(value => ({ ...value, password: event.target.value })); setFieldErrors(current => ({ ...current, password: undefined })) }} error={Boolean(fieldErrors.password)} required helperText={fieldErrors.password ?? 'Minimum 8 characters.'} />}
          <FormControl fullWidth>
            <InputLabel id='user-role-label'>Role</InputLabel>
            <Select labelId='user-role-label' label='Role' value={form.role} onChange={event => setForm(value => ({ ...value, role: event.target.value as AdminUserRole }))}>
              <MenuItem value='Admin'>Admin</MenuItem>
              <MenuItem value='Staff'>Staff</MenuItem>
            </Select>
          </FormControl>
          {editing && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Box>
                <Typography fontWeight={700}>Account active</Typography>
                <Typography variant='body2' color='text.secondary'>Disabled users should not be able to authenticate.</Typography>
              </Box>
              <Switch checked={form.isActive} onChange={event => setForm(value => ({ ...value, isActive: event.target.checked }))} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant='contained' onClick={() => void submit()} disabled={saving}>{saving ? 'Saving...' : 'Save user'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        title='Delete user account?'
        description='This account will be removed from user management. Confirm only after checking the account identity and role.'
        confirmLabel='Confirm Delete'
        loading={Boolean(deleteTarget && deletingId === deleteTarget.id)}
        onClose={() => {
          if (!deletingId) setDeleteTarget(null)
        }}
        onConfirm={async () => {
          if (!deleteTarget || deletingId) return
          await remove(deleteTarget)
        }}
        details={deleteTarget ? [
          { label: 'User', value: deleteTarget.fullName },
          { label: 'Email', value: deleteTarget.email },
          { label: 'Role', value: deleteTarget.role },
          { label: 'Status', value: deleteTarget.isActive ? 'Active' : 'Disabled' }
        ] : []}
        warning='You cannot delete the currently signed-in account.'
      />
    </Box>
  )
}
