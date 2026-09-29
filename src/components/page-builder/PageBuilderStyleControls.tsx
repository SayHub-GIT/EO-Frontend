'use client'

import Box from '@mui/material/Box'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type {
  SiteBackgroundPosition,
  SiteBackgroundSize,
  SiteBodySize,
  SiteImageFit,
  SiteImagePosition,
  SitePageDefinition,
  SitePageSection,
  SiteSectionShadow,
  SiteTitleSize
} from '@/lib/site-page-builder'

const backgroundSizes: SiteBackgroundSize[] = ['cover', 'contain', 'auto']
const backgroundPositions: SiteBackgroundPosition[] = ['center', 'top', 'bottom', 'left', 'right']
const imagePositions: SiteImagePosition[] = ['left', 'right', 'top', 'bottom']
const imageFits: SiteImageFit[] = ['cover', 'contain']
const titleSizes: SiteTitleSize[] = ['small', 'medium', 'large', 'xlarge']
const bodySizes: SiteBodySize[] = ['small', 'medium', 'large']
const shadows: SiteSectionShadow[] = ['none', 'soft', 'medium', 'strong']

type PageStyleProps = {
  page: SitePageDefinition
  disabled?: boolean
  onChange: (patch: Partial<SitePageDefinition>) => void
}

export const PageStyleControls = ({ page, disabled = false, onChange }: PageStyleProps) => (
  <Box sx={{ display: 'grid', gap: 2.5 }}>
    <Typography variant='subtitle2' color='text.secondary'>
      Page canvas styling
    </Typography>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.6fr 1fr 1fr 1fr' }, gap: 2 }}>
      <TextField
        label='Page background color'
        placeholder='#ffffff'
        value={page.backgroundColor ?? ''}
        disabled={disabled}
        onChange={event => onChange({ backgroundColor: event.target.value })}
      />
      <TextField
        label='Page background image URL'
        placeholder='https://...'
        value={page.backgroundImageUrl ?? ''}
        disabled={disabled}
        onChange={event => onChange({ backgroundImageUrl: event.target.value })}
      />
      <TextField
        select
        label='Background size'
        value={page.backgroundSize ?? 'cover'}
        disabled={disabled}
        onChange={event => onChange({ backgroundSize: event.target.value as SiteBackgroundSize })}
      >
        {backgroundSizes.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
      </TextField>
      <TextField
        select
        label='Background position'
        value={page.backgroundPosition ?? 'center'}
        disabled={disabled}
        onChange={event => onChange({ backgroundPosition: event.target.value as SiteBackgroundPosition })}
      >
        {backgroundPositions.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
      </TextField>
      <TextField
        label='Content max width'
        type='number'
        value={page.maxWidth}
        disabled={disabled}
        inputProps={{ min: 480, max: 1800 }}
        onChange={event => onChange({ maxWidth: Number(event.target.value) || 1180 })}
      />
    </Box>

    <Box
      sx={{
        p: 2.25,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        display: 'grid',
        gap: 2
      }}
    >
      <FormControlLabel
        control={
          <Switch
            checked={page.styleDefaultContent === true}
            disabled={disabled || page.showDefaultContent === false}
            onChange={event => onChange({ styleDefaultContent: event.target.checked })}
          />
        }
        label='Style built-in content'
      />

      <Typography variant='body2' color='text.secondary'>
        When enabled, the existing page content is wrapped by the same Page Builder style system without replacing its functionality.
      </Typography>

      {page.styleDefaultContent && page.showDefaultContent !== false && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            <TextField
              label='Built-in background'
              placeholder='#ffffff'
              value={page.defaultContentBackgroundColor ?? ''}
              disabled={disabled}
              onChange={event => onChange({ defaultContentBackgroundColor: event.target.value })}
            />
            <TextField
              label='Built-in text color'
              placeholder='#111111'
              value={page.defaultContentTextColor ?? ''}
              disabled={disabled}
              onChange={event => onChange({ defaultContentTextColor: event.target.value })}
            />
            <TextField
              select
              label='Built-in shadow'
              value={page.defaultContentShadow ?? 'none'}
              disabled={disabled}
              onChange={event => onChange({ defaultContentShadow: event.target.value as SiteSectionShadow })}
            >
              {shadows.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3,1fr)' }, gap: 2 }}>
            <TextField
              label='Built-in padding X'
              type='number'
              value={page.defaultContentPaddingX ?? 0}
              disabled={disabled}
              inputProps={{ min: 0, max: 160 }}
              onChange={event => onChange({ defaultContentPaddingX: Number(event.target.value) || 0 })}
            />
            <TextField
              label='Built-in padding Y'
              type='number'
              value={page.defaultContentPaddingY ?? 0}
              disabled={disabled}
              inputProps={{ min: 0, max: 200 }}
              onChange={event => onChange({ defaultContentPaddingY: Number(event.target.value) || 0 })}
            />
            <TextField
              label='Built-in radius'
              type='number'
              value={page.defaultContentBorderRadius ?? 0}
              disabled={disabled}
              inputProps={{ min: 0, max: 100 }}
              onChange={event => onChange({ defaultContentBorderRadius: Number(event.target.value) || 0 })}
            />
          </Box>
        </>
      )}
    </Box>
  </Box>
)

type SectionStyleProps = {
  section: SitePageSection
  disabled?: boolean
  onChange: (patch: Partial<SitePageSection>) => void
}

export const SectionStyleControls = ({
  section,
  disabled = false,
  onChange
}: SectionStyleProps) => (
  <Box sx={{ display: 'grid', gap: 2 }}>
    <Typography variant='subtitle2' color='text.secondary'>
      Design & styling
    </Typography>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4,1fr)' }, gap: 2 }}>
      <TextField
        label='Background'
        placeholder='#ffffff'
        value={section.backgroundColor ?? ''}
        disabled={disabled}
        onChange={event => onChange({ backgroundColor: event.target.value })}
      />
      <TextField
        label='Text color'
        placeholder='#111111'
        value={section.textColor ?? ''}
        disabled={disabled}
        onChange={event => onChange({ textColor: event.target.value })}
      />
      <TextField
        label='Accent'
        placeholder='#0066ff'
        value={section.accentColor ?? ''}
        disabled={disabled}
        onChange={event => onChange({ accentColor: event.target.value })}
      />
      <TextField
        label='Border color'
        placeholder='#d9d9d9'
        value={section.borderColor ?? ''}
        disabled={disabled}
        onChange={event => onChange({ borderColor: event.target.value })}
      />
    </Box>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr repeat(4,1fr)' }, gap: 2 }}>
      <TextField
        label='Section background image URL'
        placeholder='https://...'
        value={section.backgroundImageUrl ?? ''}
        disabled={disabled}
        onChange={event => onChange({ backgroundImageUrl: event.target.value })}
      />
      <TextField
        select
        label='Background size'
        value={section.backgroundSize ?? 'cover'}
        disabled={disabled}
        onChange={event => onChange({ backgroundSize: event.target.value as SiteBackgroundSize })}
      >
        {backgroundSizes.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
      </TextField>
      <TextField
        select
        label='Background position'
        value={section.backgroundPosition ?? 'center'}
        disabled={disabled}
        onChange={event => onChange({ backgroundPosition: event.target.value as SiteBackgroundPosition })}
      >
        {backgroundPositions.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
      </TextField>
      <TextField
        select
        label='Shadow'
        value={section.shadow ?? 'none'}
        disabled={disabled}
        onChange={event => onChange({ shadow: event.target.value as SiteSectionShadow })}
      >
        {shadows.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
      </TextField>
      <TextField
        label='Border width'
        type='number'
        value={section.borderWidth ?? 0}
        disabled={disabled}
        inputProps={{ min: 0, max: 8 }}
        onChange={event => onChange({ borderWidth: Number(event.target.value) || 0 })}
      />
    </Box>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 2 }}>
      <TextField
        select
        label='Image position'
        value={section.imagePosition ?? 'right'}
        disabled={disabled}
        onChange={event => onChange({ imagePosition: event.target.value as SiteImagePosition })}
      >
        {imagePositions.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
      </TextField>
      <TextField
        select
        label='Image fit'
        value={section.imageFit ?? 'cover'}
        disabled={disabled}
        onChange={event => onChange({ imageFit: event.target.value as SiteImageFit })}
      >
        {imageFits.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
      </TextField>
      <TextField
        select
        label='Title size'
        value={section.titleSize ?? 'large'}
        disabled={disabled}
        onChange={event => onChange({ titleSize: event.target.value as SiteTitleSize })}
      >
        {titleSizes.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
      </TextField>
      <TextField
        select
        label='Body size'
        value={section.bodySize ?? 'medium'}
        disabled={disabled}
        onChange={event => onChange({ bodySize: event.target.value as SiteBodySize })}
      >
        {bodySizes.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
      </TextField>
    </Box>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(6,1fr)' }, gap: 2 }}>
      <TextField
        label='Padding X'
        type='number'
        value={section.paddingX ?? 24}
        disabled={disabled}
        inputProps={{ min: 0, max: 160 }}
        onChange={event => onChange({ paddingX: Number(event.target.value) || 0 })}
      />
      <TextField
        label='Padding Y'
        type='number'
        value={section.paddingY}
        disabled={disabled}
        inputProps={{ min: 0, max: 200 }}
        onChange={event => onChange({ paddingY: Number(event.target.value) || 0 })}
      />
      <TextField
        label='Content gap'
        type='number'
        value={section.gap ?? 24}
        disabled={disabled}
        inputProps={{ min: 0, max: 160 }}
        onChange={event => onChange({ gap: Number(event.target.value) || 0 })}
      />
      <TextField
        label='Min height'
        type='number'
        value={section.minHeight ?? 0}
        disabled={disabled}
        inputProps={{ min: 0, max: 1200 }}
        onChange={event => onChange({ minHeight: Number(event.target.value) || 0 })}
      />
      <TextField
        label='Content width'
        type='number'
        value={section.contentMaxWidth ?? 0}
        disabled={disabled}
        helperText='0 = inherit'
        inputProps={{ min: 0, max: 1800 }}
        onChange={event => onChange({ contentMaxWidth: Number(event.target.value) || 0 })}
      />
      <TextField
        label='Radius'
        type='number'
        value={section.borderRadius}
        disabled={disabled}
        inputProps={{ min: 0, max: 100 }}
        onChange={event => onChange({ borderRadius: Number(event.target.value) || 0 })}
      />
    </Box>
  </Box>
)
