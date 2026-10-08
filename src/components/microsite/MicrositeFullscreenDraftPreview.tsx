'use client'

import type { MouseEvent } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'

import MicrositeDocumentPreview from '@/components/microsite/MicrositeDocumentPreview'
import type { MicrositeDocument } from '@/lib/admin-microsites'

type Props = {
  open: boolean
  onClose: () => void
  document: MicrositeDocument
  dataBindings: Record<string, unknown>
  templateKey: string
  eventSlug?: string
  hasUnsavedChanges: boolean
}

const MicrositeFullscreenDraftPreview = ({
  open,
  onClose,
  document,
  dataBindings,
  templateKey,
  eventSlug,
  hasUnsavedChanges
}: Props) => {
  const preventDraftNavigation = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target

    // Keep the real website's buttons and links visible without leaving the private editor.
    if (target instanceof Element && target.closest('a[href]')) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      aria-label='Pratinjau layar penuh draf MicroSite'
      PaperProps={{
        sx: {
          m: 0,
          borderRadius: 0,
          bgcolor: document.theme.backgroundColor
        }
      }}
    >
      <DialogContent
        sx={{
          p: '0 !important',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          bgcolor: document.theme.backgroundColor
        }}
      >
        <Box
          component='main'
          onClickCapture={preventDraftNavigation}
          sx={{
            width: '100%',
            minHeight: '100dvh',
            bgcolor: document.theme.backgroundColor
          }}
        >
          <MicrositeDocumentPreview
            document={document}
            dataBindings={dataBindings}
            templateKey={templateKey}
            eventSlug={eventSlug}
            presentation='public'
            interactive
          />
        </Box>
      </DialogContent>

      <Box
        role='note'
        sx={{
          position: 'fixed',
          right: { xs: 1.5, sm: 3 },
          bottom: { xs: 1.5, sm: 3 },
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1.25, sm: 2 },
          maxWidth: 'calc(100vw - 24px)',
          px: { xs: 1.5, sm: 2 },
          py: 1,
          borderRadius: 1.5,
          bgcolor: '#07172B',
          color: '#FFFFFF',
          boxShadow: '0 8px 28px rgba(7,23,43,.24)'
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{ fontSize: 11, lineHeight: 1.3, fontWeight: 850, letterSpacing: '.04em' }}
          >
            PRATINJAU DRAF · PRIVAT
          </Typography>
          <Typography
            sx={{
              display: { xs: 'none', sm: 'block' },
              mt: 0.3,
              fontSize: 11,
              lineHeight: 1.4,
              color: 'rgba(255,255,255,.75)'
            }}
          >
            {hasUnsavedChanges
              ? 'Termasuk perubahan belum disimpan · Tautan tidak aktif'
              : 'Belum dipublikasikan · Tautan tidak aktif'}
          </Typography>
        </Box>
        <Button
          type='button'
          variant='outlined'
          size='small'
          startIcon={<i className='tabler-minimize' aria-hidden='true' />}
          onClick={onClose}
          aria-label='Tutup pratinjau layar penuh dan kembali ke editor'
          sx={{
            flexShrink: 0,
            minHeight: 40,
            color: 'inherit',
            borderColor: 'rgba(255,255,255,.45)',
            fontSize: 12,
            '&:hover': {
              borderColor: '#FFFFFF',
              bgcolor: 'rgba(255,255,255,.10)'
            }
          }}
        >
          Kembali ke Editor
        </Button>
      </Box>
    </Dialog>
  )
}

export default MicrositeFullscreenDraftPreview
