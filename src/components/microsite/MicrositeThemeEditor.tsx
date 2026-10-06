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
      helperText={!colorPattern.test(theme[key]) ? 'Use #RRGGBB or #RRGGBBAA.' : ' '}
      disabled={disabled}
      inputProps={{ maxLength: 9 }}
      fullWidth
    />
  )

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box>
        <Typography variant='subtitle2' fontWeight={700}>Typography</Typography>
        <Typography variant='caption' color='text.secondary'>
          Global defaults. Individual elements can still override these values.
        </Typography>
      </Box>

      <FormControl fullWidth>
        <InputLabel id='microsite-body-font-label'>Body font</InputLabel>
        <Select
          labelId='microsite-body-font-label'
          label='Body font'
          value={theme.fontFamily}
          onChange={event => update('fontFamily', String(event.target.value))}
          disabled={disabled}
        >
          {fonts.map(font => <MenuItem key={font} value={font}>{font}</MenuItem>)}
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel id='microsite-heading-font-label'>Heading font</InputLabel>
        <Select
          labelId='microsite-heading-font-label'
          label='Heading font'
          value={theme.headingFontFamily}
          onChange={event => update('headingFontFamily', String(event.target.value))}
          disabled={disabled}
        >
          {fonts.map(font => <MenuItem key={font} value={font}>{font}</MenuItem>)}
        </Select>
      </FormControl>

      <TextField
        label='Base font size'
        type='number'
        value={theme.baseFontSize}
        onChange={event => update('baseFontSize', Number(event.target.value))}
        inputProps={{ min: 12, max: 24 }}
        disabled={disabled}
        fullWidth
      />

      <Box sx={{ mt: 0.5 }}>
        <Typography variant='subtitle2' fontWeight={700}>Colors</Typography>
      </Box>

      {colorField('Primary color', 'primaryColor')}
      {colorField('Secondary color', 'secondaryColor')}
      {colorField('Background color', 'backgroundColor')}
      {colorField('Text color', 'textColor')}

      <Box sx={{ mt: 0.5 }}>
        <Typography variant='subtitle2' fontWeight={700}>Layout</Typography>
      </Box>

      <TextField
        label='Button radius'
        type='number'
        value={theme.buttonRadius}
        onChange={event => update('buttonRadius', Number(event.target.value))}
        inputProps={{ min: 0, max: 48 }}
        disabled={disabled}
        fullWidth
      />

      <TextField
        label='Container width'
        type='number'
        value={theme.containerWidth}
        onChange={event => update('containerWidth', Number(event.target.value))}
        inputProps={{ min: 720, max: 1600 }}
        disabled={disabled}
        helperText='Allowed range: 720-1600px.'
        fullWidth
      />
    </Box>
  )
}

export default MicrositeThemeEditor
