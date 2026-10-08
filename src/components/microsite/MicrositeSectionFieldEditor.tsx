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
  paddingX: 'Jarak kiri & kanan',
  contentGap: 'Jarak antar isi',
  minHeight: 'Tinggi minimum bagian',
  mediaWidthPercent: 'Lebar gambar / media (%)',
  mediaRadius: 'Kelengkungan sudut gambar',
  backgroundOverlayOpacity: 'Gelapkan gambar latar (%)',
  backgroundSize: 'Ukuran gambar latar',
  backgroundPosition: 'Posisi gambar latar',
  titleSize: 'Ukuran judul',
  titleWeight: 'Ketebalan judul',
  subtitleSize: 'Ukuran subjudul',
  descriptionSize: 'Ukuran deskripsi',
  primaryButtonColor: 'Warna tombol utama',
  primaryButtonRadius: 'Kelengkungan tombol utama',
  primaryButtonPaddingX: 'Lebar isi tombol utama',
  primaryButtonPaddingY: 'Tinggi isi tombol utama',
  secondaryButtonColor: 'Warna tombol kedua',
  secondaryButtonRadius: 'Kelengkungan tombol kedua',
  bodySize: 'Ukuran teks isi',
  imageRadius: 'Kelengkungan sudut gambar',
  imageWidth: 'Lebar gambar (%)',
  buttonColor: 'Warna tombol',
  buttonRadius: 'Kelengkungan tombol',
  contentAlign: 'Posisi isi',
  layoutPreset: 'Susunan',
  agendaLayout: 'Tampilan agenda',
  agendaShowLocation: 'Tampilkan lokasi tiap sesi',
  agendaShowDescription: 'Tampilkan deskripsi tiap sesi',
  sectionName: 'Nama bagian',
  visible: 'Tampilkan bagian ini'
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
  timeline: 'Daftar waktu (Timeline)',
  cards: 'Kartu agenda (Cards)',
  'media-left': 'Gambar di kiri',
  'media-right': 'Gambar di kanan',
  centered: 'Rata tengah',
  left: 'Kiri',
  center: 'Tengah',
  right: 'Kanan',
  cover: 'Penuhi area',
  contain: 'Tampilkan seluruh gambar',
  auto: 'Ukuran asli',
  top: 'Atas',
  bottom: 'Bawah',
  '400': 'Normal',
  '500': 'Medium',
  '600': 'Semi Bold',
  '700': 'Bold',
  '800': 'Extra Bold',
  '900': 'Black'
}

const fieldLabel = (field: MicrositeSectionFieldDefinition) =>
  friendlyFieldLabels[field.key] ?? field.label


const numberLimits: Record<string, { min: number; max: number; suffix?: string }> = {
  paddingTop: { min: 0, max: 240, suffix: 'px' },
  paddingBottom: { min: 0, max: 240, suffix: 'px' },
  paddingX: { min: 0, max: 160, suffix: 'px' },
  contentGap: { min: 0, max: 96, suffix: 'px' },
  minHeight: { min: 0, max: 1200, suffix: 'px' },
  mediaWidthPercent: { min: 25, max: 75, suffix: '%' },
  mediaRadius: { min: 0, max: 64, suffix: 'px' },
  backgroundOverlayOpacity: { min: 0, max: 90, suffix: '%' },
  titleSize: { min: 10, max: 160, suffix: 'px' },
  titleWeight: { min: 100, max: 900 },
  subtitleSize: { min: 10, max: 160, suffix: 'px' },
  descriptionSize: { min: 10, max: 160, suffix: 'px' },
  primaryButtonRadius: { min: 0, max: 64, suffix: 'px' },
  primaryButtonPaddingX: { min: 0, max: 160, suffix: 'px' },
  primaryButtonPaddingY: { min: 0, max: 160, suffix: 'px' },
  secondaryButtonRadius: { min: 0, max: 64, suffix: 'px' },
  bodySize: { min: 10, max: 160, suffix: 'px' },
  imageRadius: { min: 0, max: 64, suffix: 'px' },
  imageWidth: { min: 10, max: 100, suffix: '%' },
  buttonRadius: { min: 0, max: 64, suffix: 'px' }
}

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
    (
      field.target.endsWith('.assetUrl') ||
      field.target === 'section.style.backgroundImageUrl'
    ) &&
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
          <MenuItem key={option} value={option}>
            {friendlyOptionLabels[option] ?? option}
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
        (field.maxLength
          ? `Maksimal ${field.maxLength} karakter`
          : isNumber && numberLimits[field.key]
            ? `${numberLimits[field.key].min}–${numberLimits[field.key].max}${numberLimits[field.key].suffix ? ` ${numberLimits[field.key].suffix}` : ''}`
            : undefined)
      }
      inputProps={{
        maxLength: field.maxLength ?? undefined,
        inputMode: isNumber ? 'numeric' : undefined,
        min: isNumber ? numberLimits[field.key]?.min : undefined,
        max: isNumber ? numberLimits[field.key]?.max : undefined
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
