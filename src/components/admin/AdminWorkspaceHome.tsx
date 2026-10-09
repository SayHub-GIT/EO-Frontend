'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import HomeDashboard from '@views/HomeDashboard'
import {
  assignedDashboardPath,
  getCurrentEventWorkspace,
  workspaceStatusMessage,
  type EventWorkspaceContext
} from '@/lib/event-workspace'

type HomeState =
  | { kind: 'loading' }
  | { kind: 'global' }
  | { kind: 'scoped'; context: EventWorkspaceContext }
  | { kind: 'error'; message: string }

export default function AdminWorkspaceHome() {
  const router = useRouter()
  const [state, setState] = useState<HomeState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setState({ kind: 'loading' })
    setAttempt(value => value + 1)
  }, [])

  useEffect(() => {
    let active = true

    const resolve = async () => {
      try {
        const context = await getCurrentEventWorkspace()
        if (!active) return

        if (context.isGlobalAdmin) {
          setState({ kind: 'global' })
          return
        }

        const destination = assignedDashboardPath(context)

        if (destination) {
          router.replace(destination)
          return
        }

        setState({ kind: 'scoped', context })
      } catch (error) {
        if (active) {
          setState({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Unable to verify event access.'
          })
        }
      }
    }

    void resolve()

    return () => { active = false }
  }, [router, attempt])

  if (state.kind === 'global') return <HomeDashboard />

  if (state.kind === 'loading') {
    return (
      <Box role='status' sx={{ py: 12, display: 'grid', justifyItems: 'center', gap: 2 }}>
        <CircularProgress size={32} />
        <Typography color='text.secondary'>Opening your event workspace...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'grid', gap: 3, maxWidth: 680 }}>
      <Typography component='h1' variant='h4' fontWeight={750}>Event Workspace</Typography>
      <Alert severity={state.kind === 'error' ? 'error' : 'warning'}>
        {state.kind === 'error'
          ? state.message
          : workspaceStatusMessage(state.context.status)}
      </Alert>
      <Box>
        <Button variant='outlined' onClick={retry}>Try again</Button>
      </Box>
    </Box>
  )
}
