'use client'

import { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import {
  completeParticipantSignup,
  restoreSession,
  startParticipantSignup
} from '@/lib/auth'

const SignupPage = () => {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [expiresIn, setExpiresIn] = useState(600)

  useEffect(() => {
    let active = true

    const restore = async () => {
      const session = await restoreSession()
      if (!active || !session) return

      const role = session.role?.toLowerCase()
      router.replace(role === 'participant' ? '/account' : role === 'admin' ? '/admin/home' : '/home')
    }

    void restore()
    return () => { active = false }
  }, [router])

  const sendCode = async () => {
    if (!fullName.trim() || !email.trim()) {
      setError('Full name and email are required.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const result = await startParticipantSignup(fullName.trim(), email.trim())
      setEmail(result.email)
      setExpiresIn(result.expiresInSeconds)
      setStep(2)
      pushAppAlert({ severity: 'success', message: 'Verification code sent to your email.' })
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send verification code.')
    } finally {
      setSubmitting(false)
    }
  }

  const createAccount = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit verification code.')
      return
    }

    if (password.length < 12) {
      setError('Password must contain at least 12 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Password confirmation does not match.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const session = await completeParticipantSignup(
        fullName.trim(),
        email.trim(),
        code.trim(),
        password
      )

      if (session.role?.toLowerCase() !== 'participant') {
        throw new Error('Participant account could not be created.')
      }

      pushAppAlert({ severity: 'success', message: `Welcome, ${session.fullName}!` })
      router.replace('/account')
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Unable to create account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box
      sx={theme => ({
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        background: `radial-gradient(circle at 20% 0%, ${theme.palette.primary.main}20, transparent 35%), ${theme.palette.background.default}`
      })}
    >
      <Card sx={{ width: '100%', maxWidth: 520, borderRadius: 4 }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Box component={NextLink} href='/home' sx={{ display: 'inline-flex', textDecoration: 'none' }}>
            <Box component='img' src='/EO%20Navbar.png' alt='Pertamina Event' sx={{ height: 46, width: 'auto' }} />
          </Box>

          <Typography variant='h4' fontWeight={900} sx={{ mt: 4 }}>
            Create your Event Account
          </Typography>
          <Typography color='text.secondary' sx={{ mt: 1, lineHeight: 1.7 }}>
            One verified account for points, purchases, tickets, receipts, event history, and activity.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
            <Box sx={{ height: 5, flex: 1, borderRadius: 99, bgcolor: 'primary.main' }} />
            <Box sx={{ height: 5, flex: 1, borderRadius: 99, bgcolor: step === 2 ? 'primary.main' : 'action.hover' }} />
          </Box>

          {error && <Alert severity='error' sx={{ mt: 3 }}>{error}</Alert>}

          {step === 1 ? (
            <Box sx={{ display: 'grid', gap: 2.25, mt: 3 }}>
              <TextField
                label='Full name'
                value={fullName}
                onChange={event => setFullName(event.target.value)}
                inputProps={{ maxLength: 150 }}
                autoComplete='name'
              />
              <TextField
                label='Email'
                type='email'
                value={email}
                onChange={event => setEmail(event.target.value)}
                autoComplete='email'
                helperText='We will send a verification code before linking any registration history.'
              />
              <Button
                size='large'
                variant='contained'
                disabled={submitting}
                onClick={() => void sendCode()}
                startIcon={submitting ? <CircularProgress size={17} color='inherit' /> : <i className='tabler-mail-forward' />}
              >
                Send Verification Code
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 2.25, mt: 3 }}>
              <Alert severity='info'>
                We sent a 6-digit code to <strong>{email}</strong>. It is valid for about {Math.round(expiresIn / 60)} minutes.
              </Alert>
              <TextField
                label='Verification code'
                value={code}
                onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputProps={{ inputMode: 'numeric', maxLength: 6 }}
                placeholder='000000'
              />
              <TextField
                label='Password'
                type='password'
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete='new-password'
                helperText='Use at least 12 characters.'
              />
              <TextField
                label='Confirm password'
                type='password'
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                autoComplete='new-password'
              />
              <Button
                size='large'
                variant='contained'
                disabled={submitting}
                onClick={() => void createAccount()}
                startIcon={submitting ? <CircularProgress size={17} color='inherit' /> : <i className='tabler-user-check' />}
              >
                Create Account
              </Button>
              <Button
                variant='text'
                disabled={submitting}
                onClick={() => {
                  setStep(1)
                  setCode('')
                  setPassword('')
                  setConfirmPassword('')
                  setError('')
                }}
              >
                Change email / resend code
              </Button>
            </Box>
          )}

          <DividerText />

          <Button component={NextLink} href='/login' fullWidth variant='outlined'>
            Already have an account? Sign in
          </Button>
        </CardContent>
      </Card>
    </Box>
  )
}

const DividerText = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 3 }}>
    <Box sx={{ height: 1, flex: 1, bgcolor: 'divider' }} />
    <Typography variant='caption' color='text.secondary'>OR</Typography>
    <Box sx={{ height: 1, flex: 1, bgcolor: 'divider' }} />
  </Box>
)

export default SignupPage
