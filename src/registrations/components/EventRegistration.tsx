'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { styled, useColorScheme, useTheme } from '@mui/material/styles'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'
import { useSettings } from '@core/hooks/useSettings'
import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import LegalConsentField from '@/components/legal/LegalConsentField'

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

type Props = {
  slug: string
}

const RegistrationPage = styled('main')(({ theme }) => ({
  position: 'relative',
  minHeight: '100dvh',
  overflowX: 'hidden',
  overflowY: 'auto',
  color: theme.palette.text.primary,
  backgroundColor: theme.palette.background.default
}))

const RegistrationBackground = styled('div')(({ theme }) => ({
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  backgroundColor: theme.palette.background.default
}))

const RegistrationCard = styled('section')(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
  width: '100%',
  boxSizing: 'border-box',
  padding: theme.spacing(4.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: theme.palette.background.paper,
  boxShadow: 'none',
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
        setForm(current => ({ ...current, consent: false }))
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

        if (
          eventData &&
          /Terms or Privacy Policy changed/i.test(message)
        ) {
          try {
            const refreshedPolicies = await getPublicEventLegalPolicies(eventData.id)
            setLegalPolicies(refreshedPolicies)
            setForm(current => ({ ...current, consent: false }))
            setCoreErrors(current => ({ ...current, consent: undefined }))
          } catch {
            // Keep the original registration error visible; the next refresh will retry policy loading.
          }
        }
      } finally {
        setIsSubmitting(false)
      }
    } finally {
      submitLockRef.current = false
    }
  }

  const hasAvailablePackage = packages.some(item => !isPackageSoldOut(item))
  const messageLower = formMessage.toLowerCase()
  const messageIsError = [
    'failed',
    'error',
    'invalid',
    'sold out',
    'unavailable',
    'unable',
    'required',
    'not eligible',
    'denied',
    'forbidden'
  ].some(word => messageLower.includes(word))

  const accessMode = eventData?.accessMode ?? 'Public'
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

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 1120,
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 5 },
          py: { xs: 5, md: 8 }
        }}
      >
        <Button
          component={Link}
          href={`/events/${encodeURIComponent(slug)}`}
          variant='text'
          startIcon={<i className='tabler-arrow-left' />}
          sx={{ mb: { xs: 4, md: 6 }, px: 0, color: 'text.secondary' }}
        >
          Back to event
        </Button>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.78fr) minmax(0, 1.22fr)' },
            gap: { xs: 5, md: 8, lg: 10 },
            alignItems: 'start'
          }}
        >
          <Box sx={{ position: { md: 'sticky' }, top: { md: 48 } }}>
            <Box
              component='img'
              src={logoUrl}
              alt={`${eventData?.name ?? 'Program'} logo`}
              sx={{
                display: 'block',
                maxWidth: 190,
                maxHeight: 108,
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                mb: 5
              }}
            />

            <Typography
              sx={{
                color: '#00A7E1',
                fontSize: '0.72rem',
                fontWeight: 850,
                letterSpacing: '.07em'
              }}
            >
              EVENT REGISTRATION
            </Typography>

            {experience?.kind && (
              <Typography color='text.secondary' sx={{ mt: 1, fontSize: '0.82rem', fontWeight: 700 }}>
                {experience.kind}
              </Typography>
            )}

            <Typography
              component='h1'
              sx={{
                mt: 1.25,
                fontSize: { xs: '2rem', sm: '2.45rem', md: '2.8rem' },
                fontWeight: 900,
                lineHeight: 1.04,
                letterSpacing: '-.035em'
              }}
            >
              Register for {eventData?.name ?? 'Program / Event'}
            </Typography>

            <Typography
              color='text.secondary'
              sx={{ mt: 2, maxWidth: 460, fontSize: '0.94rem', lineHeight: 1.75 }}
            >
              {eventData?.description ?? 'Complete your participant information and choose an available registration option.'}
            </Typography>

            <Box sx={{ mt: 4.5, pt: 3, borderTop: '1px solid', borderColor: 'divider', display: 'grid', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: 'text.secondary' }}>ACCESS</Typography>
                <Typography sx={{ mt: 0.4, fontSize: '0.9rem' }}>
                  {accessMode === 'InvitationCode'
                    ? 'Invitation code required'
                    : accessMode === 'EmailDomain'
                      ? 'Eligible organization email required'
                      : 'Public registration'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: 'text.secondary' }}>PAYMENT</Typography>
                <Typography sx={{ mt: 0.4, fontSize: '0.9rem' }}>
                  Free options finish immediately; paid options continue to Midtrans.
                </Typography>
              </Box>
            </Box>
          </Box>

          <RegistrationCard>
            <Box sx={{ maxWidth: 620, mx: 'auto' }}>
              <Typography
                component='h2'
                sx={{ fontSize: { xs: '1.35rem', sm: '1.55rem' }, fontWeight: 850, letterSpacing: '-.02em' }}
              >
                Participant details
              </Typography>
              <Typography color='text.secondary' sx={{ mt: 0.75, mb: 3.5, fontSize: '0.9rem', lineHeight: 1.65 }}>
                Fill in the information below exactly as it should appear in the event registration record.
              </Typography>

            {accessMode === 'InvitationCode' && (
              <Alert severity='info' icon={<i className='tabler-ticket' />} sx={{ mt: 3 }}>
                This is an invitation-only event. Enter the invitation code provided by the organizer before submitting your registration.
              </Alert>
            )}

            {accessMode === 'EmailDomain' && (
              <Alert severity='info' icon={<i className='tabler-mail-check' />} sx={{ mt: 3 }}>
                This event is restricted to an eligible organization email domain. Use the approved work or organization email address when registering.
              </Alert>
            )}

            {paymentSession?.paymentRequired && (
              <Alert severity='info' sx={{ mt: 4 }}>
                Registration {paymentSession.bookingCode} has been created. Continue the same payment session to avoid duplicate reservations.
              </Alert>
            )}

            <Box component='form' noValidate onSubmit={handleSubmit} sx={{ mt: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Typography variant='subtitle2' color='text.secondary'>Participant information</Typography>

              <CustomTextField label='Full Name' required disabled={paymentLocked} placeholder='Enter your full name' value={form.fullName} onChange={event => updateField('fullName', event.target.value)} error={Boolean(coreErrors.fullName)} helperText={coreErrors.fullName} sx={fieldStyles} />
              <CustomTextField label='Email' required disabled={paymentLocked} type='email' placeholder='Enter your email address' value={form.email} onChange={event => updateField('email', event.target.value)} error={Boolean(coreErrors.email)} helperText={coreErrors.email} sx={fieldStyles} />

              {accessMode === 'InvitationCode' && (
                <CustomTextField
                  label='Invitation Code'
                  required
                  disabled={paymentLocked}
                  placeholder='Enter invitation code'
                  value={form.accessCode}
                  onChange={event => updateField('accessCode', event.target.value)}
                  error={Boolean(coreErrors.accessCode)}
                  helperText={coreErrors.accessCode ?? 'Invitation codes are case-sensitive.'}
                  inputProps={{ maxLength: 200 }}
                  sx={fieldStyles}
                />
              )}

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
                <Typography fontWeight={700}>Choose registration option *</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, mb: 2.25, lineHeight: 1.6 }}>
                  Pick the package that matches your registration. Availability and price below come directly from the event configuration.
                </Typography>

                {isLoadingData ? (
                  <Box sx={{ borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider', py: 3 }}>
                    <Typography color='text.secondary'>Loading registration options...</Typography>
                  </Box>
                ) : packages.length === 0 ? (
                  <Alert severity='warning'>No registration option is currently available.</Alert>
                ) : (
                  <Box sx={{ display: 'grid', gap: 1.25 }}>
                    {packages.map(item => {
                      const selected = form.eventPackageId === item.id
                      const soldOut = isPackageSoldOut(item)
                      const quotaLabel = item.isUnlimited
                        ? 'Unlimited quota'
                        : soldOut
                          ? 'Sold out'
                          : `${item.remainingQuota ?? 0} slot(s) remaining`

                      return (
                        <Button
                          key={item.id}
                          type='button'
                          aria-pressed={selected}
                          disabled={soldOut || paymentLocked}
                          onClick={() => updateField('eventPackageId', item.id)}
                          variant='outlined'
                          sx={{
                            px: { xs: 2, sm: 2.5 },
                            py: 2.25,
                            minHeight: 0,
                            justifyContent: 'stretch',
                            textAlign: 'left',
                            color: 'text.primary',
                            borderColor: selected ? 'primary.main' : 'divider',
                            borderWidth: selected ? 2 : 1,
                            bgcolor: selected ? 'action.selected' : 'transparent',
                            '&:hover': {
                              borderColor: selected ? 'primary.main' : 'text.secondary',
                              bgcolor: 'action.hover'
                            },
                            '&.Mui-disabled': {
                              color: 'text.disabled',
                              borderColor: 'divider',
                              bgcolor: 'transparent',
                              opacity: 0.65
                            }
                          }}
                        >
                          <Box sx={{ width: '100%', display: 'grid', gap: 1.5 }}>
                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto' },
                                gap: 1.5,
                                alignItems: 'start'
                              }}
                            >
                              <Box>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <Typography color='inherit' fontWeight={750}>{item.name}</Typography>
                                  {selected && (
                                    <Box component='span' sx={{ color: 'primary.main', display: 'inline-flex', alignItems: 'center' }}>
                                      <i className='tabler-circle-check-filled' aria-hidden='true' />
                                    </Box>
                                  )}
                                </Box>
                                <Typography
                                  variant='body2'
                                  color='text.secondary'
                                  sx={{ mt: 0.75, lineHeight: 1.55, whiteSpace: 'normal' }}
                                >
                                  {item.benefits?.trim() || 'Benefits / inclusions will be announced.'}
                                </Typography>
                              </Box>

                              <Typography
                                color='inherit'
                                fontWeight={800}
                                sx={{ fontSize: '0.95rem', whiteSpace: 'nowrap' }}
                              >
                                {item.price === 0 ? 'Free' : `Rp ${item.price.toLocaleString('id-ID')}`}
                              </Typography>
                            </Box>

                            <Box sx={{ pt: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
                              <Typography
                                variant='caption'
                                sx={{
                                  color: soldOut ? 'error.main' : 'text.secondary',
                                  fontWeight: soldOut ? 700 : 600
                                }}
                              >
                                {quotaLabel}
                              </Typography>
                            </Box>
                          </Box>
                        </Button>
                      )
                    })}
                  </Box>
                )}
                {coreErrors.eventPackageId && (
                  <Typography variant='caption' color='error' sx={{ display: 'block', mt: 1 }}>
                    {coreErrors.eventPackageId}
                  </Typography>
                )}
              </Box>

              {registrationImageUrl && (
                <Box sx={{ mt: 1 }}>
                  {registrationImageTitle && <Typography fontWeight={600} sx={{ mb: 1.5 }}>{registrationImageTitle}</Typography>}
                  <Box component='a' href={registrationImageUrl} target='_blank' rel='noreferrer' sx={{ display: 'block', overflow: 'hidden', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Box component='img' src={registrationImageUrl} alt={registrationImageTitle || `${eventData?.name ?? 'Program'} registration guide`} sx={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} />
                  </Box>
                </Box>
              )}

              <Box sx={{ display: 'grid', gap: 0.75 }}>
                <LegalConsentField
                  policies={legalPolicies}
                  loading={isLoadingData}
                  accepted={form.consent}
                  disabled={paymentLocked}
                  onAcceptedChange={value => updateField('consent', value)}
                  eventId={eventData?.id}
                />
                {coreErrors.consent && (
                  <Typography color='error' variant='caption'>
                    {coreErrors.consent}
                  </Typography>
                )}
              </Box>

              {formMessage && <Alert severity={messageIsError ? 'error' : 'info'}>{formMessage}</Alert>}

              <Button
                fullWidth
                type='submit'
                variant='contained'
                size='large'
                color={isFreePackage && !paymentSession ? 'success' : 'primary'}
                disabled={
                  isSubmitting ||
                  isLoadingData ||
                  !eventData ||
                  !experience ||
                  (
                    !paymentSession &&
                    (
                      !legalPolicies?.terms ||
                      !legalPolicies.privacy ||
                      !form.consent ||
                      !form.eventPackageId ||
                      !hasAvailablePackage
                    )
                  )
                }
              >
                {isSubmitting ? (isFreePackage ? 'Confirming Registration...' : 'Opening Payment...') : paymentSession?.paymentRequired ? 'Continue Payment' : isFreePackage ? 'Register Free' : 'Register & Pay'}
              </Button>
            </Box>
          </Box>
        </RegistrationCard>
      </Box>
    </Box>

    </RegistrationPage>
  )
}

export default EventRegistration
