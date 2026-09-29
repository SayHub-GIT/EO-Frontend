'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'

type Props = {
  children: ReactNode
}

/**
 * Owns the continuous artwork for the public Home page and applies the
 * real Home media assets without re-introducing per-section backgrounds.
 */
const HomeBackgroundShell = ({ children }: Props) => (
  <Box
    sx={theme => {
      const isDark = theme.palette.mode === 'dark'
      const artwork = isDark ? '/web2.png' : '/web.png'

      return {
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        bgcolor: isDark ? '#03133c' : '#dff3ff',
        backgroundImage: `url('${artwork}')`,
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
