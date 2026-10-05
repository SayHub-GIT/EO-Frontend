'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

import type {
  MicrositeDocument,
  MicrositeElement,
  MicrositeSection
} from '@/lib/admin-microsites'

type Props = {
  document: MicrositeDocument
  dataBindings?: Record<string, unknown>
}

const bindingObjects = (bindings: Record<string, unknown>) =>
  Object.values(bindings).filter(
    (value): value is Record<string, unknown> =>
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
  )

const normalizeTextAlign = (
  value?: string | null
): 'left' | 'center' | 'right' | 'justify' | undefined => {
  switch (value) {
    case 'left':
    case 'center':
    case 'right':
    case 'justify':
      return value
    default:
      return undefined
  }
}

const resolveText = (
  content: string | null | undefined,
  bindings: Record<string, unknown>
) => {
  if (!content) return ''

  const objects = bindingObjects(bindings)

  return content.replace(/\{\{event\.([A-Za-z0-9_]+)\}\}/g, (_, field: string) => {
    for (const source of objects) {
      const value = source[field]

      if (typeof value === 'string' || typeof value === 'number') {
        return String(value)
      }
    }

    return ''
  })
}

const ElementPreview = ({
  element,
  document,
  bindings
}: {
  element: MicrositeElement
  document: MicrositeDocument
  bindings: Record<string, unknown>
}) => {
  const content = resolveText(element.content, bindings)
  const common: SxProps<Theme> = {
    fontFamily: element.style.fontFamily || document.theme.fontFamily,
    color: element.style.textColor || 'inherit',
    bgcolor: element.style.backgroundColor || 'transparent',
    borderRadius: element.style.borderRadius
      ? `${element.style.borderRadius}px`
      : undefined,
    px: element.style.paddingX ? `${element.style.paddingX}px` : undefined,
    py: element.style.paddingY ? `${element.style.paddingY}px` : undefined,
    mt: element.style.marginTop ? `${element.style.marginTop}px` : undefined,
    mb: element.style.marginBottom ? `${element.style.marginBottom}px` : undefined,
    width: element.style.widthPercent
      ? `${element.style.widthPercent}%`
      : undefined,
    textAlign: normalizeTextAlign(element.style.textAlign)
  }

  if (element.type === 'heading') {
    return (
      <Typography
        component='div'
        sx={[
          common,
          {
          fontFamily:
            element.style.fontFamily ||
            document.theme.headingFontFamily,
          fontSize: element.style.fontSize || 36,
          fontWeight: element.style.fontWeight || 700,
          lineHeight: element.style.lineHeight || 1.2,
          letterSpacing: element.style.letterSpacing || undefined
          }
        ]}
      >
        {content}
      </Typography>
    )
  }

  if (element.type === 'button') {
    return (
      <Button
        component='span'
        variant='contained'
        disableElevation
        tabIndex={-1}
        sx={[
          common,
          {
          pointerEvents: 'none',
          minHeight: 42,
          fontSize: element.style.fontSize || 15,
          fontWeight: element.style.fontWeight || 700,
          bgcolor: element.style.backgroundColor || document.theme.primaryColor,
          '&:hover': {
            bgcolor: element.style.backgroundColor || document.theme.primaryColor
          }
          }
        ]}
      >
        {content}
      </Button>
    )
  }

  if (element.type === 'image' && element.assetUrl) {
    return (
      <Box
        component='img'
        src={element.assetUrl}
        alt={element.altText || ''}
        sx={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto',
          borderRadius: element.style.borderRadius
            ? `${element.style.borderRadius}px`
            : undefined,
          mt: element.style.marginTop ? `${element.style.marginTop}px` : undefined,
          mb: element.style.marginBottom ? `${element.style.marginBottom}px` : undefined
        }}
      />
    )
  }

  if (element.type === 'divider') {
    return <Divider sx={{ my: 2 }} />
  }

  if (element.type === 'spacer') {
    return <Box sx={{ minHeight: element.style.marginBottom || 24 }} />
  }

  if (element.type === 'badge') {
    return (
      <Box
        component='span'
        sx={[
          common,
          {
          display: 'inline-block',
          px: 1.25,
          py: 0.5,
          border: '1px solid currentColor',
          fontSize: element.style.fontSize || 12,
          fontWeight: element.style.fontWeight || 600
          }
        ]}
      >
        {content}
      </Box>
    )
  }

  if (!content) return null

  return (
    <Typography
      component='div'
      sx={[
        common,
        {
        fontSize: element.style.fontSize || document.theme.baseFontSize,
        fontWeight: element.style.fontWeight || 400,
        lineHeight: element.style.lineHeight || 1.6,
        letterSpacing: element.style.letterSpacing || undefined,
        whiteSpace: 'pre-wrap'
        }
      ]}
    >
      {content}
    </Typography>
  )
}

const SectionPreview = ({
  section,
  document,
  bindings
}: {
  section: MicrositeSection
  document: MicrositeDocument
  bindings: Record<string, unknown>
}) => {
  const isAbout = section.type === 'about'
  const mediaElement = isAbout
    ? section.elements.find(
        element => element.type === 'image' && Boolean(element.assetUrl)
      )
    : undefined
  const contentElements = mediaElement
    ? section.elements.filter(element => element.id !== mediaElement.id)
    : section.elements
  const preset = section.style.layoutPreset || 'stacked'
  const split =
    isAbout &&
    Boolean(mediaElement) &&
    (preset === 'media-left' || preset === 'media-right')
  const centered = isAbout && preset === 'centered'

  const content = (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        alignContent: 'center',
        minWidth: 0
      }}
    >
      {contentElements.map(element => (
        <ElementPreview
          key={element.id}
          element={element}
          document={document}
          bindings={bindings}
        />
      ))}
    </Box>
  )

  const media = mediaElement ? (
    <Box
      sx={{
        minWidth: 0,
        display: 'grid',
        alignItems: 'center'
      }}
    >
      <ElementPreview
        element={mediaElement}
        document={document}
        bindings={bindings}
      />
    </Box>
  ) : null

  return (
    <Box
      component='section'
      sx={{
        position: 'relative',
        px: { xs: 2.5, sm: 4 },
        pt: `${section.style.paddingTop}px`,
        pb: `${section.style.paddingBottom}px`,
        bgcolor:
          section.style.backgroundColor ||
          document.theme.backgroundColor,
        color:
          section.style.textColor ||
          document.theme.textColor,
        backgroundImage: section.style.backgroundImageUrl
          ? `url("${section.style.backgroundImageUrl}")`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        textAlign: centered
          ? 'center'
          : normalizeTextAlign(section.style.contentAlign)
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: `${document.theme.containerWidth}px`,
          mx: 'auto',
          display: split ? 'grid' : 'flex',
          gridTemplateColumns: split
            ? { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' }
            : undefined,
          flexDirection: split
            ? undefined
            : preset === 'media-right'
              ? 'column-reverse'
              : 'column',
          gap: split ? { xs: 3, md: 5 } : 2,
          alignItems: centered ? 'center' : 'stretch'
        }}
      >
        {split ? (
          preset === 'media-left' ? (
            <>
              {media}
              {content}
            </>
          ) : (
            <>
              {content}
              {media}
            </>
          )
        ) : (
          <>
            {content}
            {media}
          </>
        )}
      </Box>
    </Box>
  )
}

const MicrositeDocumentPreview = ({
  document,
  dataBindings = {}
}: Props) => (
  <Box
    sx={{
      width: '100%',
      minHeight: 480,
      bgcolor: document.theme.backgroundColor,
      color: document.theme.textColor,
      fontFamily: document.theme.fontFamily,
      overflow: 'hidden'
    }}
  >
    {document.sections
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter(section => section.visible)
      .map(section => (
        <SectionPreview
          key={section.id}
          section={section}
          document={document}
          bindings={dataBindings}
        />
      ))}
  </Box>
)

export default MicrositeDocumentPreview
