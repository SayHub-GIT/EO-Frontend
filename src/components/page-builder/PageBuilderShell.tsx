'use client'

import type { ReactNode } from 'react'
import NextLink from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import type {
  SitePageDefinition,
  SitePageSection,
  SiteSectionShadow
} from '@/lib/site-page-builder'

const titleSizes = {
  small: { xs: '1.4rem', md: '1.8rem' },
  medium: { xs: '1.8rem', md: '2.5rem' },
  large: { xs: '2.25rem', md: '3.4rem' },
  xlarge: { xs: '2.8rem', md: '4.7rem' }
} as const

const bodySizes = {
  small: { xs: '.875rem', md: '.925rem' },
  medium: { xs: '1rem', md: '1.05rem' },
  large: { xs: '1.08rem', md: '1.2rem' }
} as const

const shadowValues: Record<SiteSectionShadow, string> = {
  none: 'none',
  soft: '0 12px 34px rgba(15, 23, 42, .10)',
  medium: '0 20px 48px rgba(15, 23, 42, .16)',
  strong: '0 28px 72px rgba(15, 23, 42, .24)'
}

const SectionContent = ({ section }: { section: SitePageSection }) => {
  const hasText = Boolean(section.eyebrow || section.title || section.body || section.ctaLabel)
  const hasImage = Boolean(section.imageUrl)
  const split = section.layout === 'split' && hasImage && hasText
  const centered = section.layout === 'center' || section.align === 'center'
  const gap = Math.max(0, section.gap ?? 24)
  const titleSize = titleSizes[section.titleSize ?? 'large']
  const bodySize = bodySizes[section.bodySize ?? 'medium']
  const imagePosition = section.imagePosition ?? 'right'

  const text = (
    <Box
      sx={{
        minWidth: 0,
        textAlign: centered ? 'center' : section.align,
        display: 'flex',
        flexDirection: 'column',
        alignItems: centered
          ? 'center'
          : section.align === 'right'
            ? 'flex-end'
            : 'flex-start'
      }}
    >
      {section.eyebrow && (
        <Chip
          size='small'
          label={section.eyebrow}
          sx={{
            mb: 2,
            bgcolor: section.accentColor || 'primary.main',
            color: 'primary.contrastText'
          }}
        />
      )}

      {section.title && (
        <Typography
          component={section.type === 'hero' ? 'h1' : 'h2'}
          sx={{
            fontWeight: 900,
            letterSpacing: '-.03em',
            fontSize: titleSize,
            lineHeight: 1.08,
            maxWidth: 960
          }}
        >
          {section.title}
        </Typography>
      )}

      {section.body && (
        <Typography
          sx={{
            mt: section.title ? 2 : 0,
            opacity: .84,
            whiteSpace: 'pre-line',
            lineHeight: 1.8,
            fontSize: bodySize,
            maxWidth: 860
          }}
        >
          {section.body}
        </Typography>
      )}

      {section.ctaLabel && section.ctaHref && (
        <Button
          component={section.ctaHref.startsWith('/') ? NextLink : 'a'}
          href={section.ctaHref}
          {...(!section.ctaHref.startsWith('/') && {
            target: '_blank',
            rel: 'noreferrer'
          })}
          variant='contained'
          sx={{
            mt: 3,
            bgcolor: section.accentColor || undefined
          }}
        >
          {section.ctaLabel}
        </Button>
      )}
    </Box>
  )

  const image = section.imageUrl ? (
    <Box
      component='img'
      src={section.imageUrl}
      alt={section.title || section.eyebrow || 'Section visual'}
      sx={{
        width: '100%',
        maxHeight: section.type === 'hero' ? 560 : 440,
        objectFit: section.imageFit ?? 'cover',
        borderRadius: Math.max(0, section.borderRadius),
        display: 'block'
      }}
    />
  ) : null

  if (section.type === 'image') return image

  if (section.type === 'spacer') {
    return <Box aria-hidden sx={{ minHeight: Math.max(24, section.minHeight || section.paddingY) }} />
  }

  if (split) {
    const imageFirst = imagePosition === 'left'

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1fr) minmax(320px,.9fr)' },
          gap: gap + 'px',
          alignItems: 'center'
        }}
      >
        {imageFirst ? image : text}
        {imageFirst ? text : image}
      </Box>
    )
  }

  if (section.layout === 'banner') {
    const imageFirst = imagePosition === 'left'

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: imageFirst ? 'row-reverse' : 'row' },
          alignItems: { xs: centered ? 'center' : 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: gap + 'px'
        }}
      >
        {text}
        {image && <Box sx={{ width: { xs: '100%', md: '38%' } }}>{image}</Box>}
      </Box>
    )
  }

  const imageFirst = imagePosition === 'top' || imagePosition === 'left'

  return (
    <Box sx={{ display: 'grid', gap: gap + 'px' }}>
      {imageFirst && image}
      {text}
      {!imageFirst && image}
    </Box>
  )
}

export const PageBuilderSections = ({
  page,
  placement
}: {
  page: SitePageDefinition | null | undefined
  placement?: 'before' | 'after'
}) => {
  if (!page?.enabled) return null

  const sections = [...page.sections]
    .filter(section =>
      section.enabled &&
      (!placement || (section.placement ?? 'after') === placement)
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (sections.length === 0) return null

  return (
    <Box component='section' data-page-builder-sections>
      {sections.map(section => {
        const shadow = shadowValues[section.shadow ?? 'none']
        const contentWidth = section.contentMaxWidth && section.contentMaxWidth > 0
          ? section.contentMaxWidth
          : page.maxWidth

        return (
          <Box
            key={section.id}
            component='section'
            data-page-builder-section={section.id}
            sx={{
              minHeight: section.minHeight ? section.minHeight + 'px' : undefined,
              py: section.paddingY + 'px',
              px: { xs: Math.min(section.paddingX ?? 24, 24) + 'px', sm: (section.paddingX ?? 24) + 'px' },
              bgcolor: section.backgroundColor || 'transparent',
              backgroundImage: section.backgroundImageUrl
                ? 'url("' + section.backgroundImageUrl + '")'
                : undefined,
              backgroundSize: section.backgroundImageUrl ? section.backgroundSize ?? 'cover' : undefined,
              backgroundPosition: section.backgroundImageUrl ? 'center' : undefined,
              backgroundRepeat: section.backgroundImageUrl ? 'no-repeat' : undefined,
              color: section.textColor || 'inherit',
              border: section.borderWidth
                ? String(section.borderWidth) + 'px solid ' + (section.borderColor || 'currentColor')
                : undefined,
              borderRadius: section.borderRadius ? section.borderRadius + 'px' : 0,
              boxShadow: shadow,
              overflow: 'hidden',
              position: 'relative',
              display: section.minHeight ? 'flex' : undefined,
              alignItems: section.minHeight ? 'center' : undefined
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: contentWidth,
                mx: 'auto'
              }}
            >
              <SectionContent section={section} />
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

const PageBuilderShell = ({
  page,
  children
}: {
  page: SitePageDefinition | null | undefined
  children: ReactNode
}) => {
  const builderEnabled = page?.enabled === true

  return (
    <Box
      sx={{
        minHeight: '100%',
        bgcolor: builderEnabled ? page?.backgroundColor || undefined : undefined,
        backgroundImage: builderEnabled && page?.backgroundImageUrl
          ? 'url("' + page.backgroundImageUrl + '")'
          : undefined,
        backgroundSize: builderEnabled && page?.backgroundImageUrl ? 'cover' : undefined,
        backgroundPosition: builderEnabled && page?.backgroundImageUrl ? 'center' : undefined,
        backgroundRepeat: builderEnabled && page?.backgroundImageUrl ? 'no-repeat' : undefined
      }}
    >
      {builderEnabled && <PageBuilderSections page={page} placement='before' />}
      {(!builderEnabled || page?.showDefaultContent !== false) && children}
      {builderEnabled && <PageBuilderSections page={page} placement='after' />}
    </Box>
  )
}

export default PageBuilderShell
