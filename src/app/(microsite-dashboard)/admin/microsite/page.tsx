import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

export default function Page() {
  return (
    <Box sx={{ maxWidth: 920 }}>
      <Typography component='h1' variant='h4'>
        MicroSite
      </Typography>
      <Typography color='text.secondary' sx={{ mt: 1.5, maxWidth: 680, lineHeight: 1.7 }}>
        Create and manage event landing pages in a workspace that stays separate from day-to-day event operations.
      </Typography>

      <Divider sx={{ my: 4 }} />

      <Typography component='h2' variant='h6'>
        Workspace navigation
      </Typography>
      <Typography color='text.secondary' sx={{ mt: 1, maxWidth: 680, lineHeight: 1.7 }}>
        Overview is available first. My MicroSites and Templates are shown in the sidebar and will be enabled as their screens are connected.
      </Typography>
    </Box>
  )
}
