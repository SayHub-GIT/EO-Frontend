'use client'

import { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import LegalConsentField from '@/components/legal/LegalConsentField'
import {
  completeParticipantSignup,
  restoreSession,
  startParticipantSignup
} from '@/lib/auth'
import {
  getPublicGlobalLegalPolicies,
  type LegalPolicyBundle
} from '@/lib/legal-policies'

const passwordPolicyError = (value: string) => {
  if (value.length < 12 || value.length > 128) {
    return 'Password must contain between 12 and 128 characters.'
  }

  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return 'Password must include uppercase, lowercase, number, and symbol.'
  }

  return ''
}

const SignupPage = () => {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [expiresIn, setExpiresIn] = useState(600)
  const [legalPolicies, setLegalPolicies] = useState<LegalPolicyBundle | null>(null)
  const [legalLoading, setLegalLoading] = useState(true)
  const [legalError, setLegalError] = useState('')
  const [legalAccepted, setLegalAccepted] = useState(false)

  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = window.setInterval(() => {
      setResendCooldown(value => Math.max(0, value - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [resendCooldown])

  const loadLegalPolicies = async () => {
    try {
      setLegalLoading(true)
      setLegalError('')
      setLegalAccepted(false)

      const policies = await getPublicGlobalLegalPolicies()
      setLegalPolicies(policies)
    } catch (loadError) {
      setLegalPolicies(null)
      setLegalError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load Terms and Privacy Policy.'
      )
    } finally {
      setLegalLoading(false)
    }
  }

  useEffect(() => {
    void loadLegalPolicies()
  }, [])

  useEffect(() => {
    let active = true

    const restore = async () => {
      const session = await restoreSession()
      if (!active || !session) return

      const role = session.role?.toLowerCase()
      router.replace(session.canAccessAdmin ? '/admin/home' : role === 'participant' ? '/account' : '/home')
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
      setChallengeId(result.challengeId)
      setCode('')
      setExpiresIn(result.expiresInSeconds)
      setResendCooldown(30)
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

    const passwordError = passwordPolicyError(password)

    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError('Password confirmation does not match.')
      return
    }

    if (!legalPolicies?.terms || !legalPolicies.privacy) {
      setError('Terms and Privacy Policy are not available. Please retry.')
      return
    }

    if (!legalAccepted) {
      setError('Review the Terms of Service and Privacy Policy, then accept them to continue.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const session = await completeParticipantSignup(
        fullName.trim(),
        email.trim(),
        challengeId,
        code.trim(),
        password,
        legalPolicies.terms.id,
        legalPolicies.privacy.id,
        legalAccepted
      )

      if (session.role?.toLowerCase() !== 'participant') {
        throw new Error('Participant account could not be created.')
      }

      pushAppAlert({ severity: 'success', message: `Welcome, ${session.fullName}!` })
      router.replace('/account')
    } catch (signupError) {
      const message =
        signupError instanceof Error
          ? signupError.message
          : 'Unable to create account.'

      setError(message)

      if (/Terms or Privacy Policy changed/i.test(message)) {
        void loadLegalPolicies()
      }
    } finally {
      setSubmitting(false)
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

        <Box
          sx={{
            mt: { xs: 7, md: 10 },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0,.82fr) minmax(0,1.18fr)' },
            gap: { xs: 6, md: 10 },
            alignItems: 'start'
          }}
        >
          <Box sx={{ maxWidth: 480 }}>
            <Typography sx={{ color: '#00A7E1', fontSize: '0.72rem', fontWeight: 850, letterSpacing: '.08em' }}>
              PARTICIPANT ACCOUNT
            </Typography>
            <Typography
              component='h1'
              sx={{
                mt: 1.25,
                fontSize: { xs: '2.25rem', sm: '2.9rem', md: '3.3rem' },
                lineHeight: 1.03,
                fontWeight: 900,
                letterSpacing: '-.04em'
              }}
            >
              Create your event account
            </Typography>
            <Typography color='text.secondary' sx={{ mt: 2, maxWidth: 450, lineHeight: 1.75 }}>
              One verified account for registrations, tickets, receipts, points, event history, and activity.
            </Typography>

            <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 850, color: 'text.secondary', letterSpacing: '.06em' }}>
                STEP {step} OF 2
              </Typography>
              <Typography sx={{ mt: .6, fontWeight: 800 }}>
                {step === 1 ? 'Verify your identity' : 'Secure your account'}
              </Typography>
            </Box>

            <Button component={NextLink} href='/login' variant='text' sx={{ mt: 3, px: 0 }}>
              Already have an account? Sign in
            </Button>
          </Box>

          <Box
            component='section'
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              pt: { xs: 4, sm: 5 },
              maxWidth: 620,
              width: '100%'
            }}
          >
            <Typography component='h2' sx={{ fontSize: '1.45rem', fontWeight: 900 }}>
              {step === 1 ? 'Start with your email' : 'Enter the verification code'}
            </Typography>
            <Typography color='text.secondary' sx={{ mt: .75, fontSize: '0.9rem', lineHeight: 1.65 }}>
              {step === 1
                ? 'We verify your email before creating the participant account.'
                : `A 6-digit code was sent to ${email} and is valid for about ${Math.round(expiresIn / 60)} minutes.`}
            </Typography>

            {error && <Alert severity='error' sx={{ mt: 3 }}>{error}</Alert>}

            {step === 1 ? (
              <Box sx={{ display: 'grid', gap: 2.25, mt: 3.5 }}>
                <TextField
                  autoFocus
                  label='Full name'
                  value={fullName}
                  onChange={event => {
                    setFullName(event.target.value)
                    if (error) setError('')
                  }}
                  inputProps={{ maxLength: 150 }}
                  autoComplete='name'
                />
                <TextField
                  label='Email'
                  type='email'
                  value={email}
                  onChange={event => {
                    setEmail(event.target.value)
                    if (error) setError('')
                  }}
                  autoComplete='email'
                  helperText='Registration history is linked using this verified email.'
                />
                <Button
                  size='large'
                  variant='contained'
                  disabled={submitting}
                  onClick={() => void sendCode()}
                  startIcon={submitting ? <CircularProgress size={17} color='inherit' /> : undefined}
                  sx={{ justifySelf: { sm: 'start' }, minWidth: 190 }}
                >
                  {submitting ? 'Sending...' : 'Send verification code'}
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gap: 2.25, mt: 3.5 }}>
                <TextField
                  autoFocus
                  label='Verification code'
                  value={code}
                  onChange={event => {
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    if (error) setError('')
                  }}
                  inputProps={{
                    inputMode: 'numeric',
                    maxLength: 6,
                    style: { letterSpacing: '.18em', fontWeight: 800 }
                  }}
                  placeholder='000000'
                />

                <TextField
                  label='Password'
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={event => {
                    setPassword(event.target.value)
                    if (error) setError('')
                  }}
                  autoComplete='new-password'
                  error={Boolean(password) && Boolean(passwordPolicyError(password))}
                  helperText={
                    password
                      ? passwordPolicyError(password) || 'Password meets the security requirements.'
                      : '12–128 characters with uppercase, lowercase, number, and symbol.'
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          edge='end'
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword(value => !value)}
                        >
                          <i className={showPassword ? 'tabler-eye-off' : 'tabler-eye'} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                <TextField
                  label='Confirm password'
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={event => {
                    setConfirmPassword(event.target.value)
                    if (error) setError('')
                  }}
                  autoComplete='new-password'
                  error={Boolean(confirmPassword) && password !== confirmPassword}
                  helperText={
                    confirmPassword && password !== confirmPassword
                      ? 'Password confirmation does not match.'
                      : confirmPassword
                        ? 'Passwords match.'
                        : 'Re-enter the same password.'
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          edge='end'
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                          onClick={() => setShowConfirmPassword(value => !value)}
                        >
                          <i className={showConfirmPassword ? 'tabler-eye-off' : 'tabler-eye'} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                  <LegalConsentField
                    policies={legalPolicies}
                    loading={legalLoading}
                    error={legalError}
                    accepted={legalAccepted}
                    onAcceptedChange={setLegalAccepted}
                    onRetry={() => void loadLegalPolicies()}
                  />
                </Box>

                <Button
                  size='large'
                  variant='contained'
                  disabled={
                    submitting ||
                    legalLoading ||
                    !legalPolicies?.terms ||
                    !legalPolicies.privacy ||
                    !legalAccepted
                  }
                  onClick={() => void createAccount()}
                  startIcon={submitting ? <CircularProgress size={17} color='inherit' /> : undefined}
                  sx={{ justifySelf: { sm: 'start' }, minWidth: 170 }}
                >
                  {submitting ? 'Creating...' : 'Create account'}
                </Button>

                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    variant='text'
                    disabled={submitting || resendCooldown > 0}
                    onClick={() => void sendCode()}
                    sx={{ px: 0 }}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                  </Button>
                  <Button
                    variant='text'
                    disabled={submitting}
                    onClick={() => {
                      setStep(1)
                      setChallengeId('')
                      setCode('')
                      setPassword('')
                      setConfirmPassword('')
                      setShowPassword(false)
                      setShowConfirmPassword(false)
                      setLegalAccepted(false)
                      setError('')
                    }}
                  >
                    Change email
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default SignupPage
