'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { CustomModuleDefinition, CustomModuleFieldDefinition, CustomModuleFieldType } from '@/lib/event-experience'

type Props = {
  value: CustomModuleDefinition[]
  disabled?: boolean
  onChange: (value: CustomModuleDefinition[]) => void
}

const fieldTypes: CustomModuleFieldType[] = ['text', 'textarea', 'number', 'date', 'datetime-local', 'url', 'select']
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 55)

const emptyField = (index: number): CustomModuleFieldDefinition => ({
  key: `field${index}`,
  label: `Field ${index}`,
  type: 'text',
  required: false,
  options: []
})

export default function CustomModuleBuilder({ value, disabled = false, onChange }: Props) {
  const [error, setError] = useState<string | null>(null)

  const addModule = () => {
    const index = value.length + 1
    const module: CustomModuleDefinition = {
      key: `custom-feature-${index}`,
      label: `Custom Feature ${index}`,
      description: '',
      icon: 'tabler-layout-grid',
      visibility: 'admin',
      fields: []
    }
    onChange([...value, module])
  }

  const updateModule = (index: number, patch: Partial<CustomModuleDefinition>) => {
    setError(null)
    onChange(value.map((module, i) => i === index ? { ...module, ...patch } : module))
  }

  const renameModule = (index: number, label: string) => {
    const current = value[index]
    const previousAuto = `custom-${slugify(current.label)}`
    const nextKey = current.key === previousAuto || current.key.startsWith('custom-feature-')
      ? (`custom-${slugify(label) || `feature-${index + 1}`}` as const)
      : current.key
    updateModule(index, { label, key: nextKey })
  }

  const updateKey = (index: number, key: string) => {
    const normalized = `custom-${slugify(key.replace(/^custom-/, ''))}` as const
    if (value.some((module, i) => i !== index && module.key === normalized)) {
      setError(`Module key ${normalized} is already used.`)
      return
    }
    updateModule(index, { key: normalized })
  }

  const addField = (moduleIndex: number) => {
    const module = value[moduleIndex]
    updateModule(moduleIndex, { fields: [...module.fields, emptyField(module.fields.length + 1)] })
  }

  const updateField = (moduleIndex: number, fieldIndex: number, patch: Partial<CustomModuleFieldDefinition>) => {
    const module = value[moduleIndex]
    updateModule(moduleIndex, {
      fields: module.fields.map((field, i) => i === fieldIndex ? { ...field, ...patch } : field)
    })
  }

  const removeField = (moduleIndex: number, fieldIndex: number) => {
    const module = value[moduleIndex]
    updateModule(moduleIndex, { fields: module.fields.filter((_, i) => i !== fieldIndex) })
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <Box>
          <Typography variant='h6' fontWeight={700}>Custom features / modules</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: .5, maxWidth: 760 }}>
            Create reusable features for this event without adding hardcoded pages. Define the module, choose whether participants may see it, then define its data fields. Each feature gets its own workspace.
          </Typography>
        </Box>
        <Button disabled={disabled} variant='contained' onClick={addModule} startIcon={<i className='tabler-plus' />}>Create Feature</Button>
      </Box>

      {error && <Alert severity='error'>{error}</Alert>}
      {value.length === 0 && <Alert severity='info'>No custom feature yet. Built-in modules still work normally.</Alert>}

      {value.map((module, moduleIndex) => (
        <Card key={`${module.key}-${moduleIndex}`} variant='outlined'>
          <CardContent sx={{ display: 'grid', gap: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: 'action.hover', display: 'grid', placeItems: 'center', color: 'primary.main' }}><i className={module.icon || 'tabler-layout-grid'} /></Box>
                <Typography fontWeight={700}>{module.label || 'Untitled feature'}</Typography>
                <Chip size='small' label={module.visibility === 'public' ? 'Participant-facing' : 'Admin only'} color={module.visibility === 'public' ? 'success' : 'default'} variant='tonal' />
              </Box>
              <IconButton disabled={disabled} color='error' onClick={() => onChange(value.filter((_, i) => i !== moduleIndex))} aria-label={`Delete ${module.label}`}><i className='tabler-trash' /></IconButton>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <TextField label='Feature name' value={module.label} disabled={disabled} onChange={e => renameModule(moduleIndex, e.target.value)} inputProps={{ maxLength: 120 }} />
              <TextField label='Feature key' value={module.key} disabled={disabled} onChange={e => updateKey(moduleIndex, e.target.value)} helperText='Stable internal key, always starts with custom-' inputProps={{ maxLength: 63 }} />
              <TextField label='Icon class' value={module.icon} disabled={disabled} onChange={e => updateModule(moduleIndex, { icon: e.target.value })} helperText='Example: tabler-calendar-star' />
              <FormControlLabel control={<Switch disabled={disabled} checked={module.visibility === 'public'} onChange={e => updateModule(moduleIndex, { visibility: e.target.checked ? 'public' : 'admin' })} />} label='Show this module to participants' />
            </Box>
            <TextField label='Feature description' value={module.description} disabled={disabled} onChange={e => updateModule(moduleIndex, { description: e.target.value })} multiline minRows={2} inputProps={{ maxLength: 500 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Box><Typography fontWeight={700}>Data fields</Typography><Typography variant='body2' color='text.secondary'>These fields become the form used to create records inside this feature.</Typography></Box>
              <Button size='small' disabled={disabled} variant='outlined' onClick={() => addField(moduleIndex)} startIcon={<i className='tabler-plus' />}>Add field</Button>
            </Box>

            {module.fields.map((field, fieldIndex) => (
              <Box key={`${field.key}-${fieldIndex}`} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'grid', gap: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 180px auto' }, gap: 2, alignItems: 'start' }}>
                  <TextField label='Field label' value={field.label} disabled={disabled} onChange={e => updateField(moduleIndex, fieldIndex, { label: e.target.value })} />
                  <TextField label='Field key' value={field.key} disabled={disabled} onChange={e => updateField(moduleIndex, fieldIndex, { key: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })} />
                  <TextField select label='Type' value={field.type} disabled={disabled} onChange={e => updateField(moduleIndex, fieldIndex, { type: e.target.value as CustomModuleFieldType, options: e.target.value === 'select' ? field.options : [] })}>{fieldTypes.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}</TextField>
                  <IconButton disabled={disabled} color='error' onClick={() => removeField(moduleIndex, fieldIndex)}><i className='tabler-x' /></IconButton>
                </Box>
                <FormControlLabel control={<Switch disabled={disabled} checked={field.required} onChange={e => updateField(moduleIndex, fieldIndex, { required: e.target.checked })} />} label='Required' />
                {field.type === 'select' && <TextField label='Options' value={field.options.join(', ')} disabled={disabled} onChange={e => updateField(moduleIndex, fieldIndex, { options: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} helperText='Separate options with commas.' />}
              </Box>
            ))}
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}
