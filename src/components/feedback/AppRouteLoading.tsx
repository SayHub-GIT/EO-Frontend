import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

const AppRouteLoading = () => (
  <Box
    role='status'
    aria-live='polite'
    sx={{
      minHeight: '48vh',
      width: '100%',
      display: 'grid',
      placeItems: 'center',
      px: 3,
      py: 6
    }}
  >
    <Box sx={{ display: 'grid', justifyItems: 'center', gap: 1.75 }}>
      <CircularProgress size={34} thickness={4.2} />
      <Typography variant='body2' color='text.secondary' fontWeight={650}>
        Loading page...
      </Typography>
    </Box>
  </Box>
)

export default AppRouteLoading
