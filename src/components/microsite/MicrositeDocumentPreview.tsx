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
  interactive?: boolean
  eventSlug?: string
}

type JsonObject = Record<string, unknown>

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asArray = (value: unknown): JsonObject[] =>
  Array.isArray(value) ? value.filter(isObject) : []

const textValue = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''

const firstText = (source: JsonObject, keys: string[]) => {
  for (const key of keys) {
    const value = textValue(source[key])
    if (value) return value
  }

  return ''
}

const formatDateTime = (value: unknown) => {
  const text = textValue(value)
  if (!text) return ''

  const date = new Date(text)
  return Number.isNaN(date.getTime())
    ? text
    : new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date)
}

const bindingObjects = (bindings: Record<string, unknown>) =>
  Object.values(bindings).filter(isObject)

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

  return content.replace(/{{event.([A-Za-z0-9_]+)}}/g, (_, field: string) => {
    for (const source of objects) {
      const value = source[field]

      if (typeof value === 'string' || typeof value === 'number') {
        return String(value)
      }
    }

    return ''
  })
}

const actionHref = (
  element: MicrositeElement,
  eventSlug?: string
) => {
  const type = element.actionType?.trim().toLowerCase() || 'none'
  const value = element.actionValue?.trim() ?? ''

  switch (type) {
    case 'registration':
      return eventSlug
        ? `/events/${encodeURIComponent(eventSlug)}/register`
        : null
    case 'anchor':
      return /^#[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value)
        ? value
        : null
    case 'internal':
      return value.startsWith('/') &&
        !value.startsWith('//') &&
        !value.includes('\\')
        ? value
        : null
    case 'external':
      try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
          ? value
          : null
      } catch {
        return null
      }
    case 'email':
      return value ? `mailto:${value}` : null
    case 'phone':
      return value ? `tel:${value.replace(/[^+0-9]/g, '')}` : null
    default:
      return null
  }
}

const ElementPreview = ({
  element,
  document,
  bindings,
  interactive,
  eventSlug
}: {
  element: MicrositeElement
  document: MicrositeDocument
  bindings: Record<string, unknown>
  interactive: boolean
  eventSlug?: string
}) => {
  const content = resolveText(element.content, bindings)
  const common = {
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
    const href = actionHref(element, eventSlug)
    const external = element.actionType === 'external'
    const buttonSx = {
      ...common,
      minHeight: 42,
      fontSize: element.style.fontSize || 15,
      fontWeight: element.style.fontWeight || 700,
      bgcolor:
        element.style.backgroundColor ||
        document.theme.primaryColor,
      '&:hover': {
        bgcolor:
          element.style.backgroundColor ||
          document.theme.primaryColor
      }
    }

    if (interactive && href) {
      return (
        <Button
          component='a'
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noreferrer noopener' : undefined}
          variant='contained'
          disableElevation
          sx={buttonSx}
        >
          {content}
        </Button>
      )
    }

    return (
      <Button
        component='span'
        tabIndex={-1}
        variant='contained'
        disableElevation
        sx={{ ...buttonSx, pointerEvents: 'none' }}
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
          mt: element.style.marginTop
            ? `${element.style.marginTop}px`
            : undefined,
          mb: element.style.marginBottom
            ? `${element.style.marginBottom}px`
            : undefined
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
          fontSize:
            element.style.fontSize ||
            document.theme.baseFontSize,
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

const DynamicBindingBlock = ({
  section,
  bindings,
  eventSlug,
  interactive
}: {
  section: MicrositeSection
  bindings: Record<string, unknown>
  eventSlug?: string
  interactive: boolean
}) => {
  if (section.type === 'agenda') {
    const items = asArray(bindings['event-agenda'])
    if (items.length === 0) return null

    return (
      <Box sx={{ display: 'grid', gap: 1.25 }}>
        {items.map((item, index) => {
          const title = firstText(item, ['title', 'name']) || `Agenda ${index + 1}`
          const time =
            firstText(item, ['time', 'startTime']) ||
            formatDateTime(item.startAtUtc ?? item.startAt)
          const end =
            firstText(item, ['endTime']) ||
            formatDateTime(item.endAtUtc ?? item.endAt)
          const location = firstText(item, ['location', 'room'])
          const description = firstText(item, ['description'])

          return (
            <Box
              key={textValue(item.id) || `agenda-${index}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '150px minmax(0, 1fr)' },
                gap: 2,
                py: 2,
                borderBottom: index < items.length - 1 ? '1px solid currentColor' : 'none',
                borderColor: 'divider'
              }}
            >
              <Typography variant='body2' fontWeight={700}>
                {[time, end].filter(Boolean).join(' – ') || 'Schedule'}
              </Typography>
              <Box>
                <Typography fontWeight={750}>{title}</Typography>
                {location && (
                  <Typography variant='body2' sx={{ opacity: 0.72, mt: 0.25 }}>
                    {location}
                  </Typography>
                )}
                {description && (
                  <Typography variant='body2' sx={{ opacity: 0.82, mt: 0.75, lineHeight: 1.65 }}>
                    {description}
                  </Typography>
                )}
              </Box>
            </Box>
          )
        })}
      </Box>
    )
  }

  if (section.type === 'speaker') {
    const items = asArray(bindings['event-speakers'])
    if (items.length === 0) return null

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(3, minmax(0, 1fr))'
          },
          gap: 2
        }}
      >
        {items.map((item, index) => {
          const name = firstText(item, ['name', 'fullName']) || `Speaker ${index + 1}`
          const role = firstText(item, ['title', 'position', 'role'])
          const company = firstText(item, ['company', 'organization'])
          const bio = firstText(item, ['bio', 'description'])
          const image = firstText(item, ['imageUrl', 'avatarUrl', 'photoUrl'])

          return (
            <Box
              key={textValue(item.id) || `speaker-${index}`}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'background.paper'
              }}
            >
              {image && (
                <Box
                  component='img'
                  src={image}
                  alt={name}
                  sx={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    display: 'block',
                    objectFit: 'cover'
                  }}
                />
              )}
              <Box sx={{ p: 2 }}>
                <Typography fontWeight={750}>{name}</Typography>
                {[role, company].filter(Boolean).length > 0 && (
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.25 }}>
                    {[role, company].filter(Boolean).join(' · ')}
                  </Typography>
                )}
                {bio && (
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 1, lineHeight: 1.6 }}>
                    {bio}
                  </Typography>
                )}
              </Box>
            </Box>
          )
        })}
      </Box>
    )
  }

  if (section.type === 'venue') {
    const venue = isObject(bindings['event-venue']) ? bindings['event-venue'] : null
    if (!venue) return null

    const location = firstText(venue, ['location'])
    const address = firstText(venue, ['venueAddress'])
    const mapsUrl = firstText(venue, ['mapsUrl'])

    if (!location && !address && !mapsUrl) return null

    return (
      <Box sx={{ display: 'grid', gap: 1 }}>
        {location && <Typography fontWeight={750}>{location}</Typography>}
        {address && <Typography sx={{ opacity: 0.82 }}>{address}</Typography>}
        {interactive && mapsUrl && (
          <Button
            component='a'
            href={mapsUrl}
            target='_blank'
            rel='noreferrer noopener'
            variant='outlined'
            sx={{ justifySelf: 'start', mt: 1 }}
          >
            Open map
          </Button>
        )}
      </Box>
    )
  }

  if (section.type === 'registration') {
    const registration =
      isObject(bindings['event-registration'])
        ? bindings['event-registration']
        : null

    if (!registration) return null

    const packages = asArray(registration.packages)
    const remaining = textValue(registration.remainingQuota)

    return (
      <Box sx={{ display: 'grid', gap: 2 }}>
        {remaining && (
          <Typography variant='body2' sx={{ opacity: 0.8 }}>
            Remaining event quota: {remaining}
          </Typography>
        )}

        {packages.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, minmax(0, 1fr))'
              },
              gap: 1.5
            }}
          >
            {packages.map((item, index) => (
              <Box
                key={textValue(item.id) || `package-${index}`}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.paper'
                }}
              >
                <Typography fontWeight={750}>
                  {firstText(item, ['name']) || `Option ${index + 1}`}
                </Typography>
                {textValue(item.price) && (
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                    Price: {Number(item.price).toLocaleString('id-ID')}
                  </Typography>
                )}
                {textValue(item.remainingQuota) && (
                  <Typography variant='caption' color='text.secondary'>
                    Remaining: {textValue(item.remainingQuota)}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}

        {interactive && eventSlug && (
          <Button
            component='a'
            href={`/events/${encodeURIComponent(eventSlug)}/register`}
            variant='contained'
            sx={{ justifySelf: 'start' }}
          >
            Register
          </Button>
        )}
      </Box>
    )
  }

  return null
}

const SectionPreview = ({
  section,
  document,
  bindings,
  interactive,
  eventSlug
}: {
  section: MicrositeSection
  document: MicrositeDocument
  bindings: Record<string, unknown>
  interactive: boolean
  eventSlug?: string
}) => {
  const isSponsor = section.type === 'sponsor'

  if (isSponsor) {
    const title = section.elements.find(element => element.id === 'sponsor-title')
    const sponsors = section.elements.filter(
      element => element.id !== 'sponsor-title' && element.type === 'image'
    )

    return (
      <Box
        component='section'
        id={section.id}
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
          textAlign: normalizeTextAlign(section.style.contentAlign),
          scrollMarginTop: 24
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: `${document.theme.containerWidth}px`,
            mx: 'auto',
            display: 'grid',
            gap: 3
          }}
        >
          {title && (
            <ElementPreview
              element={title}
              document={document}
              bindings={bindings}
              interactive={interactive}
              eventSlug={eventSlug}
            />
          )}

          {sponsors.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(3, minmax(0, 1fr))',
                  md: 'repeat(4, minmax(0, 1fr))'
                },
                gap: 2,
                alignItems: 'center'
              }}
            >
              {sponsors.map(element => {
                const href = actionHref(element, eventSlug)
                const logo = (
                  <Box
                    component='img'
                    src={element.assetUrl || undefined}
                    alt={element.altText || ''}
                    sx={{
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: 64,
                      objectFit: 'contain'
                    }}
                  />
                )
                const wrapperSx = {
                  minHeight: 96,
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                  bgcolor: 'background.paper',
                  textDecoration: 'none'
                } as const

                return interactive && href ? (
                  <Box
                    key={element.id}
                    component='a'
                    href={href}
                    target={element.actionType === 'external' ? '_blank' : undefined}
                    rel={element.actionType === 'external' ? 'noreferrer noopener' : undefined}
                    sx={wrapperSx}
                  >
                    {logo}
                  </Box>
                ) : (
                  <Box key={element.id} sx={wrapperSx}>
                    {logo}
                  </Box>
                )
              })}
            </Box>
          )}
        </Box>
      </Box>
    )
  }

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
          interactive={interactive}
          eventSlug={eventSlug}
        />
      ))}

      <DynamicBindingBlock
        section={section}
        bindings={bindings}
        interactive={interactive}
        eventSlug={eventSlug}
      />
    </Box>
  )

  const media = mediaElement ? (
    <Box sx={{ minWidth: 0, display: 'grid', alignItems: 'center' }}>
      <ElementPreview
        element={mediaElement}
        document={document}
        bindings={bindings}
        interactive={interactive}
        eventSlug={eventSlug}
      />
    </Box>
  ) : null

  return (
    <Box
      component='section'
      id={section.id}
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
          : normalizeTextAlign(section.style.contentAlign),
        scrollMarginTop: 24
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: `${document.theme.containerWidth}px`,
          mx: 'auto',
          display: split ? 'grid' : 'flex',
          gridTemplateColumns: split
            ? {
                xs: '1fr',
                md: 'minmax(0, 1fr) minmax(0, 1fr)'
              }
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
  dataBindings = {},
  interactive = false,
  eventSlug
}: Props) => (
  <Box
    sx={{
      width: '100%',
      minHeight: interactive ? '100dvh' : 480,
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
          interactive={interactive}
          eventSlug={eventSlug}
        />
      ))}
  </Box>
)

export default MicrositeDocumentPreview
