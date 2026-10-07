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
    <Box sx={{ display: 'grid', gap: 2 }}>
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
