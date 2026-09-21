'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import {
  CORE_EVENT_MODULES,
  EVENT_MODULE_DEFINITIONS,
  createDefaultExperienceConfig,
  type EventExperienceConfig,
  type EventModuleKey,
  type ModularEventKind,
  type RegistrationFieldDefinition,
  type RegistrationFieldType
} from '@/lib/event-experience'

type Props = {
  kind: ModularEventKind
  value: EventExperienceConfig
  disabled?: boolean
  onChange: (value: EventExperienceConfig) => void
}

const fieldTypes: RegistrationFieldType[] = ['text', 'textarea', 'select', 'date', 'number']

const EventExperienceConfigurator = ({ kind, value, disabled = false, onChange }: Props) => {
  const enabled = new Set(value.enabledModules)

  const setModules = (modules: EventModuleKey[]) => {
    const next = Array.from(new Set([...CORE_EVENT_MODULES, ...modules]))
    onChange({ ...value, kind, enabledModules: next })
  }

  const toggleModule = (key: EventModuleKey) => {
    if (CORE_EVENT_MODULES.includes(key)) return
    setModules(enabled.has(key) ? value.enabledModules.filter(module => module !== key) : [...value.enabledModules, key])
  }

  const updateField = (index: number, patch: Partial<RegistrationFieldDefinition>) => {
    const fields = value.registrationFields.map((field, fieldIndex) =>
      fieldIndex === index ? { ...field, ...patch } : field
    )
    onChange({ ...value, kind, registrationFields: fields })
  }

  const moveField = (index: number, direction: -1 | 1) => {
    const destination = index + direction
    if (destination < 0 || destination >= value.registrationFields.length) return

    const fields = [...value.registrationFields]
    const [field] = fields.splice(index, 1)
    fields.splice(destination, 0, field)
    onChange({ ...value, kind, registrationFields: fields })
  }

  const removeField = (index: number) => {
    onChange({
      ...value,
      kind,
      registrationFields: value.registrationFields.filter((_, fieldIndex) => fieldIndex !== index)
    })
  }

  const addField = () => {
    const suffix = value.registrationFields.length + 1
    onChange({
      ...value,
      kind,
      registrationFields: [
        ...value.registrationFields,
        {
          key: `customField${suffix}`,
          label: `Custom Field ${suffix}`,
          type: 'text',
          required: false,
          options: []
        }
      ]
    })
  }

  const applyTemplate = () => onChange(createDefaultExperienceConfig(kind))

  return (
    <Box sx={{ display: 'grid', gap: 4 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          gap: 2,
          alignItems: { md: 'center' }
        }}
      >
        <Box>
          <Typography variant='h6' fontWeight={700}>Event modules</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            {kind} gives you a recommended starting template. Core operations stay enabled, while optional modules can be turned on or off per event.
          </Typography>
        </Box>
        <Button variant='outlined' disabled={disabled} onClick={applyTemplate} startIcon={<i className='tabler-template' />}>
          Reset to {kind} template
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 2 }}>
        {EVENT_MODULE_DEFINITIONS.map(module => {
          const isCore = Boolean(module.core)
          const isEnabled = enabled.has(module.key)
          const recommended = module.recommendedFor?.includes(kind)

          return (
            <Card key={module.key} variant='outlined' sx={{ height: '100%' }}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
                  <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: 'action.hover', display: 'grid', placeItems: 'center', color: 'primary.main' }}>
                    <i className={`${module.icon} text-xl`} />
                  </Box>
                  <Checkbox
                    checked={isEnabled}
                    disabled={disabled || isCore}
                    onChange={() => toggleModule(module.key)}
                    inputProps={{ 'aria-label': `Enable ${module.label}` }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Typography fontWeight={700}>{module.label}</Typography>
                  {isCore && <Chip size='small' label='Core' color='primary' variant='tonal' />}
                  {!isCore && recommended && <Chip size='small' label={`${kind} default`} variant='outlined' />}
                </Box>

                <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.65 }}>
                  {module.description}
                </Typography>
              </CardContent>
            </Card>
          )
        })}
      </Box>

      <Box>
        <Typography variant='h6' fontWeight={700}>Registration fields</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
          Full name, email, phone, package, and consent remain core fields. Extra fields are rendered in the exact order below; use the arrow buttons to change their hierarchy.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 2 }}>
        {value.registrationFields.map((field, index) => (
          <Card key={`${field.key}-${index}`} variant='outlined'>
            <CardContent sx={{ display: 'grid', gap: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Chip size='small' label={`#${index + 1}`} variant='outlined' />
                  <Typography variant='body2' fontWeight={650}>{field.label || 'Untitled field'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    size='small'
                    disabled={disabled || index === 0}
                    onClick={() => moveField(index, -1)}
                    aria-label={`Move ${field.label} up`}
                  >
                    <i className='tabler-arrow-up' />
                  </IconButton>
                  <IconButton
                    size='small'
                    disabled={disabled || index === value.registrationFields.length - 1}
                    onClick={() => moveField(index, 1)}
                    aria-label={`Move ${field.label} down`}
                  >
                    <i className='tabler-arrow-down' />
                  </IconButton>
                  <IconButton size='small' disabled={disabled} color='error' onClick={() => removeField(index)} aria-label={`Remove ${field.label}`}>
                    <i className='tabler-trash' />
                  </IconButton>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 180px' }, gap: 2, alignItems: 'start' }}>
                <TextField
                  label='Field label'
                  value={field.label}
                  disabled={disabled}
                  onChange={event => updateField(index, { label: event.target.value })}
                  inputProps={{ maxLength: 150 }}
                />
                <TextField
                  label='Field key'
                  value={field.key}
                  disabled={disabled}
                  onChange={event => updateField(index, { key: event.target.value.replace(/\s+/g, '') })}

                  inputProps={{ maxLength: 64 }}
                />
                <TextField
                  select
                  label='Type'
                  value={field.type}
                  disabled={disabled}
                  onChange={event => updateField(index, { type: event.target.value as RegistrationFieldType, options: event.target.value === 'select' ? field.options : [] })}
                >
                  {fieldTypes.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                </TextField>
              </Box>

              <FormControlLabel
                control={<Checkbox checked={field.required} disabled={disabled} onChange={event => updateField(index, { required: event.target.checked })} />}
                label='Required field'
              />

              {field.type === 'select' && (
                <TextField
                  label='Select options'
                  value={field.options.join(', ')}
                  disabled={disabled}
                  onChange={event => updateField(index, {
                    options: event.target.value.split(',').map(option => option.trim()).filter(Boolean)
                  })}
               
                  fullWidth
                />
              )}
            </CardContent>
          </Card>
        ))}

        {value.registrationFields.length === 0 && (
          <Card variant='outlined'>
            <CardContent sx={{ py: 4, textAlign: 'center' }}>
              <Typography fontWeight={600}>No extra registration fields</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                The registration form will only ask for the core participant and package information.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      <Button disabled={disabled} variant='outlined' onClick={addField} startIcon={<i className='tabler-plus' />} sx={{ justifySelf: 'start' }}>
        Add registration field
      </Button>
    </Box>
  )
}

export default EventExperienceConfigurator
