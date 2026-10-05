'use client'

import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'

import type { MicrositeSectionFieldDefinition } from '@/lib/admin-microsites'
import type { MicrositeFieldValue } from '@/lib/microsite-editor'

type Props = {
  field: MicrositeSectionFieldDefinition
  value: MicrositeFieldValue
  error?: string | null
  disabled?: boolean
  onChange: (value: MicrositeFieldValue) => void
}

const MicrositeSectionFieldEditor = ({
  field,
  value,
  error,
  disabled = false,
  onChange
}: Props) => {
  if (field.inputType === 'toggle') {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={Boolean(value)}
            disabled={disabled}
            onChange={event => onChange(event.target.checked)}
          />
        }
        label={field.label}
        sx={{ mx: 0 }}
      />
    )
  }

  if (field.inputType === 'select') {
    return (
      <TextField
        select
        fullWidth
        size='small'
        label={field.label}
        value={String(value)}
        disabled={disabled}
        error={Boolean(error)}
        helperText={error || undefined}
        onChange={event => onChange(event.target.value)}
      >
        {field.options.map(option => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
    )
  }

  const isNumber = field.inputType === 'number'
  const isMultiline = field.inputType === 'textarea'

  return (
    <TextField
      fullWidth
      size='small'
      type={field.inputType === 'color' ? 'color' : isNumber ? 'number' : 'text'}
      label={field.label}
      value={value}
      disabled={disabled}
      multiline={isMultiline}
      minRows={isMultiline ? 4 : undefined}
      error={Boolean(error)}
      helperText={error || (field.maxLength ? `Maximum ${field.maxLength} characters` : undefined)}
      inputProps={{
        maxLength: field.maxLength ?? undefined,
        inputMode: isNumber ? 'numeric' : undefined
      }}
      onChange={event => {
        if (isNumber) {
          onChange(event.target.value === '' ? 0 : Number(event.target.value))
          return
        }

        onChange(event.target.value)
      }}
    />
  )
}

export default MicrositeSectionFieldEditor
