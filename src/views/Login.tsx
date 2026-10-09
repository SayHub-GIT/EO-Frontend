'use client'

import { useEffect, useRef, useState } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { SystemMode } from '@core/types'
import CustomTextField from '@core/components/mui/TextField'
import { useSettings } from '@core/hooks/useSettings'
import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import { assignedDashboardPath, getCurrentEventWorkspace } from '@/lib/event-workspace'
import { emailAddress, hasFieldErrors, requiredText, type FieldErrors } from '@/lib/form-validation'
import {
  getLastAdminPath,
  getSafeAdminReturnTo,
  login,
  rememberAdminPath,
  restoreSession
} from '@/lib/auth'

const getAdminDestination = async () => {
  // Saved admin URLs must not select an event for staff accounts.
  const workspace = await getCurrentEventWorkspace()
  if (!workspace.isGlobalAdmin) return assignedDashboardPath(workspace) ?? '/admin/home'

  if (typeof window === 'undefined') return '/admin/home'

  const returnTo = getSafeAdminReturnTo(new URLSearchParams(window.location.search))
  return returnTo ?? getLastAdminPath() ?? '/admin/home'
}

const LoginV2 = (_props: { mode: SystemMode }) => {
  void _props

  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<'email' | 'password'>>({})
  const submitLockRef = useRef(false)

  const router = useRouter()
  const theme = useTheme()
  const { updateSettings } = useSettings()

  useEffect(() => {
    let active = true

    const restoreExistingSession = async () => {
      const session = await restoreSession()

      if (!active) return

      if (!session) {
        setIsRestoring(false)
        return
      }

      pushAppAlert({ severity: 'success', message: `Welcome back, ${session.fullName}.`, duration: 2500 })

      const role = session.role?.toLowerCase()

      if (session.canAccessAdmin) {
        let destination = '/admin/home'

        try {
          destination = await getAdminDestination()
        } catch {
          // Route to the verification screen instead of replaying stale URLs.
        }

        if (!active) return
        rememberAdminPath(destination)
        router.replace(destination)
        return
      }

      router.replace(role === 'participant' ? '/account' : '/home')
    }

    void restoreExistingSession()

    return () => {
      active = false
    }
  }, [router])

  const handleToggleMode = () => {
    updateSettings({ mode: theme.palette.mode === 'dark' ? 'light' : 'dark' })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting || isRestoring || submitLockRef.current) return

    const nextErrors: FieldErrors<'email' | 'password'> = {
      email: emailAddress(email),
      password: requiredText(password, 'Password')
    }

    setFieldErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) return

    submitLockRef.current = true
    setError('')
    setIsSubmitting(true)

    try {
      const session = await login(email, password, rememberMe)
      const role = session.role?.toLowerCase()

      if (session.canAccessAdmin) {
        let destination = '/admin/home'

        try {
          destination = await getAdminDestination()
        } catch {
          // Route to the verification screen instead of replaying stale URLs.
        }

        rememberAdminPath(destination)
        router.replace(destination)
      } else {
        router.replace(role === 'participant' ? '/account' : '/home')
      }
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : 'Login gagal.'

      setError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setIsSubmitting(false)
      submitLockRef.current = false
    }
  }

  const fieldStyles = {
    '& .MuiInputBase-root': {
      minHeight: 50
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'divider'
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary' }}>
      <Box
        sx={{
          width: '100%',
          maxWidth: 1160,
          mx: 'auto',
          px: { xs: 2.5, sm: 4, md: 6 },
          py: { xs: 4, md: 6 }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
          <Box
            component={NextLink}
            href='/home'
            aria-label='Pertamina Event home'
            sx={{ display: 'inline-flex', textDecoration: 'none' }}
          >
            <Box
              component='img'
              src='/EO%20Navbar.png'
              alt='Pertamina Event'
              sx={{ display: 'block', width: 'auto', height: { xs: 30, sm: 34 } }}
            />
          </Box>

          <IconButton
            aria-label={theme.palette.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={handleToggleMode}
            sx={{ color: 'text.secondary' }}
          >
            <i className={theme.palette.mode === 'dark' ? 'tabler-sun' : 'tabler-moon'} />
          </IconButton>
        </Box>

        <Box
          sx={{
            mt: { xs: 7, md: 11 },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0,.9fr) minmax(0,1.1fr)' },
            gap: { xs: 7, md: 10 },
            alignItems: 'start'
          }}
        >
          <Box sx={{ maxWidth: 500 }}>
            <Typography sx={{ color: '#00A7E1', fontSize: '0.72rem', fontWeight: 850, letterSpacing: '.08em' }}>
              PERTAMINA EVENT ACCOUNT
            </Typography>
            <Typography
              component='h1'
              sx={{
                mt: 1.25,
                fontSize: { xs: '2.35rem', sm: '3rem', md: '3.45rem' },
                lineHeight: 1.02,
                fontWeight: 900,
                letterSpacing: '-.04em'
              }}
            >
              Sign in to continue
            </Typography>
            <Typography color='text.secondary' sx={{ mt: 2, maxWidth: 460, lineHeight: 1.75 }}>
              Access registrations, tickets, receipts, points, activity, or event operations with your existing account.
            </Typography>

            <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid', borderColor: 'divider', maxWidth: 460 }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 800 }}>Participant account</Typography>
              <Typography color='text.secondary' sx={{ mt: .6, fontSize: '0.9rem', lineHeight: 1.65 }}>
                Your participant history stays linked to the verified email used by your account.
              </Typography>
            </Box>
          </Box>

          <Box
            component='section'
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              pt: { xs: 4, sm: 5 },
              maxWidth: 520,
              width: '100%'
            }}
          >
            <Typography component='h2' sx={{ fontSize: '1.45rem', fontWeight: 900 }}>
              Welcome back
            </Typography>
            <Typography color='text.secondary' sx={{ mt: .75, fontSize: '0.9rem', lineHeight: 1.65 }}>
              Enter your account credentials below.
            </Typography>

            <Box component='form' noValidate autoComplete='on' onSubmit={handleSubmit} sx={{ mt: 3.5, display: 'grid', gap: 2.25 }}>
              <CustomTextField
                autoFocus
                fullWidth
                disabled={isRestoring}
                label='Email'
                placeholder='Enter your email'
                type='email'
                autoComplete='email'
                value={email}
                onChange={event => {
                  setEmail(event.target.value)
                  setFieldErrors(current => ({ ...current, email: undefined }))
                }}
                error={Boolean(fieldErrors.email)}
                helperText={fieldErrors.email}
                sx={fieldStyles}
              />

              <CustomTextField
                fullWidth
                disabled={isRestoring}
                label='Password'
                placeholder='Enter your password'
                value={password}
                onChange={event => {
                  setPassword(event.target.value)
                  setFieldErrors(current => ({ ...current, password: undefined }))
                }}
                error={Boolean(fieldErrors.password)}
                helperText={fieldErrors.password}
                autoComplete='current-password'
                type={isPasswordShown ? 'text' : 'password'}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          edge='end'
                          aria-label={isPasswordShown ? 'Hide password' : 'Show password'}
                          onClick={() => setIsPasswordShown(value => !value)}
                          onMouseDown={event => event.preventDefault()}
                          sx={{ color: 'text.secondary' }}
                        >
                          <i className={isPasswordShown ? 'tabler-eye-off' : 'tabler-eye'} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
                sx={fieldStyles}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={event => setRememberMe(event.target.checked)}
                    disabled={isRestoring || isSubmitting}
                  />
                }
                label='Remember me for 30 days'
                sx={{ color: 'text.secondary', mt: -.5 }}
              />

              {error && <Typography color='error' variant='body2'>{error}</Typography>}

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'auto auto' }, gap: 1.5, justifyContent: { sm: 'start' }, mt: 1 }}>
                <Button
                  variant='contained'
                  type='submit'
                  size='large'
                  disabled={isSubmitting || isRestoring}
                  sx={{ minWidth: 150 }}
                >
                  {isRestoring ? 'Checking session...' : isSubmitting ? 'Signing in...' : 'Sign in'}
                </Button>
                <Button component={NextLink} href='/signup' variant='outlined' size='large'>
                  Create account
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default LoginV2
