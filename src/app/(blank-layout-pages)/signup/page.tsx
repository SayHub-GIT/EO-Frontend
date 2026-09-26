'use client'

import { useEffect, useRef, useState } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import LegalPolicyContent from '@/components/legal/LegalPolicyContent'
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
  const [rememberMe, setRememberMe] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [expiresIn, setExpiresIn] = useState(600)
  const [legalPolicies, setLegalPolicies] = useState<LegalPolicyBundle | null>(null)
  const [legalLoading, setLegalLoading] = useState(true)
  const [legalError, setLegalError] = useState('')
  const [legalScrolled, setLegalScrolled] = useState(false)
  const [legalAccepted, setLegalAccepted] = useState(false)
  const legalScrollRef = useRef<HTMLDivElement>(null)

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
      setLegalScrolled(false)

      const policies = await getPublicGlobalLegalPolicies()
      setLegalPolicies(policies)

      window.requestAnimationFrame(() => {
        const element = legalScrollRef.current
        if (element && element.scrollHeight <= element.clientHeight + 8) {
          setLegalScrolled(true)
        }
      })
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

  const handleLegalScroll = () => {
    const element = legalScrollRef.current
    if (!element || legalScrolled) return

    const remaining =
      element.scrollHeight -
      element.scrollTop -
      element.clientHeight

    if (remaining <= 8) {
      setLegalScrolled(true)
    }
  }

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


  useEffect(() => {
    if (step !== 2 || legalLoading || !legalPolicies?.terms || !legalPolicies.privacy) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      const element = legalScrollRef.current

      if (element && element.scrollHeight <= element.clientHeight + 8) {
        setLegalScrolled(true)
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [step, legalLoading, legalPolicies])

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

    if (!legalScrolled || !legalAccepted) {
      setError('Read the Terms and Privacy Policy to the end, then accept them to continue.')
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
        legalAccepted,
        rememberMe
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
              <Box sx={{ display: 'grid', gap: 1.25 }}>
                <Box>
                  <Typography fontWeight={850}>Terms & Privacy</Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: .5 }}>
                    Review both policies. Scroll to the end to unlock the acceptance checkbox.
                  </Typography>
                </Box>

                {legalError ? (
                  <Alert
                    severity='warning'
                    action={
                      <Button
                        color='inherit'
                        size='small'
                        disabled={legalLoading}
                        onClick={() => void loadLegalPolicies()}
                      >
                        Retry
                      </Button>
                    }
                  >
                    {legalError}
                  </Alert>
                ) : legalLoading ? (
                  <Box
                    sx={{
                      minHeight: 180,
                      display: 'grid',
                      placeItems: 'center',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2.5
                    }}
                  >
                    <CircularProgress size={28} />
                  </Box>
                ) : !legalPolicies?.terms || !legalPolicies.privacy ? (
                  <Alert severity='warning'>
                    Account creation is temporarily unavailable because the current Terms and Privacy Policy are not fully configured.
                  </Alert>
                ) : (
                  <>
                    <Box
                      ref={legalScrollRef}
                      onScroll={handleLegalScroll}
                      tabIndex={0}
                      aria-label='Terms and Privacy Policy'
                      sx={{
                        maxHeight: 300,
                        overflowY: 'auto',
                        p: 2,
                        border: '1px solid',
                        borderColor: legalScrolled ? 'success.main' : 'divider',
                        borderRadius: 2.5,
                        bgcolor: 'background.default',
                        outline: 'none',
                        '&:focus-visible': {
                          borderColor: 'primary.main',
                          boxShadow: theme => `0 0 0 3px ${theme.palette.primary.main}20`
                        }
                      }}
                    >
                      <Typography variant='h6' fontWeight={900}>
                        Terms of Service
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Version {legalPolicies.terms.version} · Published {new Date(legalPolicies.terms.publishedAtUtc).toLocaleDateString()}
                      </Typography>
                      <LegalPolicyContent html={legalPolicies.terms.content} />

                      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', my: 3 }} />

                      <Typography variant='h6' fontWeight={900}>
                        Privacy Policy
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Version {legalPolicies.privacy.version} · Published {new Date(legalPolicies.privacy.publishedAtUtc).toLocaleDateString()}
                      </Typography>
                      <LegalPolicyContent html={legalPolicies.privacy.content} />

                      <Box
                        sx={{
                          mt: 3,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: 'action.hover'
                        }}
                      >
                        <Typography variant='body2' fontWeight={750}>
                          End of Terms & Privacy
                        </Typography>
                      </Box>
                    </Box>

                    <Box>
                      <FormControlLabel
                        disabled={!legalScrolled}
                        control={
                          <Checkbox
                            checked={legalAccepted}
                            disabled={!legalScrolled}
                            onChange={event => setLegalAccepted(event.target.checked)}
                          />
                        }
                        label='I agree to the current Terms of Service and Privacy Policy'
                      />
                      <Typography
                        variant='caption'
                        color={legalScrolled ? 'text.secondary' : 'warning.main'}
                        sx={{ display: 'block', pl: 4 }}
                      >
                        {legalScrolled
                          ? 'You can now accept the policies and create your account.'
                          : 'Scroll the policy panel to the end to continue.'}
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={event => setRememberMe(event.target.checked)}
                  />
                }
                label='Remember me for 30 days'
              />
              <Button
                size='large'
                variant='contained'
                disabled={
                  submitting ||
                  legalLoading ||
                  !legalPolicies?.terms ||
                  !legalPolicies.privacy ||
                  !legalScrolled ||
                  !legalAccepted
                }
                onClick={() => void createAccount()}
                startIcon={submitting ? <CircularProgress size={17} color='inherit' /> : <i className='tabler-user-check' />}
              >
                Create Account
              </Button>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant='text'
                  disabled={submitting || resendCooldown > 0}
                  onClick={() => void sendCode()}
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
                    setLegalScrolled(false)
                    setError('')
                  }}
                >
                  Change email
                </Button>
              </Box>
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
