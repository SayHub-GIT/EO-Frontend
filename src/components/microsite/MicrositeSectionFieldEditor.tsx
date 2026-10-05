'use client'

import { useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
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
  onUploadAsset?: (file: File) => Promise<string>
}

const MicrositeSectionFieldEditor = ({
  field,
  value,
  error,
  disabled = false,
  onChange,
  onUploadAsset
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const supportsAssetUpload =
    field.inputType === 'url' &&
    field.target.endsWith('.assetUrl') &&
    Boolean(onUploadAsset)

  const uploadAsset = async (file: File) => {
    if (!onUploadAsset || uploading) return

    try {
      setUploading(true)
      setUploadError('')
      const url = await onUploadAsset(file)
      onChange(url)
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'Unable to upload image.'
      )
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

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

  const input = (
    <TextField
      fullWidth
      size='small'
      type={field.inputType === 'color' ? 'color' : isNumber ? 'number' : 'text'}
      label={field.label}
      value={value}
      disabled={disabled || uploading}
      multiline={isMultiline}
      minRows={isMultiline ? 4 : undefined}
      error={Boolean(error || uploadError)}
      helperText={
        error ||
        uploadError ||
        (field.maxLength ? `Maximum ${field.maxLength} characters` : undefined)
      }
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

  if (!supportsAssetUpload) return input

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {input}
      <input
        ref={fileInputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp,image/gif'
        hidden
        onChange={event => {
          const file = event.target.files?.[0]
          if (file) void uploadAsset(file)
        }}
      />
      <Button
        type='button'
        variant='outlined'
        size='small'
        disabled={disabled || uploading}
        startIcon={uploading ? <CircularProgress size={16} /> : <i className='tabler-upload' />}
        onClick={() => fileInputRef.current?.click()}
        sx={{ justifySelf: 'start', minHeight: 40 }}
      >
        {uploading ? 'Uploading...' : 'Upload image'}
      </Button>
    </Box>
  )
}

export default MicrositeSectionFieldEditor
