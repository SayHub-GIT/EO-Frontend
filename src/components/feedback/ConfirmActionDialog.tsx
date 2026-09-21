'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

export type ConfirmActionDetail = {
  label: string
  value: string
}

type Props = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void | Promise<void>
  onClose: () => void
  loading?: boolean
  destructive?: boolean
  warning?: string
  details?: ConfirmActionDetail[]
}

const ConfirmActionDialog = ({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  loading = false,
  destructive = true,
  warning,
  details = []
}: Props) => (
  <Dialog
    open={open}
    onClose={loading ? undefined : onClose}
    fullWidth
    maxWidth='sm'
    aria-labelledby='confirm-action-title'
  >
    <DialogTitle id='confirm-action-title' sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: destructive ? 'error.lighter' : 'warning.lighter',
          color: destructive ? 'error.main' : 'warning.main',
          flexShrink: 0
        }}
      >
        <i className={destructive ? 'tabler-alert-triangle' : 'tabler-alert-circle'} />
      </Box>
      {title}
    </DialogTitle>

    <DialogContent>
      <Typography color='text.secondary' sx={{ lineHeight: 1.7 }}>
        {description}
      </Typography>

      {details.length > 0 && (
        <Box
          sx={{
            mt: 3,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          {details.map((detail, index) => (
            <Box key={detail.label}>
              {index > 0 && <Divider />}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '160px minmax(0, 1fr)' },
                  gap: 1,
                  px: 2,
                  py: 1.5
                }}
              >
                <Typography variant='body2' color='text.secondary' fontWeight={650}>
                  {detail.label}
                </Typography>
                <Typography variant='body2' fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
                  {detail.value}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {warning && (
        <Alert severity={destructive ? 'warning' : 'info'} sx={{ mt: 3 }}>
          {warning}
        </Alert>
      )}
    </DialogContent>

    <DialogActions sx={{ px: 3, pb: 3, pt: 1.5 }}>
      <Button onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button
        variant='contained'
        color={destructive ? 'error' : 'warning'}
        onClick={() => void onConfirm()}
        disabled={loading}
        startIcon={loading ? <i className='tabler-loader-2 animate-spin' /> : undefined}
      >
        {loading ? 'Processing...' : confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
)

export default ConfirmActionDialog
