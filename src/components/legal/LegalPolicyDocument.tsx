'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import LegalPolicyContent from '@/components/legal/LegalPolicyContent'
import type { LegalPolicy } from '@/lib/legal-policies'

type Props = {
  policy: LegalPolicy
  minHeight?: number | string
}

const LegalPolicyDocument = ({ policy, minHeight = 520 }: Props) => {
  const isPdf = policy.documentType === 'Pdf' && Boolean(policy.pdfUrl)

  if (!isPdf) {
    return <LegalPolicyContent html={policy.content} />
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box
        component='iframe'
        src={policy.pdfUrl ?? undefined}
        title={policy.kind + ' PDF'}
        sx={{
          width: '100%',
          minHeight,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.default'
        }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant='caption' color='text.secondary'>
          If the browser cannot preview the PDF, open the document in a new tab.
        </Typography>
        <Button
          component='a'
          href={policy.pdfUrl ?? undefined}
          target='_blank'
          rel='noopener noreferrer'
          size='small'
          endIcon={<i className='tabler-external-link' />}
        >
          Open PDF
        </Button>
      </Box>
    </Box>
  )
}

export default LegalPolicyDocument
