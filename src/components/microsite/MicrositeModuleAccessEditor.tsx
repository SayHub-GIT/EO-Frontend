'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

import { useEventPermissions } from '@/hooks/useEventPermissions'
import { getAdminEventExperience, updateAdminEventModuleAccess, type EventExperienceConfig } from '@/lib/event-experience'

type Props = { eventId: string; moduleKey: 'agenda' | 'speakers' | 'quiz'; onChanged: () => Promise<void> }

const MicrositeModuleAccessEditor = ({ eventId, moduleKey, onChanged }: Props) => {
  const { resolved, can } = useEventPermissions(eventId)
  const readAccess = { allowed: can('event.read'), resolved }
  const updateAccess = { allowed: can('event.update') }
  const [config, setConfig] = useState<EventExperienceConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!readAccess.allowed) return
    let active = true
    setLoading(true)
    setConfig(null)
    setError('')
    void getAdminEventExperience(eventId).then(value => {
      if (active) setConfig(value)
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'Pengaturan modul gagal dimuat.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [eventId, readAccess.allowed, reload])

  const module = config?.moduleConfigurations?.find(item => item.key === moduleKey)
  const canChange = updateAccess.allowed && !loading && !saving && Boolean(module) && typeof config?.moduleConfigurationRevision === 'number'

  const change = async (property: 'enabled' | 'public', checked: boolean) => {
    if (!canChange || !config?.moduleConfigurations || typeof config.moduleConfigurationRevision !== 'number') return
    const modules = config.moduleConfigurations.map(item => item.key !== moduleKey ? item : {
      ...item,
      enabled: property === 'enabled' ? checked : item.enabled,
      visibility: property === 'public'
        ? [...item.visibility.filter(value => value !== 'public'), ...(checked ? ['public'] : [])]
        : item.visibility
    })
    try {
      setSaving(true)
      setError('')
      const next = await updateAdminEventModuleAccess(eventId, {
        moduleConfigurations: modules,
        expectedModuleConfigurationRevision: config.moduleConfigurationRevision,
        moduleConfigurationSchemaVersion: config.moduleConfigurationSchemaVersion ?? 1
      })
      setConfig(next)
      await onChanged()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Akses modul gagal disimpan.')
      setConfig(null)
    } finally { setSaving(false) }
  }

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Typography variant='subtitle2'>Akses modul Event</Typography>
      <Typography variant='body2' color='text.secondary'>Pengaturan ini langsung berlaku pada Event dan microsite yang telah diterbitkan.</Typography>
      {loading && <Box role='status' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={18} />Memuat akses modul...</Box>}
      {readAccess.resolved && !readAccess.allowed && <Alert severity='info'>Akses pengaturan modul memerlukan izin membaca Event.</Alert>}
      {module && <>
        <FormControlLabel sx={{ mx: 0, minHeight: 44 }} control={<Switch checked={module.enabled} disabled={!canChange} onChange={(_, checked) => void change('enabled', checked)} />} label='Modul aktif' />
        <FormControlLabel sx={{ mx: 0, minHeight: 44 }} control={<Switch checked={module.visibility.includes('public')} disabled={!canChange || !module.enabled} onChange={(_, checked) => void change('public', checked)} />} label='Tampilkan untuk peserta' />
      </>}
      {config && !module && <Alert severity='info'>Modul ini belum tersedia pada konfigurasi Event. Tambahkan modul melalui Workspace Event sebelum mengatur aksesnya.</Alert>}
      {saving && <Typography role='status' variant='body2'>Menyimpan akses modul...</Typography>}
      {error && <Alert severity='error'>{error}</Alert>}
      {readAccess.allowed && <Button disabled={saving || loading} onClick={() => setReload(value => value + 1)} sx={{ justifySelf: 'start', minHeight: 44 }}>Muat ulang akses modul</Button>}
    </Box>
  )
}

export default MicrositeModuleAccessEditor
