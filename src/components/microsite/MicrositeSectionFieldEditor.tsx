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

const friendlyFieldLabels: Record<string, string> = {
  title: 'Judul',
  subtitle: 'Subjudul',
  description: 'Deskripsi singkat',
  primaryCtaLabel: 'Teks tombol utama',
  secondaryCtaLabel: 'Teks tombol kedua',
  primaryCtaAction: 'Aksi tombol utama',
  primaryCtaTarget: 'Tujuan tombol utama',
  secondaryCtaAction: 'Aksi tombol kedua',
  secondaryCtaTarget: 'Tujuan tombol kedua',
  body: 'Deskripsi',
  imageUrl: 'Gambar',
  imageAlt: 'Keterangan gambar',
  address: 'Alamat',
  buttonLabel: 'Teks tombol',
  backgroundColor: 'Warna latar',
  backgroundImageUrl: 'Gambar latar',
  textColor: 'Warna teks',
  paddingTop: 'Jarak atas',
  paddingBottom: 'Jarak bawah',
  contentAlign: 'Posisi isi',
  layoutPreset: 'Susunan'
}

const friendlyOptionLabels: Record<string, string> = {
  registration: 'Buka pendaftaran',
  anchor: 'Ke bagian lain di halaman',
  internal: 'Halaman lain di website',
  external: 'Website lain',
  email: 'Email',
  phone: 'Telepon',
  none: 'Tidak ada',
  stacked: 'Susunan biasa',
  'media-left': 'Gambar di kiri',
  'media-right': 'Gambar di kanan',
  centered: 'Rata tengah',
  left: 'Kiri',
  center: 'Tengah',
  right: 'Kanan'
}

const fieldLabel = (field: MicrositeSectionFieldDefinition) =>
  friendlyFieldLabels[field.key] ?? field.label

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
        error instanceof Error ? error.message : 'Gambar gagal diunggah.'
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
        label={fieldLabel(field)}
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
        label={fieldLabel(field)}
        value={String(value)}
        disabled={disabled}
        error={Boolean(error)}
        helperText={error || undefined}
        onChange={event => onChange(event.target.value)}
      >
        {field.options.map(option => (
          <MenuItem key={friendlyOptionLabels[option] ?? option} value={option}>
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
      label={fieldLabel(field)}
      value={value}
      disabled={disabled || uploading}
      multiline={isMultiline}
      minRows={isMultiline ? 4 : undefined}
      error={Boolean(error || uploadError)}
      helperText={
        error ||
        uploadError ||
        (field.maxLength ? `Maksimal ${field.maxLength} karakter` : undefined)
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
        {uploading ? 'Mengunggah...' : 'Unggah gambar'}
      </Button>
    </Box>
  )
}

export default MicrositeSectionFieldEditor
