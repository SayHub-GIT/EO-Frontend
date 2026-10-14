'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import NextLink from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { getAdminEvent, type AdminEvent } from '@/lib/admin-events'
import { listAdminUsers, type AdminUser } from '@/lib/admin-users'
import type { PermissionDefinition } from '@/lib/access-roles'
import {
  listAssignableEventPermissions, listEventStaffAccess,
  saveEventStaffAccess, type EventStaffAccess
} from '@/lib/event-staff-access'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'
import { useUnsavedChanges } from '@/components/navigation/UnsavedChangesProvider'
import { pushAppAlert } from '@/components/feedback/AppAlertProvider'

type GrantForm = { permissions: string[]; isActive: boolean }
const defaultGrant: GrantForm = { permissions: ['event.read'], isActive: true }
const fingerprint = (form: GrantForm) => JSON.stringify([form.isActive, [...form.permissions].sort()])
import { resolveEventAdmin, isAdminKecil } from '@/lib/event-admin-selection'

function AdminKecilAccessEditor() {
  const { eventSlug: eventId } = useParams<{ eventSlug: string }>()
  const searchParams = useSearchParams()
  const candidateUserId = searchParams.get('userId') ?? ''
  const reader = usePermissionAccess('roles.read')
  const writer = usePermissionAccess('roles.manage')
  const isMainAdmin = reader.session?.role.toLowerCase() === 'admin'
  const canRead = reader.resolved && isMainAdmin && reader.allowed
  const canWrite = canRead && writer.resolved && writer.allowed

  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [assignments, setAssignments] = useState<EventStaffAccess[]>([])
  const [catalog, setCatalog] = useState<PermissionDefinition[]>([])
  const [form, setForm] = useState<GrantForm>(defaultGrant)
  const [baseline, setBaseline] = useState(fingerprint(defaultGrant))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [reload, setReload] = useState(0)

  const target = resolveEventAdmin(users, assignments, candidateUserId)
  const selectedGrant = assignments.find(grant => grant.userId === target?.id)
  const differentActiveAdmin = assignments.find(grant => {
    if (grant.userId === target?.id || !grant.isActive) return false
    const account = users.find(user => user.id === grant.userId)
    return account && isAdminKecil(account)
  })
  const allowedPermissions = useMemo(() => new Set(catalog.map(item => item.value)), [catalog])
  const grouped = useMemo(() => {
    const groups = new Map<string, PermissionDefinition[]>()
    for (const item of catalog) groups.set(item.module, [...(groups.get(item.module) ?? []), item])
    return [...groups.entries()]
  }, [catalog])
  const dirty = fingerprint(form) !== baseline
  useUnsavedChanges(dirty)

  useEffect(() => {
    if (!canRead) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setLoadError('')
    setSaveError('')
    setEvent(null)
    setUsers([])
    setAssignments([])
    setCatalog([])
    setForm(defaultGrant)
    setBaseline(fingerprint(defaultGrant))
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
      const account = resolveEventAdmin(nextUsers, nextAssignments, candidateUserId)
      const existing = nextAssignments.find(grant => grant.userId === account?.id)
      const next = existing
        ? { permissions: [...existing.permissions], isActive: existing.isActive }
        : { ...defaultGrant, permissions: [...defaultGrant.permissions] }
      setForm(next)
      // New assignments are deliberately dirty so Save can create a real grant.
      setBaseline(existing ? fingerprint(next) : fingerprint({ permissions: [], isActive: false }))
    }).catch(reason => {
      if (active) setLoadError(reason instanceof Error ? reason.message : 'Gagal memuat data akses event.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [canRead, candidateUserId, eventId, reload])

  const togglePermission = (permission: string, checked: boolean) => {
    if (!canWrite || !target?.isActive || saving || !allowedPermissions.has(permission)) return
    setForm(previous => ({
      ...previous,
      permissions: checked
        ? [...new Set([...previous.permissions, permission])]
        : previous.permissions.filter(value => value !== permission)
    }))
  }

  const save = async () => {
    if (!canWrite || !target || saving || loading || !dirty || form.permissions.length === 0) return
    if (!target.isActive && form.isActive) {
      setSaveError('Akun Admin Kecil nonaktif. Penugasan aktif hanya dapat dicabut, bukan diaktifkan ulang.')
      return
    }
    if (form.isActive && !form.permissions.includes('event.read')) {
      setSaveError('Event Read wajib diberikan agar Admin Kecil dapat membuka workspace.')
      return
    }
    if (form.permissions.some(permission => !allowedPermissions.has(permission))) {
      setSaveError('Terdapat permission yang tidak tersedia untuk event ini.')
      return
    }
    if (form.isActive && differentActiveAdmin) {
      setSaveError('Event ini sudah memiliki Admin Kecil aktif. Nonaktifkan penugasan lama terlebih dahulu.')
      return
    }
    if (!form.isActive && selectedGrant?.isActive &&
        !window.confirm('Menonaktifkan Admin Kecil juga mencabut akses serta sesi akun bawahannya pada event ini. Lanjutkan?')) return

    setSaving(true)
    setSaveError('')
    try {
      const saved = await saveEventStaffAccess(eventId, {
        userId: target.id, permissions: form.permissions, isActive: form.isActive
      })
      setAssignments(current => [...current.filter(grant => grant.userId !== saved.userId), saved])
      const next = { permissions: [...saved.permissions], isActive: saved.isActive }
      setForm(next)
      setBaseline(fingerprint(next))
      pushAppAlert({ severity: 'success', message: 'Penugasan Admin Kecil berhasil disimpan.' })
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Gagal menyimpan penugasan.')
    } finally {
      setSaving(false)
    }
  }

  if (!reader.resolved || !writer.resolved) {
    return <Box role='status' sx={{ py: 9, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  }
  if (!canRead) {
    return <Alert severity='warning'>Hanya Admin utama dengan izin Roles &amp; Permissions yang dapat mengatur akses ini.</Alert>
  }
  if (loading) {
    return <Box role='status' sx={{ py: 9, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  }
  if (loadError || !event) {
    return <Alert severity='error' action={<Button color='inherit' onClick={() => setReload(x => x + 1)}>Ulangi</Button>}>{loadError || 'Data event tidak tersedia.'}</Alert>
  }
  if (!target) {
    return (
      <Box sx={{ display: 'grid', gap: 2, maxWidth: 900 }}>
        <Typography variant='h4' fontWeight={750}>Event Admin Access</Typography>
        <Alert severity='warning'>
          Belum ada Admin Kecil yang ditetapkan pada event ini. Buat akun Admin Kecil terlebih dahulu,
          lalu tetapkan event melalui Roles &amp; Permissions. Tidak ada Staff atau Manager yang bisa dipilih di sini.
        </Alert>
        <Button component={NextLink} href='/admin/roles' variant='outlined' sx={{ justifySelf: 'start' }}>
          Ke Roles &amp; Permissions
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'grid', gap: 3, maxWidth: 1160 }}>
      <Box>
        <Button component={NextLink} href='/admin/roles' size='small'
          startIcon={<i className='tabler-arrow-left' />} sx={{ mb: 1 }}>
          Kembali ke Roles &amp; Permissions
        </Button>
        <Typography variant='h4' fontWeight={750}>Event Admin Access</Typography>
        <Typography color='text.secondary'>Atur hak akses Admin Kecil yang sudah ditetapkan untuk event ini. Akun bawahan dikelola setelah Admin Kecil login.</Typography>
      </Box>
      <Card variant='outlined'>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Typography variant='h6'>{event.name}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <TextField label='Choose member (Admin Kecil)' value={`${target.fullName} (${target.email})`}
              disabled fullWidth helperText='Otomatis berdasarkan Admin Kecil pada event. Tidak dapat diganti di editor ini.' />
            <Chip size='small' variant='outlined' color={selectedGrant?.isActive ? 'success' : 'default'}
              label={selectedGrant?.isActive ? 'Penugasan aktif' : selectedGrant ? 'Penugasan nonaktif' : 'Belum ditugaskan'} />
          </Stack>
          {!target.isActive && (
            <Alert severity='warning'>
              Akun Admin Kecil ini sudah nonaktif. Penugasan event yang masih aktif dapat dicabut,
              tetapi akun tidak dapat diaktifkan kembali melalui halaman ini.
            </Alert>
          )}
          {differentActiveAdmin && (
            <Alert severity='warning'>
              Event ini sudah memiliki Admin Kecil lain yang aktif. Nonaktifkan akun tersebut sebelum mengaktifkan penugasan baru.
            </Alert>
          )}
          <Alert severity='info'>
            Satu event hanya memiliki satu Admin Kecil aktif. Staff dan Manager hanya bisa dibuat dan diatur oleh Admin Kecil dari dashboard-nya.
          </Alert>
          <FormControlLabel control={<Switch checked={form.isActive}
            disabled={!canWrite || saving || (!target.isActive && !form.isActive)}
            onChange={(_, isActive) => setForm(previous => ({ ...previous, isActive }))} />}
            label={form.isActive ? 'Akses event aktif' : 'Akses event nonaktif'} />
        </CardContent>
      </Card>

      <Card variant='outlined'>
        <CardContent sx={{ display: 'grid', gap: 2.5 }}>
          <Box>
            <Typography variant='h6'>Permission untuk event ini</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
              Pilih permission yang diperlukan. Hak sistem global tidak tersedia pada penugasan event.
            </Typography>
          </Box>
          {grouped.length === 0 && <Alert severity='warning'>Katalog permission belum tersedia. Tidak ada perubahan yang bisa disimpan.</Alert>}
          {grouped.map(([module, items]) => (
            <Box key={module} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>{module}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 0.5 }}>
                {items.map(item => (
                  <FormControlLabel key={item.value} sx={{ m: 0, alignItems: 'flex-start' }}
                    control={<Checkbox size='small' checked={form.permissions.includes(item.value)}
                      disabled={!canWrite || !target.isActive || saving}
                      onChange={(_, checked) => togglePermission(item.value, checked)} />}
                    label={<Box sx={{ pt: 0.5 }}>
                      <Typography variant='body2' fontWeight={600}>{item.action}</Typography>
                      <Typography variant='caption' color='text.secondary'>{item.label}</Typography>
                    </Box>} />
                ))}
              </Box>
            </Box>
          ))}
          {saveError && <Alert severity='error' role='alert'>{saveError}</Alert>}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant='contained' onClick={() => void save()}
              disabled={!canWrite || saving || !dirty || (form.isActive && !target.isActive) || grouped.length === 0 || form.permissions.length === 0}
              startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}>
              {saving ? 'Menyimpan...' : 'Simpan penugasan'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default function AdminKecilAccessPage() {
  return (
    <Suspense fallback={<Box role='status' sx={{ py: 9, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>}>
      <AdminKecilAccessEditor />
    </Suspense>
  )
}
