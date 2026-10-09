'use client'

import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { MicrositeTheme } from '@/lib/admin-microsites'

type Props = {
  theme: MicrositeTheme
  fonts: string[]
  disabled?: boolean
  onChange: (theme: MicrositeTheme) => void
}

const colorPattern = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/

const designPresets = [
  { key: 'studio', name: 'Studio Modern', label: 'Bersih & profesional', primaryColor: '#5548E8', secondaryColor: '#16A1A2', backgroundColor: '#F8F9FD', textColor: '#24213C', buttonRadius: 12 },
  { key: 'editorial', name: 'Editorial', label: 'Elegan & minimal', primaryColor: '#1E293B', secondaryColor: '#BC8F53', backgroundColor: '#FFFFFF', textColor: '#161D2B', buttonRadius: 5 },
  { key: 'midnight', name: 'Midnight', label: 'Kontras & premium', primaryColor: '#9482FF', secondaryColor: '#42D4CB', backgroundColor: '#151522', textColor: '#F6F5FF', buttonRadius: 14 },
  { key: 'festival', name: 'Festival', label: 'Berani & ekspresif', primaryColor: '#E65235', secondaryColor: '#4230AE', backgroundColor: '#FFF8F1', textColor: '#302821', buttonRadius: 18 }
] as const


const MicrositeThemeEditor = ({
  theme,
  fonts,
  disabled = false,
  onChange
}: Props) => {
  const update = <K extends keyof MicrositeTheme>(
    key: K,
    value: MicrositeTheme[K]
  ) => onChange({ ...theme, [key]: value })

  const colorField = (
    label: string,
    key: 'primaryColor' | 'secondaryColor' | 'backgroundColor' | 'textColor'
  ) => (
    <TextField
      label={label}
      value={theme[key]}
      onChange={event => update(key, event.target.value.toUpperCase())}
      error={!colorPattern.test(theme[key])}
      helperText={!colorPattern.test(theme[key]) ? 'Gunakan format #RRGGBB atau #RRGGBBAA.' : ' '}
      disabled={disabled}
      inputProps={{ maxLength: 9 }}
      fullWidth
    />
  )

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box>
        <Typography variant='subtitle1' fontWeight={750}>Gaya Website</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, lineHeight: 1.55 }}>
          Pilih palet siap pakai untuk mengubah desain draf secara langsung, lalu sesuaikan detail di bawahnya.
        </Typography>
      </Box>

      <Box role='group' aria-label='Pilihan gaya desain MicroSite' sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
        {designPresets.map(preset => {
          const active = theme.primaryColor.toUpperCase() === preset.primaryColor &&
            theme.backgroundColor.toUpperCase() === preset.backgroundColor &&
            theme.secondaryColor.toUpperCase() === preset.secondaryColor

          return (
            <Box
              key={preset.key}
              component='button'
              type='button'
              disabled={disabled}
              aria-pressed={active}
              aria-label={`Pilih gaya ${preset.name}`}
              onClick={() => onChange({
                ...theme,
                primaryColor: preset.primaryColor,
                secondaryColor: preset.secondaryColor,
                backgroundColor: preset.backgroundColor,
                textColor: preset.textColor,
                buttonRadius: preset.buttonRadius
              })}
              sx={{
                display: 'grid',
                textAlign: 'left',
                width: '100%',
                border: active ? '2px solid' : '1px solid',
                borderColor: active ? 'primary.main' : 'divider',
                borderRadius: 1.5,
                p: 0.75,
                gap: 0.75,
                bgcolor: 'background.paper',
                color: 'text.primary',
                cursor: disabled ? 'not-allowed' : 'pointer',
                font: 'inherit',
                opacity: disabled ? 0.6 : 1,
                '&:hover': !disabled ? { borderColor: 'primary.main', boxShadow: 2 } : undefined,
                '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                transition: 'box-shadow 140ms ease, border-color 140ms ease'
              }}
            >
              <Box
                aria-hidden='true'
                sx={{
                  position: 'relative',
                  height: 105,
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: preset.backgroundColor,
                  p: 1.25,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.75
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <Box sx={{ width: 15, height: 4, borderRadius: 1, bgcolor: preset.primaryColor }} />
                  <Box sx={{ width: 9, height: 4, borderRadius: 1, bgcolor: preset.secondaryColor }} />
                  <Box sx={{ ml: 'auto', width: 20, height: 3, borderRadius: 1, bgcolor: preset.textColor, opacity: 0.22 }} />
                </Box>
                <Box sx={{ mt: 1.15, width: '76%', height: 9, borderRadius: 0.25, bgcolor: preset.textColor, opacity: 0.9 }} />
                <Box sx={{ width: '54%', height: 5, borderRadius: 0.25, bgcolor: preset.textColor, opacity: 0.24 }} />
                <Box sx={{ width: '66%', height: 5, borderRadius: 0.25, bgcolor: preset.textColor, opacity: 0.18 }} />
                <Box sx={{ mt: 0.6, width: 52, height: 15, borderRadius: preset.buttonRadius / 6, bgcolor: preset.primaryColor }} />
                <Box sx={{ position: 'absolute', width: 43, height: 44, borderRadius: 1, right: 9, bottom: 11, bgcolor: preset.secondaryColor, opacity: 0.16 }} />
              </Box>
              <Typography variant='caption' fontWeight={750} sx={{ px: 0.4, lineHeight: 1.2 }}>{preset.name}</Typography>
              <Typography variant='caption' color='text.secondary' sx={{ px: 0.4, pb: 0.25, fontSize: 10 }}>{preset.label}</Typography>
            </Box>
          )
        })}
      </Box>

      <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.5 }}>
        Pengaturan khusus pada setiap bagian tetap dipertahankan. Palet ini hanya mengubah tema website, bukan versi publik.
      </Typography>

      <Box>
        <Typography variant='subtitle2' fontWeight={700}>Teks & Font</Typography>
        <Typography variant='caption' color='text.secondary'>
          Font ini menjadi tampilan dasar seluruh website. Setiap bagian tetap bisa disesuaikan.
        </Typography>
      </Box>

      <FormControl fullWidth>
        <InputLabel id='microsite-body-font-label'>Font isi</InputLabel>
        <Select
          labelId='microsite-body-font-label'
          label='Font isi'
          value={theme.fontFamily}
          onChange={event => update('fontFamily', String(event.target.value))}
          disabled={disabled}
        >
          {fonts.map(font => <MenuItem key={font} value={font}>{font}</MenuItem>)}
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel id='microsite-heading-font-label'>Font judul</InputLabel>
        <Select
          labelId='microsite-heading-font-label'
          label='Font judul'
          value={theme.headingFontFamily}
          onChange={event => update('headingFontFamily', String(event.target.value))}
          disabled={disabled}
        >
          {fonts.map(font => <MenuItem key={font} value={font}>{font}</MenuItem>)}
        </Select>
      </FormControl>

      <TextField
        label='Ukuran teks dasar'
        type='number'
        value={theme.baseFontSize}
        onChange={event => update('baseFontSize', Number(event.target.value))}
        inputProps={{ min: 12, max: 24 }}
        disabled={disabled}
        fullWidth
      />

      <Box sx={{ mt: 0.5 }}>
        <Typography variant='subtitle2' fontWeight={700}>Warna Website</Typography>
      </Box>

      {colorField('Warna utama', 'primaryColor')}
      {colorField('Warna pendamping', 'secondaryColor')}
      {colorField('Warna latar', 'backgroundColor')}
      {colorField('Warna teks', 'textColor')}

      <Box sx={{ mt: 0.5 }}>
        <Typography variant='subtitle2' fontWeight={700}>Tata Letak</Typography>
      </Box>

      <TextField
        label='Kelengkungan tombol'
        type='number'
        value={theme.buttonRadius}
        onChange={event => update('buttonRadius', Number(event.target.value))}
        inputProps={{ min: 0, max: 48 }}
        disabled={disabled}
        fullWidth
      />

      <TextField
        label='Lebar isi halaman'
        type='number'
        value={theme.containerWidth}
        onChange={event => update('containerWidth', Number(event.target.value))}
        inputProps={{ min: 720, max: 1600 }}
        disabled={disabled}
        helperText='Rentang yang diperbolehkan: 720–1600 px.'
        fullWidth
      />
    </Box>
  )
}

export default MicrositeThemeEditor
