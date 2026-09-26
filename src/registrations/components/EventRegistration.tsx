'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { styled, useColorScheme, useTheme } from '@mui/material/styles'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'
import { useSettings } from '@core/hooks/useSettings'
import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import LegalPolicyContent from '@/components/legal/LegalPolicyContent'

import { getEventPackages, getPublicEventBySlug, type EventPackage, type PublicEvent } from '@/lib/api'
import {
  getPublicEventLegalPolicies,
  type LegalPolicyBundle
} from '@/lib/legal-policies'
import {
  getPublicEventExperience,
  type EventExperienceConfig,
  type RegistrationFieldDefinition
} from '@/lib/event-experience'
import { openMidtransSnap } from '../lib/midtrans'
import { createExternalRegistrationPayment, type RegistrationPaymentResponse } from '../services/registration.service'

type RegistrationFormData = {
  fullName: string
  email: string
  whatsappNumber: string
  accessCode: string
  eventPackageId: string
  consent: boolean
}

type CoreFieldKey = keyof RegistrationFormData
type CoreErrors = Partial<Record<CoreFieldKey, string>>
type CustomAnswers = Record<string, string>
type CustomErrors = Record<string, string | undefined>

type Props = { slug: string }

const RegistrationPage = styled('main')({
  position: 'relative',
  minHeight: '100dvh',
  overflowX: 'hidden',
  overflowY: 'auto'
})

const RegistrationBackground = styled('div')(({ theme }) => ({
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  backgroundImage: theme.palette.mode === 'dark' ? "url('/Dark.png')" : "url('/back.png')",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
}))

const RegistrationCard = styled('section')(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
  width: 'min(100%, 680px)',
  boxSizing: 'border-box',
  margin: '0 auto',
  padding: theme.spacing(4),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[12],
  '@media (max-width: 600px)': { padding: theme.spacing(2.5) }
}))

const fieldStyles = {
  '& .MuiInputBase-root': { minHeight: 50 },
  '& .MuiInputBase-input': {
    '&:-webkit-autofill': {
      WebkitBoxShadow: '0 0 0 1000px transparent inset',
      WebkitTextFillColor: 'var(--mui-palette-text-primary)'
    }
  }
}

const initialForm: RegistrationFormData = {
  fullName: '',
  email: '',
  whatsappNumber: '',
  accessCode: '',
  eventPackageId: '',
  consent: false
}

const validateCore = (
  form: RegistrationFormData,
  accessMode?: string
): CoreErrors => {
  const errors: CoreErrors = {}

  if (!form.fullName.trim()) errors.fullName = 'Full Name is required.'
  if (!form.email.trim()) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Please enter a valid email address.'
  if (!form.whatsappNumber.trim()) errors.whatsappNumber = 'WhatsApp Number is required.'
  if (accessMode === 'InvitationCode' && !form.accessCode.trim()) {
    errors.accessCode = 'Invitation code is required.'
  }
  if (!form.eventPackageId) errors.eventPackageId = 'Please select a registration option.'
  if (!form.consent) errors.consent = 'You must agree to the current Terms and Privacy Policy.'

  return errors
}

const validateCustom = (
  fields: RegistrationFieldDefinition[],
  answers: CustomAnswers
): CustomErrors => {
  const errors: CustomErrors = {}

  for (const field of fields) {
    const value = answers[field.key]?.trim() ?? ''
    if (field.required && !value) errors[field.key] = `${field.label} is required.`
    if (field.type === 'select' && value && !field.options.includes(value)) {
      errors[field.key] = `Please select a valid ${field.label.toLowerCase()}.`
    }
    if (field.type === 'number' && value) {
      const numericValue = Number(value)
      if (!Number.isFinite(numericValue)) errors[field.key] = `${field.label} must be a valid number.`
    }
  }

  return errors
}

const isPackageSoldOut = (eventPackage: EventPackage) =>
  !eventPackage.isUnlimited && typeof eventPackage.remainingQuota === 'number' && eventPackage.remainingQuota <= 0

const EventRegistration = ({ slug }: Props) => {
  const theme = useTheme()
  const { setMode } = useColorScheme()
  const { updateSettings } = useSettings()
  const router = useRouter()

  const [form, setForm] = useState<RegistrationFormData>(initialForm)
  const [coreErrors, setCoreErrors] = useState<CoreErrors>({})
  const [customAnswers, setCustomAnswers] = useState<CustomAnswers>({})
  const [customErrors, setCustomErrors] = useState<CustomErrors>({})
  const [experience, setExperience] = useState<EventExperienceConfig | null>(null)
  const [legalPolicies, setLegalPolicies] = useState<LegalPolicyBundle | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [formMessage, setFormMessage] = useState('')
  const [eventData, setEventData] = useState<PublicEvent | null>(null)
  const [packages, setPackages] = useState<EventPackage[]>([])
  const [paymentSession, setPaymentSession] = useState<RegistrationPaymentResponse | null>(null)
  const submitLockRef = useRef(false)

  const paymentLocked = paymentSession?.paymentRequired === true
  const selectedPackage = useMemo(
    () => packages.find(item => item.id === form.eventPackageId) ?? null,
    [packages, form.eventPackageId]
  )
  const isFreePackage = selectedPackage?.price === 0
  const customFields = experience?.registrationFields ?? []

  useEffect(() => {
    let mounted = true

    const loadRegistrationData = async () => {
      try {
        setIsLoadingData(true)
        setFormMessage('')

        const loadedEvent = await getPublicEventBySlug(slug)
        const [loadedPackages, loadedExperience, loadedLegalPolicies] = await Promise.all([
          getEventPackages(loadedEvent.id),
          getPublicEventExperience(loadedEvent.id),
          getPublicEventLegalPolicies(loadedEvent.id)
        ])

        if (!mounted) return

        const activePackages = loadedPackages
          .filter(item => item.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)

        setEventData(loadedEvent)
        setPackages(activePackages)
        setExperience(loadedExperience)
        setLegalPolicies(loadedLegalPolicies)
        setCustomAnswers(
          Object.fromEntries(loadedExperience.registrationFields.map(field => [field.key, '']))
        )

        const availablePackages = activePackages.filter(item => !isPackageSoldOut(item))
        if (availablePackages.length === 1) {
          setForm(current => ({ ...current, eventPackageId: availablePackages[0].id }))
        }
      } catch (error) {
        if (mounted) {
          setEventData(null)
          setPackages([])
          setExperience(null)
          setLegalPolicies(null)
          setFormMessage(error instanceof Error ? error.message : 'Unable to load registration data.')
        }
      } finally {
        if (mounted) setIsLoadingData(false)
      }
    }

    void loadRegistrationData()
    return () => { mounted = false }
  }, [slug])

  const updateField = <K extends CoreFieldKey>(field: K, value: RegistrationFormData[K]) => {
    if (paymentLocked) return
    setForm(current => ({ ...current, [field]: value }))
    setCoreErrors(current => ({ ...current, [field]: undefined }))
    setFormMessage('')
  }

  const updateCustomField = (key: string, value: string) => {
    if (paymentLocked) return
    setCustomAnswers(current => ({ ...current, [key]: value }))
    setCustomErrors(current => ({ ...current, [key]: undefined }))
    setFormMessage('')
  }

  const handleToggleMode = () => {
    const nextMode = theme.palette.mode === 'dark' ? 'light' : 'dark'
    setMode(nextMode)
    updateSettings({ mode: nextMode })
  }

  const redirectToStatus = (session: RegistrationPaymentResponse) => {
    router.push(`/registration/${encodeURIComponent(session.bookingCode)}/status`)
  }

  const redirectToPaymentResult = (status: 'success' | 'pending', session: RegistrationPaymentResponse) => {
    const query = new URLSearchParams({ registrationId: session.registrationId, bookingCode: session.bookingCode })
    router.push(`/events/${encodeURIComponent(slug)}/payment-${status}?${query.toString()}`)
  }

  const openPayment = async (session: RegistrationPaymentResponse) => {
    if (!session.paymentRequired || !session.snapToken) {
      redirectToStatus(session)
      return
    }

    setIsSubmitting(true)
    setFormMessage('Opening secure payment...')

    try {
      await openMidtransSnap(session.snapToken, {
        onSuccess: () => {
          pushAppAlert({ severity: 'success', message: 'Payment completed successfully.' })
          redirectToPaymentResult('success', session)
        },
        onPending: () => {
          pushAppAlert({ severity: 'info', message: 'Payment is pending confirmation.' })
          redirectToPaymentResult('pending', session)
        },
        onError: () => {
          const message = 'Payment failed. Your registration is still available to retry from this page.'
          setFormMessage(message)
          pushAppAlert({ severity: 'error', message })
        },
        onClose: () => setFormMessage('Payment window was closed. Click Continue Payment to reopen the same payment session.')
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to open payment. Please try again.'
      setFormMessage(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (submitEvent: React.FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()

    if (isSubmitting || submitLockRef.current) return
    submitLockRef.current = true

    try {
      if (paymentSession?.paymentRequired) {
        await openPayment(paymentSession)
        return
      }

      const nextCoreErrors = validateCore(form, eventData?.accessMode)
      const nextCustomErrors = validateCustom(customFields, customAnswers)
      setCoreErrors(nextCoreErrors)
      setCustomErrors(nextCustomErrors)

      if (Object.keys(nextCoreErrors).length > 0 || Object.keys(nextCustomErrors).length > 0) return

      if (
        !eventData ||
        !selectedPackage ||
        !experience ||
        !legalPolicies?.terms ||
        !legalPolicies.privacy
      ) {
        setFormMessage('Program configuration, legal policies, or registration option is no longer available. Please refresh the page.')
        return
      }

      if (isPackageSoldOut(selectedPackage)) {
        setCoreErrors(current => ({ ...current, eventPackageId: 'This registration option is sold out.' }))
        return
      }

      setIsSubmitting(true)
      setFormMessage(isFreePackage ? 'Confirming your free registration...' : 'Creating your registration and secure payment session...')

      try {
        const normalizedCustomFields = Object.fromEntries(
          customFields.map(field => [field.key, customAnswers[field.key]?.trim() || null])
        )

        const result = await createExternalRegistrationPayment(eventData.id, {
          eventPackageId: form.eventPackageId,
          termsPolicyId: legalPolicies.terms.id,
          privacyPolicyId: legalPolicies.privacy.id,
          accessCode: eventData.accessMode === 'InvitationCode'
            ? form.accessCode.trim()
            : null,
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.whatsappNumber.trim(),
          organization: normalizedCustomFields.institution ?? normalizedCustomFields.organization ?? null,
          department: normalizedCustomFields.position ?? null,
          customFields: normalizedCustomFields
        })

        if (!result.paymentRequired) {
          pushAppAlert({ severity: 'success', message: 'Registration completed successfully.' })
          redirectToStatus(result)
          return
        }

        setPaymentSession(result)
        await openPayment(result)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Registration failed. Please try again.'
        setFormMessage(message)
        pushAppAlert({ severity: 'error', message })
      } finally {
        setIsSubmitting(false)
      }
    } finally {
      submitLockRef.current = false
    }
  }

  const hasAvailablePackage = packages.some(item => !isPackageSoldOut(item))
  const messageLower = formMessage.toLowerCase()
  const messageIsError = ['failed', 'error', 'invalid', 'sold out', 'unavailable', 'unable', 'required'].some(word => messageLower.includes(word))

  const logoUrl = eventData?.logoUrl || '/EO%20Navbar.png'
  const registrationImageUrl = eventData?.registrationImageUrl || undefined
  const registrationImageTitle = eventData?.registrationImageTitle || undefined

  const renderDynamicField = (field: RegistrationFieldDefinition) => {
    const value = customAnswers[field.key] ?? ''
    const commonProps = {
      label: field.label,
      required: field.required,
      disabled: paymentLocked,
      value,
      error: Boolean(customErrors[field.key]),
      helperText: customErrors[field.key],
      sx: fieldStyles,
      fullWidth: true
    }

    if (field.type === 'select') {
      return (
        <CustomTextField
          key={field.key}
          {...commonProps}
          select
          onChange={event => updateCustomField(field.key, event.target.value)}
        >
          {field.options.map(option => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </CustomTextField>
      )
    }

    return (
      <CustomTextField
        key={field.key}
        {...commonProps}
        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
        multiline={field.type === 'textarea'}
        minRows={field.type === 'textarea' ? 3 : undefined}
        InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
        inputProps={field.type === 'number' ? { step: 'any', inputMode: 'decimal' } : undefined}
        onChange={event => updateCustomField(field.key, event.target.value)}
      />
    )
  }

  return (
    <RegistrationPage>
      <RegistrationBackground aria-hidden='true' />

      <Button
        aria-label={theme.palette.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={handleToggleMode}
        variant='contained'
        sx={{ position: 'fixed', right: 20, top: 20, zIndex: 20, minWidth: 44, width: 44, height: 44, p: 0, borderRadius: 2 }}
      >
        <i className={theme.palette.mode === 'dark' ? 'tabler-sun' : 'tabler-moon'} />
      </Button>

      <Box sx={{ position: 'relative', zIndex: 1, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 2, sm: 3 }, py: 5 }}>
        <RegistrationCard>
          <Box sx={{ maxWidth: 540, mx: 'auto' }}>
            <Button component={Link} href={`/events/${encodeURIComponent(slug)}`} variant='text' startIcon={<i className='tabler-arrow-left' />} sx={{ mb: 2, px: 0, color: 'text.secondary' }}>
              Back to program
            </Button>

            <Box component='img' src={logoUrl} alt={`${eventData?.name ?? 'Program'} logo`} sx={{ display: 'block', maxWidth: 230, maxHeight: 150, width: 'auto', height: 'auto', objectFit: 'contain', mx: 'auto', mb: 4 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
              {experience?.kind && <Chip label={experience.kind} color='primary' variant='tonal' size='small' />}
           </Box>

            <Typography variant='h4' sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: { xs: '1.5rem', sm: '1.8rem' } }}>
              Register for {eventData?.name ?? 'Program / Event'}
            </Typography>
            <Typography color='text.secondary' sx={{ mt: 1, lineHeight: 1.6 }}>
              {eventData?.description ?? 'Complete your participant information and choose an available registration option.'}
            </Typography>

            {paymentSession?.paymentRequired && (
              <Alert severity='info' sx={{ mt: 4 }}>
                Registration {paymentSession.bookingCode} has been created. Continue the same payment session to avoid duplicate reservations.
              </Alert>
            )}

            <Box component='form' noValidate onSubmit={handleSubmit} sx={{ mt: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Typography variant='subtitle2' color='text.secondary'>Participant information</Typography>

              <CustomTextField label='Full Name' required disabled={paymentLocked} placeholder='Enter your full name' value={form.fullName} onChange={event => updateField('fullName', event.target.value)} error={Boolean(coreErrors.fullName)} helperText={coreErrors.fullName} sx={fieldStyles} />
              <CustomTextField label='Email' required disabled={paymentLocked} type='email' placeholder='Enter your email address' value={form.email} onChange={event => updateField('email', event.target.value)} error={Boolean(coreErrors.email)} helperText={coreErrors.email} sx={fieldStyles} />
              <CustomTextField label='WhatsApp Number' required disabled={paymentLocked} type='number' placeholder='08xxxxxxxxxx' value={form.whatsappNumber} onChange={event => updateField('whatsappNumber', event.target.value)} error={Boolean(coreErrors.whatsappNumber)} helperText={coreErrors.whatsappNumber} sx={fieldStyles} />

              {customFields.length > 0 && (
                <>
                  <Typography variant='subtitle2' color='text.secondary' sx={{ mt: 7, p: 0, mb: 1.5 }}>
                    Additional information
                  </Typography>
                  {customFields.map(renderDynamicField)}
                </>
              )}

              <Box>
                <Typography fontWeight={600}>Choose Registration Option *</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, mb: 2 }}>
                  Free options register immediately. Paid options continue to secure Midtrans payment.
                </Typography>

                {isLoadingData ? (
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3, textAlign: 'center' }}><Typography color='text.secondary'>Loading program configuration...</Typography></Box>
                ) : packages.length === 0 ? (
                  <Alert severity='warning'>No registration option is currently available.</Alert>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                    {packages.map(item => {
                      const selected = form.eventPackageId === item.id
                      const soldOut = isPackageSoldOut(item)
                      return (
                        <Button key={item.id} type='button' disabled={soldOut || paymentLocked} onClick={() => updateField('eventPackageId', item.id)} variant={selected ? 'contained' : 'outlined'} color={item.price === 0 ? 'success' : 'primary'} sx={{ p: 2.5, justifyContent: 'flex-start', textAlign: 'left', alignItems: 'stretch', flexDirection: 'column', minHeight: 170 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, width: '100%' }}>
                            <Typography color='inherit' fontWeight={700}>{item.name}</Typography>
                            {item.price === 0 && <Chip label='Free' size='small' color='success' variant='tonal' />}
                          </Box>
                          <Typography color='inherit' fontWeight={700} sx={{ mt: 1 }}>{item.price === 0 ? 'Free' : `Rp ${item.price.toLocaleString('id-ID')}`}</Typography>
                          <Typography variant='body2' color='inherit' sx={{ mt: 2, opacity: 0.85, whiteSpace: 'normal' }}>{item.benefits?.trim() || 'Benefits / inclusions will be announced.'}</Typography>
                          <Typography variant='caption' color='inherit' sx={{ mt: 'auto', pt: 2, opacity: 0.75 }}>{item.isUnlimited ? 'Unlimited quota' : soldOut ? 'Sold out' : `${item.remainingQuota ?? 0} slot(s) remaining`}</Typography>
                        </Button>
                      )
                    })}
                  </Box>
                )}
                {coreErrors.eventPackageId && <Typography variant='caption' color='error'>{coreErrors.eventPackageId}</Typography>}
              </Box>

              {registrationImageUrl && (
                <Box sx={{ mt: 1 }}>
                  {registrationImageTitle && <Typography fontWeight={600} sx={{ mb: 1.5 }}>{registrationImageTitle}</Typography>}
                  <Box component='a' href={registrationImageUrl} target='_blank' rel='noreferrer' sx={{ display: 'block', overflow: 'hidden', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Box component='img' src={registrationImageUrl} alt={registrationImageTitle || `${eventData?.name ?? 'Program'} registration guide`} sx={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} />
                  </Box>
                </Box>
              )}

              <Box>
                <FormControlLabel control={<Checkbox disabled={paymentLocked} checked={form.consent} onChange={event => updateField('consent', event.target.checked)} />} label='I agree to the processing of my personal data for the purposes of this program / event.' sx={{ alignItems: 'flex-start', color: 'text.secondary' }} />
                {coreErrors.consent && <Typography color='error' variant='caption'>{coreErrors.consent}</Typography>}
              </Box>

              {formMessage && <Alert severity={messageIsError ? 'error' : 'info'}>{formMessage}</Alert>}

              <Button fullWidth type='submit' variant='contained' size='large' color={isFreePackage && !paymentSession ? 'success' : 'primary'} disabled={isSubmitting || isLoadingData || !eventData || !experience || (!paymentSession && (!form.eventPackageId || !hasAvailablePackage))}>
                {isSubmitting ? (isFreePackage ? 'Confirming Registration...' : 'Opening Payment...') : paymentSession?.paymentRequired ? 'Continue Payment' : isFreePackage ? 'Register Free' : 'Register & Pay'}
              </Button>
            </Box>
          </Box>
        </RegistrationCard>
      </Box>
    </RegistrationPage>
  )
}

export default EventRegistration
