'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import GoogleMapPreview from '@/components/public/GoogleMapPreview'
import PublicEventQuizSection from '@/components/quiz/PublicEventQuizSection'
import { getEventPackages, type EventPackage, type PublicEvent } from '@/lib/api'
import {
  parseEventBenefits,
  parseEventContentSections,
  sanitizeRichHtml
} from '@/lib/event-content'
import {
  EVENT_MODULE_DEFINITIONS,
  getPublicEventExperience,
  type EventExperienceConfig,
  type EventModuleKey,
  type EventWorkspaceItem
} from '@/lib/event-experience'

type Props = { event: PublicEvent }

type RegistrationAvailability = {
  enabled: boolean
  label: string
  tone: 'open' | 'upcoming' | 'closed'
}

const categoryHref = (type?: string) => {
  const normalized = type?.trim().toLowerCase() ?? ''

  if (normalized.includes('run')) return '/events/category/running'
  if (normalized.includes('seminar')) return '/events/category/seminar'
  if (normalized.includes('workshop')) return '/events/category/workshop'

  return '/events/category/other'
}

const getRegistrationAvailability = (
  event: PublicEvent
): RegistrationAvailability => {
  if (typeof event.remainingQuota === 'number' && event.remainingQuota <= 0) {
    return { enabled: false, label: 'Participant quota is full', tone: 'closed' }
  }

  const now = Date.now()
  const opensAt = event.registrationStart
    ? new Date(event.registrationStart).getTime()
    : Number.NaN
  const closesAt = event.registrationEnd
    ? new Date(event.registrationEnd).getTime()
    : Number.NaN

  if (!Number.isNaN(opensAt) && now < opensAt) {
    return { enabled: false, label: 'Registration has not opened yet', tone: 'upcoming' }
  }

  if (!Number.isNaN(closesAt) && now > closesAt) {
    return { enabled: false, label: 'Registration is closed', tone: 'closed' }
  }

  const status = event.registrationStatus
    ?.toLowerCase()
    .replace(/[\s_-]/g, '') ?? ''

  if (
    ['archived', 'cancelled', 'canceled', 'closed', 'registrationclosed', 'soldout', 'full', 'ended']
      .some(value => status.includes(value))
  ) {
    return { enabled: false, label: 'Registration is unavailable', tone: 'closed' }
  }

  if (status.includes('comingsoon') || status.includes('upcoming')) {
    return { enabled: false, label: 'Registration opens soon', tone: 'upcoming' }
  }

  return { enabled: true, label: 'Registration is open', tone: 'open' }
}

const parseDate = (value?: string) => {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDateTime = (value?: string) => {
  const date = parseDate(value)

  if (!date) return value || 'To be announced'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const formatEventDate = (event: PublicEvent) => {
  const start = parseDate(event.startDate)
  const end = parseDate(event.endDate)

  if (!start) return 'Date to be announced'

  const startText = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(start)

  if (!end || start.toDateString() === end.toDateString()) return startText

  const endText = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(end)

  return `${startText} – ${endText}`
}

const formatPrice = (value: number) =>
  value <= 0
    ? 'Free'
    : new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(value)

const splitLines = (value?: string) =>
  (value ?? '')
    .split(/\r?\n/)
    .map(item => item.trim().replace(/^[-•]\s*/, ''))
    .filter(Boolean)

const stripHtml = (value: string) =>
  value.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()

const SectionHeading = ({
  eyebrow,
  title,
  description
}: {
  eyebrow: string
  title: string
  description?: string
}) => (
  <Box sx={{ mb: 3 }}>
    <Typography
      sx={{
        color: '#00A7E1',
        fontSize: '0.7rem',
        fontWeight: 850,
        letterSpacing: '.08em'
      }}
    >
      {eyebrow}
    </Typography>
    <Typography
      component='h2'
      sx={{
        mt: 1,
        fontSize: { xs: '1.55rem', md: '1.9rem' },
        lineHeight: 1.12,
        fontWeight: 900,
        letterSpacing: '-.02em'
      }}
    >
      {title}
    </Typography>
    {description && (
      <Typography
        color='text.secondary'
        sx={{
          mt: 1,
          maxWidth: 760,
          fontSize: '0.9rem',
          lineHeight: 1.7
        }}
      >
        {description}
      </Typography>
    )}
  </Box>
)

const FactRow = ({
  icon,
  label,
  value
}: {
  icon: string
  label: string
  value: React.ReactNode
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: '34px minmax(0,1fr)',
      gap: 1.25,
      alignItems: 'start'
    }}
  >
    <Box
      sx={{
        width: 34,
        height: 34,
        display: 'grid',
        placeItems: 'center',
        color: 'text.secondary'
      }}
    >
      <i className={icon} aria-hidden='true' />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          color: 'text.secondary',
          fontSize: '0.66rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '.055em'
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          mt: 0.25,
          fontSize: '0.82rem',
          lineHeight: 1.55,
          overflowWrap: 'anywhere'
        }}
      >
        {value}
      </Typography>
    </Box>
  </Box>
)

const PackageOption = ({
  event,
  eventPackage,
  registrationEnabled
}: {
  event: PublicEvent
  eventPackage: EventPackage
  registrationEnabled: boolean
}) => {
  const soldOut =
    !eventPackage.isUnlimited &&
    typeof eventPackage.remainingQuota === 'number' &&
    eventPackage.remainingQuota <= 0

  return (
    <Box
      sx={{
        height: '100%',
        p: { xs: 2.25, md: 2.75 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box>
        <Typography sx={{ fontSize: '0.95rem', fontWeight: 850 }}>
          {eventPackage.name}
        </Typography>
        <Typography
          sx={{
            mt: 0.7,
            fontSize: '1.35rem',
            lineHeight: 1.1,
            fontWeight: 900
          }}
        >
          {formatPrice(eventPackage.price)}
        </Typography>
      </Box>

      {eventPackage.benefits && (
        <Box sx={{ mt: 2, display: 'grid', gap: 0.85 }}>
          {splitLines(eventPackage.benefits).map(benefit => (
            <Box
              key={benefit}
              sx={{
                display: 'grid',
                gridTemplateColumns: '18px minmax(0,1fr)',
                gap: 0.8,
                alignItems: 'start'
              }}
            >
              <i className='tabler-check text-success text-sm' aria-hidden='true' />
              <Typography
                color='text.secondary'
                sx={{ fontSize: '0.76rem', lineHeight: 1.55 }}
              >
                {benefit}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      <Typography
        color='text.secondary'
        sx={{ mt: 2.25, mb: 2, fontSize: '0.72rem' }}
      >
        {eventPackage.isUnlimited
          ? 'Unlimited quota'
          : soldOut
            ? 'Sold out'
            : `${Math.max(0, eventPackage.remainingQuota ?? 0).toLocaleString('id-ID')} slot(s) remaining`}
      </Typography>

      <Button
        component={Link}
        href={`/events/${encodeURIComponent(event.slug)}/register`}
        variant='outlined'
        disabled={!registrationEnabled || soldOut}
        sx={{ mt: 'auto', minHeight: 40 }}
      >
        {soldOut ? 'Sold Out' : 'Choose Option'}
      </Button>
    </Box>
  )
}

const PUBLIC_MODULE_ORDER: EventModuleKey[] = [
  'race-categories',
  'race-pack',
  'speakers',
  'sessions',
  'agenda',
  'doorprize',
  'booths',
  'certificates'
]

const WorkspacePublicSection = ({
  moduleKey,
  items
}: {
  moduleKey: EventModuleKey
  items: EventWorkspaceItem[]
}) => {
  const moduleDefinition = EVENT_MODULE_DEFINITIONS.find(
    item => item.key === moduleKey
  )
  const activeItems = items.filter(item => item.active !== false)

  if (!moduleDefinition || activeItems.length === 0) return null

  return (
    <Box component='section'>
      <SectionHeading
        eyebrow='EVENT EXPERIENCE'
        title={moduleDefinition.label}
        description={moduleDefinition.description}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2,minmax(0,1fr))',
            xl: 'repeat(3,minmax(0,1fr))'
          },
          gap: 1.5
        }}
      >
        {activeItems.map(item => {
          const details = Object.entries(item).filter(
            ([key, value]) =>
              !['id', 'title', 'active'].includes(key) &&
              value !== null &&
              value !== undefined &&
              String(value).trim()
          )

          return (
            <Box
              key={item.id}
              sx={{
                p: 2.25,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper'
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '38px minmax(0,1fr)',
                  gap: 1.25,
                  alignItems: 'start'
                }}
              >
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 1.5,
                    bgcolor: 'action.hover',
                    color: 'primary.main'
                  }}
                >
                  <i className={moduleDefinition.icon} aria-hidden='true' />
                </Box>
                <Typography
                  sx={{
                    pt: 0.65,
                    fontSize: '0.9rem',
                    fontWeight: 850,
                    lineHeight: 1.35
                  }}
                >
                  {item.title}
                </Typography>
              </Box>

              {details.length > 0 && (
                <Box
                  sx={{
                    mt: 2,
                    pt: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    display: 'grid',
                    gap: 1.35
                  }}
                >
                  {details.map(([key, value]) => (
                    <Box key={key}>
                      <Typography
                        color='text.secondary'
                        sx={{
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '.045em'
                        }}
                      >
                        {key
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/-/g, ' ')}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.25,
                          fontSize: '0.78rem',
                          lineHeight: 1.55,
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {String(value)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

const EventDetail = ({ event }: Props) => {
  const [packages, setPackages] = useState<EventPackage[]>([])
  const [experience, setExperience] =
    useState<EventExperienceConfig | null>(null)
  const [packageError, setPackageError] = useState('')
  const [loadingPackages, setLoadingPackages] = useState(true)

  const availability = getRegistrationAvailability(event)
  const heroUrl = event.heroImageUrl || event.imageUrl || '/back.png'
  const logoUrl = event.logoUrl || '/EO%20Navbar.png'

  const benefits = useMemo(
    () =>
      parseEventBenefits(event.benefits).filter(item => item.title.trim()),
    [event.benefits]
  )

  const contentSections = useMemo(
    () =>
      parseEventContentSections(event.additionalInformation).filter(section =>
        stripHtml(section.contentHtml)
      ),
    [event.additionalInformation]
  )

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoadingPackages(true)
      setPackageError('')

      const [packageResult, experienceResult] = await Promise.allSettled([
        getEventPackages(event.id),
        getPublicEventExperience(event.id)
      ])

      if (!active) return

      if (packageResult.status === 'fulfilled') {
        setPackages(
          packageResult.value
            .filter(item => item.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        )
      } else {
        setPackages([])
        setPackageError(
          packageResult.reason instanceof Error
            ? packageResult.reason.message
            : 'Unable to load registration options.'
        )
      }

      setExperience(
        experienceResult.status === 'fulfilled'
          ? experienceResult.value
          : null
      )

      setLoadingPackages(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [event.id])

  const lowestPrice = useMemo(() => {
    if (packages.length === 0) return null
    return Math.min(...packages.map(item => item.price))
  }, [packages])

  return (
    <Box sx={{ bgcolor: 'background.default', color: 'text.primary' }}>
      <Box
        component='section'
        sx={{
          px: { xs: 2.5, sm: 3.5, lg: 4 },
          py: { xs: 4.5, md: 6.5 },
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1440,
            mx: 'auto',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: 'minmax(360px,.82fr) minmax(0,1.18fr)'
            },
            gap: { xs: 4, lg: 6 },
            alignItems: 'center'
          }}
        >
          <Box sx={{ maxWidth: 620 }}>
            <Typography
              component={Link}
              href={categoryHref(event.type)}
              sx={{
                color: '#00A7E1',
                textDecoration: 'none',
                fontSize: '0.7rem',
                fontWeight: 850,
                letterSpacing: '.08em',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              {event.type?.toUpperCase() || 'EVENT'}
            </Typography>

            <Box
              component='img'
              src={logoUrl}
              alt={`${event.name} logo`}
              sx={{
                mt: 2,
                display: 'block',
                width: 'auto',
                maxWidth: { xs: 150, sm: 185 },
                maxHeight: 72,
                objectFit: 'contain',
                objectPosition: 'left center'
              }}
            />

            <Typography
              component='h1'
              sx={{
                mt: 2.1,
                fontSize: { xs: '2.35rem', sm: '3rem', lg: '3.65rem' },
                lineHeight: 1.02,
                letterSpacing: '-.045em',
                fontWeight: 900
              }}
            >
              {event.name}
            </Typography>

            <Typography
              color='text.secondary'
              sx={{
                mt: 1.7,
                maxWidth: 580,
                fontSize: { xs: '0.95rem', md: '1rem' },
                lineHeight: 1.7
              }}
            >
              {event.description ||
                event.about ||
                'Discover the event details and registration information.'}
            </Typography>

            <Box
              sx={{
                mt: 2.8,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))' },
                gap: 1.6
              }}
            >
              <FactRow
                icon='tabler-calendar-event'
                label='Date'
                value={formatEventDate(event)}
              />
              <FactRow
                icon='tabler-map-pin'
                label='Location'
                value={event.location || event.city || 'To be announced'}
              />
            </Box>

            <Box
              sx={{
                mt: 3,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 1.25
              }}
            >
              <Button
                component={Link}
                href={`/events/${encodeURIComponent(event.slug)}/register`}
                variant='contained'
                disabled={!availability.enabled}
                endIcon={<i className='tabler-arrow-right' aria-hidden='true' />}
                sx={{
                  minHeight: 44,
                  px: 2.4,
                  bgcolor: '#07172B',
                  color: '#fff',
                  '&:hover': { bgcolor: '#0B2748' }
                }}
              >
                {availability.enabled ? 'Register Now' : 'Registration Unavailable'}
              </Button>

              {experience?.enabledModules.includes('quiz') && (
                <Button
                  component={Link}
                  href={`/events/${encodeURIComponent(event.slug)}/quiz`}
                  variant='outlined'
                  startIcon={
                    <i className='tabler-device-gamepad-2' aria-hidden='true' />
                  }
                  sx={{ minHeight: 44 }}
                >
                  Join Quiz
                </Button>
              )}

              <Typography
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.7,
                  color:
                    availability.tone === 'open'
                      ? '#5F9F00'
                      : 'text.secondary',
                  fontSize: '0.75rem',
                  fontWeight: 750
                }}
              >
                <Box
                  component='span'
                  aria-hidden='true'
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor:
                      availability.tone === 'open'
                        ? '#83C900'
                        : availability.tone === 'upcoming'
                          ? '#0073C7'
                          : 'text.disabled'
                  }}
                />
                {availability.label}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              overflow: 'hidden',
              borderRadius: 2,
              bgcolor: 'action.hover',
              minHeight: { xs: 260, sm: 380, lg: 470 }
            }}
          >
            <Box
              component='img'
              src={heroUrl}
              alt={event.name}
              sx={{
                display: 'block',
                width: '100%',
                height: '100%',
                minHeight: 'inherit',
                objectFit: 'cover'
              }}
            />
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          px: { xs: 2.5, sm: 3.5, lg: 4 },
          py: { xs: 5, md: 7 }
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1440,
            mx: 'auto',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: 'minmax(0,1fr) 320px'
            },
            gap: { xs: 5, lg: 6 },
            alignItems: 'start'
          }}
        >
          <Box
            sx={{
              minWidth: 0,
              display: 'grid',
              gap: { xs: 6, md: 7 }
            }}
          >
            <Box component='section'>
              <SectionHeading eyebrow='ABOUT' title='About this event' />
              <Typography
                color='text.secondary'
                sx={{
                  maxWidth: 860,
                  whiteSpace: 'pre-line',
                  fontSize: '0.94rem',
                  lineHeight: 1.85
                }}
              >
                {event.about ||
                  event.description ||
                  'More information will be available soon.'}
              </Typography>
            </Box>

            {benefits.length > 0 && (
              <Box component='section'>
                <SectionHeading
                  eyebrow='BENEFITS'
                  title='What you’ll get'
                />

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2,minmax(0,1fr))',
                      xl: 'repeat(3,minmax(0,1fr))'
                    },
                    gap: 1.5
                  }}
                >
                  {benefits.map(benefit => (
                    <Box
                      key={benefit.id}
                      sx={{
                        p: 2.25,
                        borderTop: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          display: 'grid',
                          placeItems: 'center',
                          color: 'primary.main'
                        }}
                      >
                        <i className={benefit.icon} aria-hidden='true' />
                      </Box>
                      <Typography
                        sx={{
                          mt: 1,
                          fontSize: '0.88rem',
                          fontWeight: 850
                        }}
                      >
                        {benefit.title}
                      </Typography>
                      {benefit.description && (
                        <Typography
                          color='text.secondary'
                          sx={{
                            mt: 0.6,
                            fontSize: '0.76rem',
                            lineHeight: 1.6
                          }}
                        >
                          {benefit.description}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {experience?.enabledModules.includes('quiz') && (
              <PublicEventQuizSection event={event} />
            )}

            {experience &&
              PUBLIC_MODULE_ORDER.map(moduleKey => (
                <WorkspacePublicSection
                  key={moduleKey}
                  moduleKey={moduleKey}
                  items={experience.moduleData?.[moduleKey] ?? []}
                />
              ))}

            <Box component='section' id='registration-options'>
              <SectionHeading
                eyebrow='REGISTRATION'
                title='Choose your registration option'
                description='Choose an available option below. Free options continue without payment.'
              />

              {loadingPackages && (
                <Box sx={{ py: 5, display: 'grid', placeItems: 'center' }}>
                  <CircularProgress size={30} />
                </Box>
              )}

              {packageError && <Alert severity='error'>{packageError}</Alert>}

              {!loadingPackages &&
                !packageError &&
                packages.length === 0 && (
                  <Alert severity='info'>
                    No active registration options are currently available.
                  </Alert>
                )}

              {!loadingPackages && packages.length > 0 && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2,minmax(0,1fr))',
                      xl: 'repeat(3,minmax(0,1fr))'
                    },
                    gap: 1.5
                  }}
                >
                  {packages.map(eventPackage => (
                    <PackageOption
                      key={eventPackage.id}
                      event={event}
                      eventPackage={eventPackage}
                      registrationEnabled={availability.enabled}
                    />
                  ))}
                </Box>
              )}
            </Box>

            {event.registrationImageUrl && (
              <Box component='section'>
                <SectionHeading
                  eyebrow='PROGRAM GUIDE'
                  title={event.registrationImageTitle || 'Program Guide'}
                />

                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                    bgcolor: 'background.paper'
                  }}
                >
                  <Box
                    component='img'
                    src={event.registrationImageUrl}
                    alt={event.registrationImageTitle || 'Program guide'}
                    sx={{
                      width: '100%',
                      maxHeight: 680,
                      display: 'block',
                      objectFit: 'contain'
                    }}
                  />
                </Box>
              </Box>
            )}

            {(event.location || event.venueAddress || event.mapsUrl) && (
              <Box component='section'>
                <SectionHeading eyebrow='LOCATION' title='Venue' />

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      xl: 'minmax(0,1.25fr) minmax(280px,.75fr)'
                    },
                    gap: 2
                  }}
                >
                  <Box
                    sx={{
                      minHeight: { xs: 320, md: 420 },
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <GoogleMapPreview
                      mapsUrl={event.mapsUrl}
                      fallbackQuery={
                        event.mapsUrl
                          ? null
                          : event.venueAddress || event.location
                      }
                      title={`${event.name} venue map`}
                    />
                  </Box>

                  <Box
                    sx={{
                      p: { xs: 2.25, md: 2.75 },
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <Typography sx={{ fontSize: '1rem', fontWeight: 850 }}>
                      {event.location || 'Venue'}
                    </Typography>

                    <Divider sx={{ my: 2.25 }} />

                    <Box sx={{ display: 'grid', gap: 2 }}>
                      <FactRow
                        icon='tabler-map-pin'
                        label='Venue name'
                        value={event.location || 'To be announced'}
                      />
                      <FactRow
                        icon='tabler-map-search'
                        label='Full address'
                        value={
                          event.venueAddress ||
                          event.address ||
                          event.location ||
                          'To be announced'
                        }
                      />
                      <FactRow
                        icon='tabler-calendar-clock'
                        label='Program time'
                        value={formatDateTime(event.startDate)}
                      />
                    </Box>

                    {event.mapsUrl && (
                      <Button
                        component='a'
                        href={event.mapsUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        variant='outlined'
                        startIcon={
                          <i
                            className='tabler-brand-google-maps'
                            aria-hidden='true'
                          />
                        }
                        sx={{ mt: 'auto', pt: 1.1, pb: 1.1 }}
                      >
                        Open in Google Maps
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
            )}

            {contentSections.map(section => (
              <Box component='section' key={section.id}>
                <SectionHeading
                  eyebrow='INFORMATION'
                  title={section.title || 'Additional Information'}
                />

                <Box
                  color='text.secondary'
                  sx={{
                    maxWidth: 920,
                    fontSize: '0.9rem',
                    lineHeight: 1.85,
                    overflowWrap: 'anywhere',
                    '& h1': {
                      color: 'text.primary',
                      fontSize: '1.8rem',
                      lineHeight: 1.25
                    },
                    '& h2': {
                      color: 'text.primary',
                      fontSize: '1.5rem',
                      lineHeight: 1.3
                    },
                    '& h3': {
                      color: 'text.primary',
                      fontSize: '1.2rem',
                      lineHeight: 1.35
                    },
                    '& p, & div': { my: 1.15 },
                    '& ul, & ol': { pl: 3 },
                    '& li + li': { mt: 0.7 },
                    '& blockquote': {
                      mx: 0,
                      my: 2,
                      pl: 2,
                      borderLeft: '3px solid',
                      borderColor: 'divider',
                      color: 'text.secondary'
                    },
                    '& a': {
                      color: 'primary.main',
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px'
                    }
                  }}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichHtml(section.contentHtml)
                  }}
                />
              </Box>
            ))}
          </Box>

          <Box
            component='aside'
            sx={{
              position: { lg: 'sticky' },
              top: { lg: 92 },
              order: { xs: -1, lg: 0 },
              p: { xs: 2.25, md: 2.75 },
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper'
            }}
          >
            <Typography
              sx={{
                color: '#00A7E1',
                fontSize: '0.68rem',
                fontWeight: 850,
                letterSpacing: '.08em'
              }}
            >
              EVENT SUMMARY
            </Typography>

            <Typography
              sx={{
                mt: 1,
                fontSize: '1.05rem',
                fontWeight: 900,
                lineHeight: 1.3
              }}
            >
              {event.name}
            </Typography>

            <Box
              sx={{
                mt: 2.25,
                display: 'grid',
                gap: 1.8
              }}
            >
              <FactRow
                icon='tabler-calendar-event'
                label='Date'
                value={formatEventDate(event)}
              />
              <FactRow
                icon='tabler-clock'
                label='Start time'
                value={formatDateTime(event.startDate)}
              />
              <FactRow
                icon='tabler-map-pin'
                label='Location'
                value={event.location || event.city || 'To be announced'}
              />
              {typeof event.remainingQuota === 'number' && (
                <FactRow
                  icon='tabler-users'
                  label='Remaining quota'
                  value={Math.max(0, event.remainingQuota).toLocaleString('id-ID')}
                />
              )}
              {lowestPrice !== null && (
                <FactRow
                  icon='tabler-ticket'
                  label='Starting from'
                  value={formatPrice(lowestPrice)}
                />
              )}
              {event.accessMode && (
                <FactRow
                  icon='tabler-lock'
                  label='Access'
                  value={event.accessMode}
                />
              )}
            </Box>

            <Divider sx={{ my: 2.4 }} />

            <Typography
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.8,
                color:
                  availability.tone === 'open'
                    ? '#5F9F00'
                    : 'text.secondary',
                fontSize: '0.76rem',
                fontWeight: 800
              }}
            >
              <Box
                component='span'
                aria-hidden='true'
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor:
                    availability.tone === 'open'
                      ? '#83C900'
                      : availability.tone === 'upcoming'
                        ? '#0073C7'
                        : 'text.disabled'
                }}
              />
              {availability.label}
            </Typography>

            <Button
              component={Link}
              href={`/events/${encodeURIComponent(event.slug)}/register`}
              fullWidth
              variant='contained'
              disabled={!availability.enabled}
              sx={{
                mt: 2,
                minHeight: 44,
                bgcolor: '#07172B',
                color: '#fff',
                '&:hover': { bgcolor: '#0B2748' }
              }}
            >
              {availability.enabled ? 'Register Now' : 'Registration Unavailable'}
            </Button>

            {packages.length > 0 && (
              <Button
                component='a'
                href='#registration-options'
                fullWidth
                variant='text'
                sx={{ mt: 0.5, fontWeight: 800 }}
              >
                View registration options
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      <Box
        component='section'
        sx={{
          px: { xs: 2.5, sm: 3.5, lg: 4 },
          py: { xs: 5.5, md: 6.5 },
          bgcolor: '#07172B',
          color: '#fff'
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1440,
            mx: 'auto',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1fr) auto' },
            gap: 3,
            alignItems: 'center'
          }}
        >
          <Box>
            <Typography
              sx={{
                color: '#45C7CC',
                fontSize: '0.7rem',
                fontWeight: 850,
                letterSpacing: '.08em'
              }}
            >
              READY TO JOIN?
            </Typography>
            <Typography
              component='h2'
              sx={{
                mt: 1,
                fontSize: { xs: '1.65rem', md: '2.2rem' },
                lineHeight: 1.1,
                fontWeight: 900
              }}
            >
              {event.name}
            </Typography>
            <Typography
              sx={{
                mt: 1,
                maxWidth: 680,
                color: 'rgba(255,255,255,.68)',
                fontSize: '0.88rem',
                lineHeight: 1.65
              }}
            >
              {availability.enabled
                ? 'Choose an available registration option and complete your participant information.'
                : availability.label}
            </Typography>
          </Box>

          <Button
            component={Link}
            href={`/events/${encodeURIComponent(event.slug)}/register`}
            variant='contained'
            disabled={!availability.enabled}
            sx={{
              justifySelf: { md: 'end' },
              minHeight: 44,
              px: 2.5,
              bgcolor: '#fff',
              color: '#07172B',
              fontWeight: 850,
              '&:hover': { bgcolor: '#F3F7FA' }
            }}
          >
            Register Now
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default EventDetail
