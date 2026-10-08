'use client'

import { useEffect, useRef } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
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
  presentation?: 'preview' | 'public'
  activeSectionId?: string
  templateKey?: string
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

const formatEventDateRange = (source: JsonObject | null) => {
  if (!source) return ''

  const startText = textValue(source.startAtUtc ?? source.startAt)
  const endText = textValue(source.endAtUtc ?? source.endAt)
  if (!startText) return ''

  const start = new Date(startText)
  const end = endText ? new Date(endText) : null

  if (Number.isNaN(start.getTime())) return startText

  const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })

  if (!end || Number.isNaN(end.getTime()) || start.toDateString() === end.toDateString()) {
    return dateFormatter.format(start)
  }

  return `${dateFormatter.format(start)} – ${dateFormatter.format(end)}`
}

const previewFocusSx = (
  active: boolean,
  dimmed: boolean
) => ({
  transition: 'opacity 160ms ease, filter 160ms ease, box-shadow 160ms ease, outline-color 160ms ease',
  opacity: dimmed ? 0.48 : 1,
  filter: dimmed ? 'saturate(.58)' : 'none',
  outline: active ? '4px solid #00A7E1' : '4px solid transparent',
  outlineOffset: '-4px',
  boxShadow: active
    ? '0 0 0 5px rgba(0, 167, 225, 0.22), inset 0 0 0 1px rgba(255,255,255,.7)'
    : undefined,
  '&::after': active
    ? {
        content: 'attr(data-editor-label)',
        position: 'absolute',
        top: 12,
        left: 12,
        px: 1.25,
        py: 0.7,
        borderRadius: 1,
        bgcolor: '#0073C7',
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 850,
        lineHeight: 1.2,
        letterSpacing: '.02em',
        zIndex: 4,
        boxShadow: '0 5px 18px rgba(0,0,0,.18)',
        pointerEvents: 'none'
      }
    : undefined
})

const sectionSurfaceSx = (
  section: MicrositeSection,
  document: MicrositeDocument,
  active: boolean,
  dimmed: boolean,
  defaultEventDesign: boolean
) => {
  const horizontal = section.style.paddingX ?? 32
  const overlay = section.style.backgroundOverlayOpacity ?? 0
  const hasBackgroundImage = Boolean(section.style.backgroundImageUrl)

  return {
    position: 'relative' as const,
    minHeight:
      (section.style.minHeight ?? 0) > 0
        ? `${section.style.minHeight}px`
        : undefined,
    px: {
      xs: `${Math.min(horizontal, 24)}px`,
      sm: `${horizontal}px`
    },
    pt: `${section.style.paddingTop}px`,
    pb: `${section.style.paddingBottom}px`,
    bgcolor:
      section.style.backgroundColor ||
      document.theme.backgroundColor,
    color:
      section.style.textColor ||
      document.theme.textColor,
    backgroundImage: hasBackgroundImage
      ? `url("${section.style.backgroundImageUrl}")`
      : undefined,
    backgroundSize: section.style.backgroundSize || 'cover',
    backgroundPosition: section.style.backgroundPosition || 'center',
    backgroundRepeat: 'no-repeat',
    borderBottom:
      defaultEventDesign && section.type === 'hero'
        ? '1px solid'
        : undefined,
    borderColor: 'divider',
    scrollMarginTop: 24,
    '&::before':
      hasBackgroundImage && overlay > 0
        ? {
            content: '""',
            position: 'absolute',
            inset: 0,
            bgcolor: `rgba(0,0,0,${overlay / 100})`,
            zIndex: 0,
            pointerEvents: 'none'
          }
        : undefined,
    '& > *': {
      position: 'relative',
      zIndex: 1
    },
    ...previewFocusSx(active, dimmed)
  }
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
          width: element.style.widthPercent
            ? `${element.style.widthPercent}%`
            : '100%',
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
  interactive,
  presentation,
  defaultEventDesign
}: {
  section: MicrositeSection
  bindings: Record<string, unknown>
  eventSlug?: string
  interactive: boolean
  presentation: 'preview' | 'public'
  defaultEventDesign: boolean
}) => {
  const publicPresentation = presentation === 'public'
  if (section.type === 'agenda') {
    const items = asArray(bindings['event-agenda'])
    const cards = section.style.agendaLayout === 'cards'
    const showLocation = section.style.agendaShowLocation ?? true
    const showDescription = section.style.agendaShowDescription ?? true

    if (items.length === 0) {
      return presentation === 'preview' ? (
        <Box
          sx={{
            p: 3,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1.5,
            bgcolor: 'action.hover'
          }}
        >
          <Typography fontWeight={700}>Belum ada agenda event</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, lineHeight: 1.6 }}>
            Tambahkan sesi di modul Agenda pada Event. Jadwal akan muncul otomatis di sini.
          </Typography>
        </Box>
      ) : null
    }

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: cards
            ? 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))'
            : '1fr',
          gap: cards ? 2 : 1.25,
          minWidth: 0
        }}
      >
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
          const schedule = [time, end].filter(Boolean).join(' – ') || 'Waktu belum ditentukan'

          return cards ? (
            <Box
              key={textValue(item.id) || `agenda-${index}`}
              sx={{
                minWidth: 0,
                p: { xs: 2.25, md: 2.75 },
                display: 'grid',
                gap: 1.25,
                alignContent: 'start',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper'
              }}
            >
              <Typography
                variant='caption'
                sx={{ opacity: 0.8, fontWeight: 800, letterSpacing: '.015em' }}
              >
                {schedule}
              </Typography>
              <Typography fontWeight={750} sx={{ lineHeight: 1.4, overflowWrap: 'anywhere' }}>
                {title}
              </Typography>
              {showLocation && location && (
                <Typography variant='body2' sx={{ opacity: 0.72 }}>
                  {location}
                </Typography>
              )}
              {showDescription && description && (
                <Typography variant='body2' sx={{ opacity: 0.82, lineHeight: 1.65 }}>
                  {description}
                </Typography>
              )}
            </Box>
          ) : (
            <Box
              key={textValue(item.id) || `agenda-${index}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '150px minmax(0,1fr)' },
                gap: 2,
                minWidth: 0,
                py: 2,
                borderBottom: index < items.length - 1 ? '1px solid currentColor' : 'none',
                borderColor: 'divider'
              }}
            >
              <Typography variant='body2' fontWeight={700}>
                {schedule}
              </Typography>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={750} sx={{ overflowWrap: 'anywhere' }}>{title}</Typography>
                {showLocation && location && (
                  <Typography variant='body2' sx={{ opacity: 0.72, mt: 0.25 }}>
                    {location}
                  </Typography>
                )}
                {showDescription && description && (
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
    const listLayout = section.style.speakerLayout === 'list'
    const showPhoto = section.style.speakerShowPhoto ?? true
    const showRole = section.style.speakerShowRole ?? true
    const showCompany = section.style.speakerShowCompany ?? true
    const showBio = section.style.speakerShowBio ?? true

    if (items.length === 0) {
      return presentation === 'preview' ? (
        <Box
          sx={{
            p: 3,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1.5,
            bgcolor: 'action.hover'
          }}
        >
          <Typography fontWeight={700}>Belum ada pembicara event</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, lineHeight: 1.6 }}>
            Tambahkan pembicara di modul Event. Foto, nama, dan informasi mereka akan muncul otomatis di sini.
          </Typography>
        </Box>
      ) : null
    }

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: listLayout
            ? '1fr'
            : 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: listLayout ? 1.5 : 2,
          minWidth: 0
        }}
      >
        {items.map((item, index) => {
          const name = firstText(item, ['name', 'fullName']) || `Speaker ${index + 1}`
          const role = firstText(item, ['title', 'position', 'role'])
          const company = firstText(item, ['company', 'organization'])
          const bio = firstText(item, ['bio', 'description'])
          const image = firstText(item, ['imageUrl', 'avatarUrl', 'photoUrl'])
          const visibleImage = showPhoto && Boolean(image)
          const subtitle = [
            showRole ? role : '',
            showCompany ? company : ''
          ].filter(Boolean).join(' · ')
          const outlined = defaultEventDesign || !publicPresentation

          return (
            <Box
              key={textValue(item.id) || `speaker-${index}`}
              sx={{
                minWidth: 0,
                display: listLayout && visibleImage ? 'grid' : 'block',
                gridTemplateColumns: listLayout && visibleImage
                  ? { xs: '96px minmax(0, 1fr)', sm: '120px minmax(0, 1fr)' }
                  : undefined,
                alignItems: listLayout ? 'center' : undefined,
                border: outlined ? '1px solid' : 'none',
                borderTop: !outlined && publicPresentation ? '1px solid' : undefined,
                borderBottom: !outlined && publicPresentation ? '1px solid' : undefined,
                borderColor: 'divider',
                borderRadius: outlined ? 2 : 0,
                overflow: 'hidden',
                bgcolor: outlined ? 'background.paper' : 'transparent',
                py: outlined ? 0 : publicPresentation ? 2.5 : 0
              }}
            >
              {visibleImage && (
                <Box
                  component='img'
                  src={image}
                  alt={name}
                  sx={{
                    width: '100%',
                    aspectRatio: listLayout ? '1 / 1' : '4 / 3',
                    height: listLayout ? '100%' : undefined,
                    maxHeight: listLayout ? 148 : undefined,
                    display: 'block',
                    objectFit: 'cover'
                  }}
                />
              )}
              <Box
                sx={{
                  minWidth: 0,
                  p: outlined ? 2 : publicPresentation ? 0 : 2,
                  pt: !outlined && publicPresentation && visibleImage && !listLayout
                    ? 2
                    : undefined
                }}
              >
                <Typography fontWeight={750} sx={{ overflowWrap: 'anywhere' }}>
                  {name}
                </Typography>
                {subtitle && (
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.25, overflowWrap: 'anywhere' }}>
                    {subtitle}
                  </Typography>
                )}
                {showBio && bio && (
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 1, lineHeight: 1.6, overflowWrap: 'anywhere' }}>
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
                  py: 2.25,
                  px: 2.5,
                  border: defaultEventDesign || !publicPresentation ? '1px solid' : 'none',
                  borderTop: !defaultEventDesign && publicPresentation ? '1px solid' : undefined,
                  borderBottom: !defaultEventDesign && publicPresentation ? '1px solid' : undefined,
                  borderColor: 'divider',
                  borderRadius: defaultEventDesign || !publicPresentation ? 2 : 0,
                  bgcolor: defaultEventDesign || !publicPresentation ? 'background.paper' : 'transparent'
                }}
              >
                <Typography fontWeight={750}>
                  {firstText(item, ['name']) || `Option ${index + 1}`}
                </Typography>
                {textValue(item.price) && (
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                    {Number(item.price) <= 0
                      ? 'Free'
                      : new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          maximumFractionDigits: 0
                        }).format(Number(item.price))}
                  </Typography>
                )}
                {firstText(item, ['benefits']) && (
                  <Box sx={{ mt: 1.5, display: 'grid', gap: 0.7 }}>
                    {firstText(item, ['benefits'])
                      .split(/\r?\n/)
                      .map(value => value.trim().replace(/^[-•]\s*/, ''))
                      .filter(Boolean)
                      .slice(0, 8)
                      .map(benefit => (
                        <Box
                          key={benefit}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '18px minmax(0,1fr)',
                            gap: 0.75,
                            alignItems: 'start'
                          }}
                        >
                          <i className='tabler-check text-success text-sm' aria-hidden='true' />
                          <Typography
                            color='text.secondary'
                            sx={{ fontSize: 12, lineHeight: 1.55 }}
                          >
                            {benefit}
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                )}
                {textValue(item.remainingQuota) && (
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ display: 'block', mt: 1.5 }}
                  >
                    Sisa: {textValue(item.remainingQuota)} slot
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
            Daftar Sekarang
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
  eventSlug,
  presentation,
  active,
  dimmed,
  defaultEventDesign
}: {
  section: MicrositeSection
  document: MicrositeDocument
  bindings: Record<string, unknown>
  interactive: boolean
  eventSlug?: string
  presentation: 'preview' | 'public'
  active: boolean
  dimmed: boolean
  defaultEventDesign: boolean
}) => {
  const publicPresentation = presentation === 'public'
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
        data-microsite-section={section.id}
        data-editor-label={`Sedang diedit: ${section.name}`}
        sx={{
          ...sectionSurfaceSx(
            section,
            document,
            active,
            dimmed,
            defaultEventDesign
          ),
          textAlign: normalizeTextAlign(section.style.contentAlign)
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: `${document.theme.containerWidth}px`,
            mx: 'auto',
            display: 'grid',
            gap: `${section.style.contentGap ?? 24}px`
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
                  minHeight: publicPresentation ? 72 : 96,
                  display: 'grid',
                  placeItems: 'center',
                  border: publicPresentation ? 'none' : '1px solid',
                  borderColor: 'divider',
                  borderRadius: publicPresentation ? 0 : 1,
                  p: publicPresentation ? 1.5 : 2,
                  bgcolor: publicPresentation ? 'transparent' : 'background.paper',
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

  const isHero = section.type === 'hero'
  const isAbout = section.type === 'about'
  const eventDetails = isObject(bindings['event-details'])
    ? bindings['event-details']
    : null
  const heroImageUrl = isHero && eventDetails
    ? firstText(eventDetails, ['heroImageUrl'])
    : ''
  const heroLogoUrl = isHero && eventDetails
    ? firstText(eventDetails, ['logoUrl'])
    : ''
  const heroKind = isHero && eventDetails
    ? firstText(eventDetails, ['kind'])
    : ''
  const heroDate = isHero ? formatEventDateRange(eventDetails) : ''
  const heroLocation = isHero && eventDetails
    ? firstText(eventDetails, ['location', 'venueAddress'])
    : ''

  const mediaElement = isAbout
    ? section.elements.find(
        element => element.type === 'image' && Boolean(element.assetUrl)
      )
    : undefined
  const contentElements = mediaElement
    ? section.elements.filter(element => element.id !== mediaElement.id)
    : section.elements
  const heroSubtitleHasContent =
    isHero &&
    defaultEventDesign &&
    contentElements.some(
      element =>
        element.id === 'hero-subtitle' &&
        resolveText(element.content, bindings).trim().length > 0
    )
  const heroCopyElements =
    isHero && defaultEventDesign
      ? contentElements.filter(
          element =>
            element.type !== 'button' &&
            !(element.id === 'hero-description' && heroSubtitleHasContent)
        )
      : contentElements
  const heroButtonElements =
    isHero && defaultEventDesign
      ? contentElements.filter(element => element.type === 'button')
      : []
  const preset = section.style.layoutPreset || 'stacked'
  const split =
    (isAbout || isHero) &&
    Boolean(mediaElement || heroImageUrl) &&
    (preset === 'media-left' || preset === 'media-right')
  const centered = preset === 'centered'

  const content = (
    <Box
      sx={{
        display: 'grid',
        gap: `${section.style.contentGap ?? 24}px`,
        alignContent: 'center',
        minWidth: 0
      }}
    >
      {heroKind && (
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 850,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: document.theme.secondaryColor
          }}
        >
          {heroKind}
        </Typography>
      )}

      {heroLogoUrl && (
        <Box
          component='img'
          src={heroLogoUrl}
          alt=''
          sx={{
            display: 'block',
            width: 'auto',
            maxWidth: { xs: 150, sm: 185 },
            maxHeight: 72,
            objectFit: 'contain'
          }}
        />
      )}

      {heroCopyElements.map(element => (
        <ElementPreview
          key={element.id}
          element={element}
          document={document}
          bindings={bindings}
          interactive={interactive}
          eventSlug={eventSlug}
        />
      ))}

      {isHero && defaultEventDesign && (heroDate || heroLocation) && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))' },
            gap: 1.6,
            pt: 0.5
          }}
        >
          {heroDate && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '34px minmax(0,1fr)',
                gap: 1.25,
                alignItems: 'start'
              }}
            >
              <Box sx={{ width: 34, height: 34, display: 'grid', placeItems: 'center', opacity: 0.72 }}>
                <i className='tabler-calendar-event' aria-hidden='true' />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 850, letterSpacing: '.055em', textTransform: 'uppercase', opacity: 0.68 }}>
                  Tanggal
                </Typography>
                <Typography sx={{ mt: 0.25, fontSize: 13, lineHeight: 1.55 }}>
                  {heroDate}
                </Typography>
              </Box>
            </Box>
          )}

          {heroLocation && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '34px minmax(0,1fr)',
                gap: 1.25,
                alignItems: 'start'
              }}
            >
              <Box sx={{ width: 34, height: 34, display: 'grid', placeItems: 'center', opacity: 0.72 }}>
                <i className='tabler-map-pin' aria-hidden='true' />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 850, letterSpacing: '.055em', textTransform: 'uppercase', opacity: 0.68 }}>
                  Lokasi
                </Typography>
                <Typography sx={{ mt: 0.25, fontSize: 13, lineHeight: 1.55 }}>
                  {heroLocation}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {heroButtonElements.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, alignItems: 'center' }}>
          {heroButtonElements.map(element => (
            <ElementPreview
              key={element.id}
              element={element}
              document={document}
              bindings={bindings}
              interactive={interactive}
              eventSlug={eventSlug}
            />
          ))}
        </Box>
      )}

      <DynamicBindingBlock
        section={section}
        bindings={bindings}
        interactive={interactive}
        eventSlug={eventSlug}
        presentation={presentation}
        defaultEventDesign={defaultEventDesign}
      />
    </Box>
  )

  const media = mediaElement ? (
    <Box
      sx={{
        minWidth: 0,
        display: 'grid',
        alignItems: 'center',
        borderRadius: `${section.style.mediaRadius ?? 16}px`,
        overflow: 'hidden'
      }}
    >
      <ElementPreview
        element={mediaElement}
        document={document}
        bindings={bindings}
        interactive={interactive}
        eventSlug={eventSlug}
      />
    </Box>
  ) : heroImageUrl ? (
    <Box
      sx={{
        minWidth: 0,
        display: 'grid',
        alignItems: 'center',
        overflow: 'hidden',
        borderRadius: `${section.style.mediaRadius ?? 16}px`,
        bgcolor: 'action.hover',
        minHeight: {
          xs: 240,
          md: (section.style.minHeight ?? 0) > 0
            ? Math.max(320, Math.min(section.style.minHeight, 520))
            : 380
        }
      }}
    >
      <Box
        component='img'
        src={heroImageUrl}
        alt=''
        sx={{
          width: '100%',
          height: '100%',
          minHeight: 'inherit',
          display: 'block',
          objectFit: 'cover'
        }}
      />
    </Box>
  ) : null

  return (
    <Box
      component='section'
      id={section.id}
      data-microsite-section={section.id}
      data-editor-label={`Sedang diedit: ${section.name}`}
      sx={{
        ...sectionSurfaceSx(
          section,
          document,
          active,
          dimmed,
          defaultEventDesign
        ),
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
            ? {
                xs: '1fr',
                md:
                  preset === 'media-left'
                    ? `${section.style.mediaWidthPercent ?? 50}fr ${100 - (section.style.mediaWidthPercent ?? 50)}fr`
                    : `${100 - (section.style.mediaWidthPercent ?? 50)}fr ${section.style.mediaWidthPercent ?? 50}fr`
              }
            : undefined,
          flexDirection: split
            ? undefined
            : preset === 'media-right'
              ? 'column-reverse'
              : 'column',
          gap: `${section.style.contentGap ?? 24}px`,
          alignItems: centered ? 'center' : isHero ? 'center' : 'stretch'
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
  eventSlug,
  presentation = 'preview',
  activeSectionId,
  templateKey
}: Props) => {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const defaultEventDesign = templateKey === 'modern-event'

  useEffect(() => {
    if (presentation !== 'preview' || !activeSectionId || !rootRef.current) return

    const target = Array.from(
      rootRef.current.querySelectorAll<HTMLElement>('[data-microsite-section]')
    ).find(element => element.dataset.micrositeSection === activeSectionId)

    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeSectionId, presentation])

  return (
    <Box
      ref={rootRef}
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
            presentation={presentation}
            active={presentation === 'preview' && section.id === activeSectionId}
            dimmed={
              presentation === 'preview' &&
              Boolean(activeSectionId) &&
              section.id !== activeSectionId
            }
            defaultEventDesign={defaultEventDesign}
          />
        ))}
    </Box>
  )
}

export default MicrositeDocumentPreview
