'use client'

import Box from '@mui/material/Box'

import { sanitizeLegalHtml } from '@/lib/legal-content'

type Props = {
  html: string
}

const LegalPolicyContent = ({ html }: Props) => (
  <Box
    sx={{
      color: 'text.primary',
      overflowWrap: 'anywhere',
      lineHeight: 1.8,
      '& h1': {
        mt: 0,
        mb: 2,
        fontSize: { xs: '1.75rem', sm: '2rem' },
        lineHeight: 1.25
      },
      '& h2': {
        mt: 3,
        mb: 1.5,
        fontSize: { xs: '1.4rem', sm: '1.6rem' },
        lineHeight: 1.3
      },
      '& h3': {
        mt: 2.5,
        mb: 1.25,
        fontSize: '1.25rem',
        lineHeight: 1.35
      },
      '& p, & div': {
        my: 1.25
      },
      '& ul, & ol': {
        my: 1.5,
        pl: 3.5
      },
      '& li + li': {
        mt: 0.75
      },
      '& blockquote': {
        my: 2,
        mx: 0,
        pl: 2,
        borderLeft: '4px solid',
        borderColor: 'divider',
        color: 'text.secondary'
      },
      '& a': {
        color: 'primary.main',
        textDecoration: 'underline',
        textUnderlineOffset: '3px',
        wordBreak: 'break-word'
      }
    }}
    dangerouslySetInnerHTML={{ __html: sanitizeLegalHtml(html) }}
  />
)

export default LegalPolicyContent
