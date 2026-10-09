'use client'

import { useEffect, useMemo, useState } from 'react'
import NextLink from 'next/link'
import { useParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { getAdminEvent, type AdminEvent } from '@/lib/admin-events'
import { listAdminUsers, type AdminUser } from '@/lib/admin-users'
import type { PermissionDefinition } from '@/lib/access-roles'
import {
  listAssignableEventPermissions,
  listEventStaffAccess,
  saveEventStaffAccess,
  type EventStaffAccess
} from '@/lib/event-staff-access'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'
import { useUnsavedChanges } from '@/components/navigation/UnsavedChangesProvider'
import { pushAppAlert } from '@/components/feedback/AppAlertProvider'

type EditorForm = {
  userId: string
  permissions: string[]
  isActive: boolean
}

const initialForm: EditorForm = { userId: '', permissions: [], isActive: true }
const formKey = (value: EditorForm): string =>
  JSON.stringify([value.userId, value.isActive, [...value.permissions].sort()])

const isStaff = (user: AdminUser): boolean =>
  user.role.toLowerCase() === 'staff' ||
  user.roles.some(role => role.toLowerCase() === 'staff')

export default function EventStaffAccessPage() {
  const { eventSlug: eventId } = useParams<{ eventSlug: string }>()
  const manager = usePermissionAccess('roles.manage')
  const reader = usePermissionAccess('roles.read')
  const isMainAdmin = manager.session?.role.toLowerCase() === 'admin'
  const canRead = isMainAdmin && reader.allowed
  const canManage = canRead && manager.allowed

  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [assignments, setAssignments] = useState<EventStaffAccess[]>([])
  const [catalog, setCatalog] = useState<PermissionDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<EditorForm>(initialForm)
  const [baseline, setBaseline] = useState(formKey(initialForm))
  const [revision, setRevision] = useState(0)

  const dirty = Boolean(form.userId) && formKey(form) !== baseline
  const { confirmDiscardChanges } = useUnsavedChanges(dirty)

  useEffect(() => {
    if (!reader.resolved || !canRead) {
      if (reader.resolved) setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setLoadError('')

    void Promise.all([
      getAdminEvent(eventId),
      listAdminUsers(),
      listEventStaffAccess(eventId),
      listAssignableEventPermissions(eventId)
    ]).then(([nextEvent, nextUsers, nextAssignments, nextCatalog]) => {
      if (!active) return
      setEvent(nextEvent)
      setUsers(nextUsers)
      setAssignments(nextAssignments)
      setCatalog(nextCatalog)
    }).catch(error => {
      if (!active) return
      setLoadError(error instanceof Error ? error.message : 'Unable to load event staff settings.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [canRead, eventId, reader.resolved, revision])

  const staffUsers = useMemo(
    () => users.filter(isStaff).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [users]
  )
  const assignedIds = useMemo(
    () => new Set(assignments.map(access => access.userId)),
    [assignments]
  )
  const unassignedStaff = useMemo(
    () => staffUsers.filter(user => user.isActive && !assignedIds.has(user.id)),
    [assignedIds, staffUsers]
  )
  const userById = useMemo(() => new Map(users.map(user => [user.id, user])), [users])
  const groups = useMemo(() => {
    const grouped = new Map<string, PermissionDefinition[]>()
    for (const item of catalog) grouped.set(item.module, [...(grouped.get(item.module) ?? []), item])
    return [...grouped.entries()]
  }, [catalog])
  const filteredAssignments = useMemo(() =>
    assignments.filter(access => {
      const user = userById.get(access.userId)
      const term = search.trim().toLowerCase()
      return !term || [user?.fullName, user?.email].some(value => value?.toLowerCase().includes(term))
    }).sort((a, b) =>
      (userById.get(a.userId)?.fullName ?? '').localeCompare(userById.get(b.userId)?.fullName ?? '')
    ), [assignments, search, userById])

  const selectedUser = userById.get(form.userId)
  const editingExisting = assignedIds.has(form.userId)

  const editAssignment = (access: EventStaffAccess) => {
    if (!confirmDiscardChanges()) return

    const next = {
      userId: access.userId,
      permissions: [...access.permissions],
      isActive: access.isActive
    }
    setForm(next)
    setBaseline(formKey(next))
    setSaveError('')
  }

  const startNew = () => {
    if (!confirmDiscardChanges()) return

    setForm(initialForm)
    setBaseline(formKey(initialForm))
    setSaveError('')
  }

  const togglePermission = (permission: string, checked: boolean) => {
    setForm(current => ({
      ...current,
      permissions: checked
        ? [...new Set([...current.permissions, permission])]
        : current.permissions.filter(value => value !== permission)
    }))
  }

  const toggleGroup = (items: PermissionDefinition[]) => {
    const keys = items.map(item => item.value)
    const allChecked = keys.every(value => form.permissions.includes(value))
    setForm(current => ({
      ...current,
      permissions: allChecked
        ? current.permissions.filter(value => !keys.includes(value))
        : [...new Set([...current.permissions, ...keys])]
    }))
  }

  const save = async () => {
    if (!canManage || !dirty || saving || !form.userId || form.permissions.length === 0) return

    if (form.isActive && !form.permissions.includes('event.read')) {
      setSaveError('Event Read harus aktif agar Admin Kecil dapat masuk ke dashboard event. Tambahkan Event Read sebelum menyimpan.')
      return
    }

    const allowed = new Set(catalog.map(item => item.value))
    if (form.permissions.some(permission => !allowed.has(permission))) {
      setSaveError('Permission selection is not valid for event staff.')
      return
    }

    try {
      setSaving(true)
      setSaveError('')
      const saved = await saveEventStaffAccess(eventId, {
        userId: form.userId,
        permissions: form.permissions,
        isActive: form.isActive
      })

      setAssignments(current => {
        const others = current.filter(access => access.userId !== saved.userId)
        return [...others, saved]
      })
      const next = { userId: saved.userId, permissions: saved.permissions, isActive: saved.isActive }
      setForm(next)
      setBaseline(formKey(next))
      pushAppAlert({ severity: 'success', message: 'Event staff permissions saved.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save event staff permissions.'
      setSaveError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  if (!reader.resolved || !manager.resolved) {
    return <Box role='status' sx={{ display: 'grid', placeItems: 'center', py: 12 }}><CircularProgress size={32} /></Box>
  }

  if (!canRead) {
    return <Alert severity='warning'>Only the main administrator with Roles &amp; Permissions access can manage event staff.</Alert>
  }

  if (loading) {
    return <Box role='status' sx={{ display: 'grid', placeItems: 'center', py: 12 }}><CircularProgress size={32} /></Box>
  }

  if (loadError || !event) {
    return (
      <Alert severity='error' action={<Button color='inherit' onClick={() => setRevision(value => value + 1)}>Retry</Button>}>
        {loadError || 'Event staff settings are unavailable.'}
      </Alert>
    )
  }

  const activeCount = assignments.filter(access => access.isActive).length

  return (
    <Box sx={{ display: 'grid', gap: 3.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Button component={NextLink} href={`/admin/events/${encodeURIComponent(eventId)}`} size='small' startIcon={<i className='tabler-arrow-left' />} sx={{ mb: 1 }}>
            Back to event
          </Button>
          <Typography variant='h4' fontWeight={750}>Event Staff Access</Typography>
          <Typography color='text.secondary' sx={{ mt: 0.75 }}>
            Assign people and permissions for <strong>{event.name}</strong>. Each staff account can have one active event assignment.
          </Typography>
        </Box>
        <Chip icon={<i className='tabler-shield-lock' />} label={`${activeCount} active · ${assignments.length} assigned`} variant='outlined' />
      </Box>

      <Alert severity='info' icon={<i className='tabler-info-circle' />}>
        Permissions apply only to this event. To move a staff account to another event, deactivate its existing assignment first.
        Creating users and editing global roles remain under User Management.
      </Alert>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(290px, 0.9fr) minmax(0, 1.5fr)' }, alignItems: 'start', gap: 2.5 }}>
        <Card variant='outlined'>
          <CardContent sx={{ display: 'grid', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <Box>
                <Typography variant='h6' fontWeight={700}>Assigned staff</Typography>
                <Typography variant='caption' color='text.secondary'>Current event only</Typography>
              </Box>
              <Button size='small' variant='outlined' startIcon={<i className='tabler-plus' />} onClick={startNew} disabled={!canManage || !unassignedStaff.length}>
                Add
              </Button>
            </Box>
            <TextField label='Search staff' size='small' value={search} onChange={event => setSearch(event.target.value)} placeholder='Name or email' />
            <Divider />
            {filteredAssignments.length === 0 ? (
              <Typography color='text.secondary' variant='body2' sx={{ py: 2 }}>
                {assignments.length ? 'No matching staff.' : 'No staff assigned yet. Choose Add to start.'}
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {filteredAssignments.map(access => {
                  const user = userById.get(access.userId)
                  const selected = form.userId === access.userId
                  return (
                    <Box key={access.id} sx={{
                      border: '1px solid',
                      borderColor: selected ? 'primary.main' : 'divider',
                      bgcolor: selected ? 'action.selected' : 'transparent',
                      borderRadius: 1.5,
                      p: 1.5
                    }}>
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'start', justifyContent: 'space-between' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={650} noWrap>{user?.fullName ?? 'Unknown staff'}</Typography>
                          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', overflowWrap: 'anywhere' }}>
                            {user?.email ?? access.userId}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                            <Chip size='small' color={access.isActive ? 'success' : 'default'} label={access.isActive ? 'Active' : 'Inactive'} />
                            <Chip size='small' label={`${access.permissions.length} permissions`} variant='outlined' />
                          </Box>
                        </Box>
                        <Button size='small' onClick={() => editAssignment(access)} disabled={!canManage}>
                          Edit
                        </Button>
                      </Box>
                    </Box>
                  )
                })}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card variant='outlined'>
          <CardContent sx={{ display: 'grid', gap: 2.5 }}>
            <Box>
              <Typography variant='h6' fontWeight={700}>{editingExisting ? 'Edit staff permission' : 'Assign staff to event'}</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                Choose exactly which features this person can access.
              </Typography>
            </Box>
            {editingExisting ? (
              <TextField size='small' label='Staff member' value={selectedUser ? `${selectedUser.fullName} (${selectedUser.email})` : form.userId} disabled fullWidth />
            ) : (
              <Autocomplete
                options={unassignedStaff}
                getOptionLabel={user => `${user.fullName} (${user.email})`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={unassignedStaff.find(user => user.id === form.userId) ?? null}
                onChange={(_, user) => {
                  if (!confirmDiscardChanges()) return
                  setForm({ userId: user?.id ?? '', permissions: user ? ['event.read'] : [], isActive: true })
                }}
                disabled={!canManage}
                renderInput={params => <TextField {...params} label='Staff member' size='small' placeholder='Choose an existing Staff account' />}
                noOptionsText='No available Staff users'
              />
            )}
            <FormControlLabel
              control={<Switch checked={form.isActive} onChange={(_, checked) => setForm(current => ({ ...current, isActive: checked }))} disabled={!canManage || !form.userId} />}
              label={form.isActive ? 'Access active' : 'Access inactive'}
            />
            <Divider />
            <Box>
              <Typography fontWeight={700}>Feature permissions</Typography>
              <Alert severity='info' sx={{ mt: 1.5, mb: 1 }}>
                Event Read wajib untuk penugasan aktif agar staf dapat membuka workspace. Izin modul lain bisa dipilih satu per satu.
              </Alert>
              <Typography variant='body2' color='text.secondary'>
                Changes are saved only when you click Save. Inactive assignments do not grant access.
              </Typography>
            </Box>
            {groups.length === 0 && <Alert severity='warning'>No assignable permissions were returned by the server.</Alert>}
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {groups.map(([module, items]) => {
                const count = items.filter(item => form.permissions.includes(item.value)).length
                return (
                  <Box key={module} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <Typography fontWeight={700}>{module}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={`${count}/${items.length}`} size='small' variant='outlined' />
                        <Button size='small' disabled={!canManage || !form.userId} onClick={() => toggleGroup(items)}>
                          {count === items.length ? 'Clear' : 'Select all'}
                        </Button>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, columnGap: 2, rowGap: 0.5, mt: 1 }}>
                      {items.map(item => (
                        <FormControlLabel key={item.value} sx={{ alignItems: 'flex-start', m: 0 }}
                          control={
                            <Checkbox size='small' sx={{ pt: 0.5 }} checked={form.permissions.includes(item.value)}
                              onChange={(_, checked) => togglePermission(item.value, checked)}
                              disabled={!canManage || !form.userId} />
                          }
                          label={
                            <Box sx={{ pt: 0.35 }}>
                              <Typography variant='body2' fontWeight={600}>{item.action}</Typography>
                              <Typography variant='caption' color='text.secondary'>{item.label}</Typography>
                            </Box>
                          }
                        />
                      ))}
                    </Box>
                  </Box>
                )
              })}
            </Box>
            {saveError && <Alert severity='error' role='alert'>{saveError}</Alert>}
            {form.userId && form.permissions.length === 0 && (
              <Alert severity='warning'>Select at least one permission before saving.</Alert>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, flexWrap: 'wrap' }}>
              <Button variant='outlined' onClick={startNew} disabled={saving || !canManage}>Clear</Button>
              <Button variant='contained' onClick={() => void save()}
                disabled={!canManage || saving || !dirty || !form.userId || form.permissions.length === 0}
                startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}>
                {saving ? 'Saving...' : 'Save permissions'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
