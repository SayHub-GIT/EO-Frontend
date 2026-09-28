'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import type { SitePageDefinition } from '@/lib/site-page-builder'

type Props = {
  children: ReactNode
  pageConfig?: SitePageDefinition | null
}

/**
 * Owns the continuous artwork for the public Home page and applies the
 * real Home media assets without re-introducing per-section backgrounds.
 */
const HomeBackgroundShell = ({ children, pageConfig }: Props) => (
  <Box
    sx={theme => {
      const isDark = theme.palette.mode === 'dark'
      const artwork = isDark ? '/web2.png' : '/web.png'

      return {
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        bgcolor: pageConfig?.backgroundColor || (isDark ? '#03133c' : '#dff3ff'),
        backgroundImage: pageConfig?.backgroundImageUrl
          ? 'url("' + pageConfig.backgroundImageUrl + '")'
          : `url('${artwork}')`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top center',
        backgroundSize: '100% 100%',

        transition: theme.transitions.create(['background-color'], {
          duration: theme.transitions.duration.shorter
        }),

        '& > div': {
          position: 'relative',
          zIndex: 1
        },

        // Keep one continuous Home artwork instead of restarting a background
        // on every section.
        '& > div > section': {
          backgroundImage: 'none !important',
          backgroundColor: 'transparent !important'
        },

        '& > div > section:nth-of-type(2)': {
          minHeight: {
            xs: 'auto',
            md: '105dvh'
          }
        },

        // Keep the real Home illustration visible without a card-like panel.
        // Multiply makes the pale image background visually merge into the
        // continuous light artwork; dark mode keeps the original rendering.
        '& > div > section:nth-of-type(2) > div > div:first-of-type': {
          backgroundImage: "url('/heroo.png')",
          backgroundColor: 'transparent',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'contain',
          borderRadius: 0,
          overflow: 'visible',
          boxShadow: 'none',
          mixBlendMode: isDark ? 'normal' : 'multiply',
          filter: isDark ? 'none' : 'saturate(1.06) contrast(1.02)'
        },

        '& > div > section:nth-of-type(2) > div > div:first-of-type > div': {
          display: 'none'
        },

        // Partner cards keep their existing marquee/card layout, but the
        // placeholders are replaced by the actual PTC and Pertamina logos.
        '& > div > section:nth-of-type(4) .MuiPaper-root': {
          position: 'relative',
          overflow: 'hidden'
        },

        '& > div > section:nth-of-type(4) .MuiPaper-root > div': {
          display: 'none'
        },

        '& > div > section:nth-of-type(4) .MuiPaper-root::before': {
          content: '""',
          display: 'block',
          width: '72%',
          height: '58%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'contain'
        },

        '& > div > section:nth-of-type(4) .MuiPaper-root:nth-of-type(odd)::before': {
          backgroundImage: "url('/ptc.png')"
        },

        '& > div > section:nth-of-type(4) .MuiPaper-root:nth-of-type(even)::before': {
          backgroundImage: "url('/pertamina.png')"
        }
      }
    }}
  >
    {children}
  </Box>
)

export default HomeBackgroundShell
