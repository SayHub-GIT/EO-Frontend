'use client'

import type { ReactNode } from 'react'
import NextLink from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import type {
  SitePageDefinition,
  SitePageSection
} from '@/lib/site-page-builder'

const SectionContent = ({ section }: { section: SitePageSection }) => {
  const hasText = Boolean(section.eyebrow || section.title || section.body || section.ctaLabel)
  const hasImage = Boolean(section.imageUrl)
  const split = section.layout === 'split' && hasImage && hasText
  const centered = section.layout === 'center' || section.align === 'center'

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
            fontSize: section.type === 'hero'
              ? { xs: '2.25rem', md: '4rem' }
              : { xs: '1.8rem', md: '2.6rem' },
            lineHeight: 1.08,
            maxWidth: 900
          }}
        >
          {section.title}
        </Typography>
      )}

      {section.body && (
        <Typography
          sx={{
            mt: section.title ? 2 : 0,
            opacity: .82,
            whiteSpace: 'pre-line',
            lineHeight: 1.8,
            maxWidth: 820
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
        maxHeight: section.type === 'hero' ? 520 : 420,
        objectFit: 'cover',
        borderRadius: Math.max(0, section.borderRadius),
        display: 'block'
      }}
    />
  ) : null

  if (section.type === 'image') return image

  if (section.type === 'spacer') {
    return <Box aria-hidden sx={{ minHeight: Math.max(24, section.paddingY) }} />
  }

  if (split) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1fr) minmax(320px,.9fr)' },
          gap: { xs: 3, md: 6 },
          alignItems: 'center'
        }}
      >
        {text}
        {image}
      </Box>
    )
  }

  if (section.layout === 'banner') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: centered ? 'center' : 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 3
        }}
      >
        {text}
        {image && <Box sx={{ width: { xs: '100%', md: '38%' } }}>{image}</Box>}
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      {text}
      {image}
    </Box>
  )
}

export const PageBuilderSections = ({
  page
}: {
  page: SitePageDefinition | null | undefined
}) => {
  if (!page?.enabled) return null

  const sections = [...page.sections]
    .filter(section => section.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (sections.length === 0) return null

  return (
    <Box component='section' data-page-builder-sections>
      {sections.map(section => (
        <Box
          key={section.id}
          component='section'
          data-page-builder-section={section.id}
          sx={{
            py: section.paddingY + 'px',
            px: { xs: 2.5, sm: 3 },
            bgcolor: section.backgroundColor || 'transparent',
            color: section.textColor || 'inherit',
            borderRadius: section.borderRadius ? section.borderRadius + 'px' : 0,
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: page.maxWidth,
              mx: 'auto'
            }}
          >
            <SectionContent section={section} />
          </Box>
        </Box>
      ))}
    </Box>
  )
}

const PageBuilderShell = ({
  page,
  children,
  sections = 'after'
}: {
  page: SitePageDefinition | null | undefined
  children: ReactNode
  sections?: 'before' | 'after' | 'none'
}) => (
  <Box
    sx={{
      minHeight: '100%',
      bgcolor: page?.backgroundColor || undefined,
      backgroundImage: page?.backgroundImageUrl
        ? 'url("' + page.backgroundImageUrl + '")'
        : undefined,
      backgroundSize: page?.backgroundImageUrl ? 'cover' : undefined,
      backgroundPosition: page?.backgroundImageUrl ? 'center' : undefined,
      backgroundRepeat: page?.backgroundImageUrl ? 'no-repeat' : undefined
    }}
  >
    {sections === 'before' && <PageBuilderSections page={page} />}
    {children}
    {sections === 'after' && <PageBuilderSections page={page} />}
  </Box>
)

export default PageBuilderShell
