'use client'

import { useEffect, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import { styled, useTheme } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'

import type { SystemMode } from '@core/types'

import CustomTextField from '@core/components/mui/TextField'
import { getLastAdminPath, getSafeAdminReturnTo, login, rememberAdminPath, restoreSession } from '@/lib/auth'
import { hasFieldErrors, requiredText, type FieldErrors } from '@/lib/form-validation'
import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import { useSettings } from '@core/hooks/useSettings'

/* -------------------------------------------------------------------------- */
/* Background                                                                 */
/* -------------------------------------------------------------------------- */

const LoginPage = styled('main')({
  position: 'relative',

  width: '100%',
  height: '100dvh',
  minHeight: '100dvh',
  maxHeight: '100dvh',

  overflow: 'hidden',

  margin: 0,
  padding: 0
})

const LoginBackground = styled('div')(({ theme }) => ({
  position: 'fixed',

  inset: 0,

  width: '100%',
  height: '100dvh',

  backgroundImage: theme.palette.mode === 'dark' ? "url('/Dark.png')" : "url('/back.png')",

  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  backgroundRepeat: 'no-repeat',

  zIndex: 0,

  transition: 'background-image 250ms ease'
}))

/* -------------------------------------------------------------------------- */
/* Logo                                                                       */
/* -------------------------------------------------------------------------- */

const EventLogo = styled('img')({
  display: 'block',

  width: 'min(100%, 210px)',
  height: 'auto',

  objectFit: 'contain',

  margin: '0 auto 20px',

  transition: 'width 250ms ease',

  '@media (max-height: 760px)': {
    width: 'min(100%, 195px)',
    marginBottom: 16
  },

  '@media (max-height: 640px)': {
    width: 'min(100%, 175px)',
    marginBottom: 12
  },

  '@media (max-width: 600px)': {
    width: 'min(100%, 200px)'
  }
})

/* -------------------------------------------------------------------------- */
/* Login Card                                                                 */
/* -------------------------------------------------------------------------- */

const LoginCard = styled('div')(({ theme }) => ({
  position: 'relative',

  width: 'min(100%, 440px)',
  boxSizing: 'border-box',

  padding: theme.spacing(4),
  paddingBottom: theme.spacing(5.5),

  /*
   * Intentionally sharp corners.
   */
  borderRadius: 0,

  backgroundColor: theme.palette.mode === 'dark' ? '#17232d' : '#ffffff',

  border: theme.palette.mode === 'dark' ? '1px solid rgba(219, 232, 240, 0.16)' : '1px solid rgba(27, 45, 58, 0.14)',

  boxShadow: theme.palette.mode === 'dark' ? '0 20px 60px rgba(0, 0, 0, 0.55)' : '0 20px 60px rgba(0, 0, 0, 0.16)',

  transition: 'background-color 250ms ease, border-color 250ms ease, box-shadow 250ms ease',

  '@media (max-height: 760px)': {
    padding: theme.spacing(3.5),
    paddingBottom: theme.spacing(4.5)
  },

  '@media (max-height: 640px)': {
    padding: theme.spacing(2.5),
    paddingBottom: theme.spacing(3.5)
  },

  '@media (max-width: 600px)': {
    width: 'min(100%, 420px)',
    padding: theme.spacing(2.5),
    paddingBottom: theme.spacing(4)
  },

  '@media (max-width: 400px)': {
    padding: theme.spacing(2),
    paddingBottom: theme.spacing(3.5),
    width: '100%'
  }
}))

const getAdminDestination = () => {
  if (typeof window === 'undefined') return '/admin/home'

  const returnTo = getSafeAdminReturnTo(new URLSearchParams(window.location.search))

  return returnTo ?? getLastAdminPath() ?? '/admin/home'
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

const LoginV2 = (_props: { mode: SystemMode }) => {
  void _props

  // States
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<'email' | 'password'>>({})
  const submitLockRef = useRef(false)

  // Hooks
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

      if (role === 'admin') {
        const destination = getAdminDestination()

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

  /* ------------------------------------------------------------------------ */
  /* Password visibility                                                      */
  /* ------------------------------------------------------------------------ */

  const handleClickShowPassword = () => {
    setIsPasswordShown(show => !show)
  }

  /* ------------------------------------------------------------------------ */
  /* Dark / Light Mode                                                       */
  /* ------------------------------------------------------------------------ */

  const handleToggleMode = () => {
    const nextMode = theme.palette.mode === 'dark' ? 'light' : 'dark'

    updateSettings({
      mode: nextMode
    })
  }

  /* ------------------------------------------------------------------------ */
  /* Login                                                                    */
  /* ------------------------------------------------------------------------ */

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (isSubmitting || isRestoring || submitLockRef.current) return

    const nextErrors: FieldErrors<'email' | 'password'> = {
      email: requiredText(email, 'Email or username'),
      password: requiredText(password, 'Password')
    }

    setFieldErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) return

    submitLockRef.current = true
    setError('')
    setIsSubmitting(true)

    try {
      const session = await login(email, password)

      const role = session.role?.toLowerCase()

      if (role === 'admin') {
        const destination = getAdminDestination()

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

  /* ------------------------------------------------------------------------ */
  /* Shared field styles                                                      */
  /* ------------------------------------------------------------------------ */

  const inputSurface = theme.palette.mode === 'dark' ? '#101a22' : '#ffffff'

  const fieldStyles = {
    '& .MuiInputLabel-root': {
      color: 'text.secondary'
    },

    '& .MuiInputLabel-root.Mui-focused': {
      color: 'primary.main'
    },

    '& .MuiInputBase-root': {
      minHeight: 50,
      borderRadius: '10px !important',

      color: 'text.primary',

      backgroundColor: `${inputSurface} !important`
    },

    '& .MuiInputBase-input': {
      color: 'text.primary',

      '&:-webkit-autofill': {
        WebkitTextFillColor: theme.palette.text.primary,
        WebkitBoxShadow: `0 0 0 1000px ${inputSurface} inset`,
        caretColor: theme.palette.text.primary,
        transition: 'background-color 9999s ease-out 0s'
      },

      '&:autofill': {
        backgroundColor: `${inputSurface} !important`,
        color: theme.palette.text.primary
      },

      '&::placeholder': {
        color: 'text.secondary',
        opacity: 0.7
      }
    },

    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'divider'
    },

    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'text.secondary'
    },

    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: 'primary.main'
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <LoginPage>
      {/* Full viewport background */}
      <LoginBackground aria-hidden='true' />

      {/* ------------------------------------------------------------------ */}
      {/* Theme Toggle                                                       */}
      {/* ------------------------------------------------------------------ */}

      <IconButton
        aria-label={theme.palette.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={handleToggleMode}
        sx={{
          position: 'fixed',

          top: {
            xs: 16,
            sm: 20
          },

          right: {
            xs: 16,
            sm: 20
          },

          zIndex: 20,

          width: 44,
          height: 44,

          color: 'text.primary',

          backgroundColor: 'background.paper',

          border: '1px solid',
          borderColor: 'divider',

          backdropFilter: 'blur(8px)',

          transition: 'background-color 200ms ease, color 200ms ease, border-color 200ms ease, transform 200ms ease',

          '&:hover': {
            backgroundColor: 'action.hover',

            color: 'text.primary',

            borderColor: 'text.secondary',

            transform: 'scale(1.05)'
          }
        }}
      >
        <i className={theme.palette.mode === 'dark' ? 'tabler-sun' : 'tabler-moon'} />
      </IconButton>

      {/* ------------------------------------------------------------------ */}
      {/* Center Container                                                   */}
      {/* ------------------------------------------------------------------ */}

      <div
        className='relative z-10 flex h-full min-h-0 w-full items-center justify-center px-4'
        style={{
          paddingBlock: '16px'
        }}
      >
        <LoginCard>
          <div className='mx-auto flex w-full max-w-[360px] flex-col'>
            {/* ------------------------------------------------------------ */}
            {/* Logo                                                         */}
            {/* ------------------------------------------------------------ */}

            <EventLogo src='/EO Web2.png' alt='Pertamina Event' />

            {/* ------------------------------------------------------------ */}
            {/* Heading                                                      */}
            {/* ------------------------------------------------------------ */}

            <div className='mb-6 flex flex-col gap-5'>
              <Typography
                variant='h4'
                sx={{
                  fontWeight: 700,

                  lineHeight: 1.2,

                  fontSize: {
                    xs: '1.45rem',
                    sm: '1.7rem'
                  },
                  color: 'text.primary'
                }}
              >
                Welcome Back!
              </Typography>

              <Typography
                sx={{
                  color: 'text.secondary',

                  lineHeight: 1.45,

                  fontSize: {
                    xs: '0.9rem',
                    sm: '0.95rem'
                  }
                }}
              >
                Sign in to access your event account, tickets, activity, or event operations.
              </Typography>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* Form                                                         */}
            {/* ------------------------------------------------------------ */}

            <form
              noValidate
              autoComplete='off'
              onSubmit={handleSubmit}
              className='flex w-full flex-col gap-5 rounded-xl'
            >
              {/* ---------------------------------------------------------- */}
              {/* Email                                                       */}
              {/* ---------------------------------------------------------- */}

              <CustomTextField
                autoFocus
                fullWidth
                disabled={isRestoring}
                label='Email or Username'
                placeholder='Enter your email or username'
                value={email}
                onChange={event => {
                  setEmail(event.target.value)
                  setFieldErrors(current => ({ ...current, email: undefined }))
                }}
                error={Boolean(fieldErrors.email)}
                helperText={fieldErrors.email}
                sx={fieldStyles}
              />

              {/* ---------------------------------------------------------- */}
              {/* Password                                                    */}
              {/* ---------------------------------------------------------- */}

              <CustomTextField
                fullWidth
                disabled={isRestoring}
                label='Password'
                placeholder='············'
                value={password}
                onChange={event => {
                  setPassword(event.target.value)
                  setFieldErrors(current => ({ ...current, password: undefined }))
                }}
                error={Boolean(fieldErrors.password)}
                helperText={fieldErrors.password}
                id='outlined-adornment-password'
                type={isPasswordShown ? 'text' : 'password'}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          edge='end'
                          aria-label={isPasswordShown ? 'Hide password' : 'Show password'}
                          onClick={handleClickShowPassword}
                          onMouseDown={event => event.preventDefault()}
                          sx={{
                            color: 'text.secondary',

                            '&:hover': {
                              color: 'text.primary'
                            }
                          }}
                        >
                          <i className={isPasswordShown ? 'tabler-eye-off' : 'tabler-eye'} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
                sx={fieldStyles}
              />

              {/* ---------------------------------------------------------- */}
              {/* Error                                                       */}
              {/* ---------------------------------------------------------- */}

              {error && (
                <Typography
                  color='error'
                  variant='body2'
                  sx={{
                    mt: -1
                  }}
                >
                  {error}
                </Typography>
              )}

              {/* ---------------------------------------------------------- */}
              {/* Submit                                                      */}
              {/* ---------------------------------------------------------- */}

              <Button
                fullWidth
                variant='contained'
                type='submit'
                disabled={isSubmitting || isRestoring}
                sx={{
                  minHeight: 50,

                  borderRadius: '10px',

                  fontWeight: 600,

                  fontSize: '0.95rem',

                  textTransform: 'none',

                  transition: 'background-color 200ms ease, box-shadow 200ms ease',
                  mt: 2,
                  mb: 3,
                  '&:disabled': {
                    opacity: 0.65
                  }
                }}
              >
                {isRestoring ? 'Checking session...' : isSubmitting ? 'Signing in...' : 'Login'}
              </Button>
              <Button
                fullWidth
                variant='outlined'
                href='/signup'
                sx={{ minHeight: 48, textTransform: 'none', fontWeight: 650 }}
              >
                Create participant account
              </Button>
            </form>
          </div>
        </LoginCard>
      </div>
    </LoginPage>
  )
}

export default LoginV2
