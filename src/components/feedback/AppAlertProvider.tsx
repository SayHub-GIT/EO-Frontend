'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'

export type AppAlertSeverity = 'success' | 'info' | 'warning' | 'error'

export type AppAlertPayload = {
  message: string
  severity?: AppAlertSeverity
  duration?: number
}

type AppAlertContextValue = {
  notify: (payload: AppAlertPayload) => void
}

const AppAlertContext = createContext<AppAlertContextValue | null>(null)
const APP_ALERT_EVENT = 'eo:app-alert'

export const pushAppAlert = (payload: AppAlertPayload) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<AppAlertPayload>(APP_ALERT_EVENT, { detail: payload }))
}

export const useAppAlert = () => {
  const context = useContext(AppAlertContext)
  if (!context) throw new Error('useAppAlert must be used inside AppAlertProvider')
  return context
}

const AppAlertProvider = ({ children }: { children: ReactNode }) => {
  const queueRef = useRef<AppAlertPayload[]>([])
  const [current, setCurrent] = useState<AppAlertPayload | null>(null)
  const [open, setOpen] = useState(false)

  const showNext = useCallback(() => {
    const next = queueRef.current.shift() ?? null
    setCurrent(next)
    setOpen(Boolean(next))
  }, [])

  const notify = useCallback((payload: AppAlertPayload) => {
    const normalized: AppAlertPayload = {
      severity: payload.severity ?? 'info',
      duration: payload.duration ?? 4200,
      message: payload.message.trim()
    }

    if (!normalized.message) return

    if (current || open) {
      queueRef.current.push(normalized)
      return
    }

    setCurrent(normalized)
    setOpen(true)
  }, [current, open])

  useEffect(() => {
    const listener = (event: Event) => {
      const payload = (event as CustomEvent<AppAlertPayload>).detail
      if (payload?.message) notify(payload)
    }

    window.addEventListener(APP_ALERT_EVENT, listener)
    return () => window.removeEventListener(APP_ALERT_EVENT, listener)
  }, [notify])

  const value = useMemo<AppAlertContextValue>(() => ({ notify }), [notify])

  return (
    <AppAlertContext.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={current?.duration ?? 4200}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return
          setOpen(false)
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionProps={{
          onExited: () => {
            setCurrent(null)
            showNext()
          }
        }}
        sx={{ mt: 1 }}
      >
        <Alert
          severity={current?.severity ?? 'info'}
          variant='filled'
          onClose={() => setOpen(false)}
          sx={{ minWidth: { xs: 280, sm: 360 }, maxWidth: 520, alignItems: 'center', boxShadow: 8 }}
        >
          {current?.message}
        </Alert>
      </Snackbar>
    </AppAlertContext.Provider>
  )
}

export default AppAlertProvider
