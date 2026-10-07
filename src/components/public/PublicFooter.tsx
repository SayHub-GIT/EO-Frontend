'use client'

import { useEffect, useMemo, useState } from 'react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'

import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

import { getPublicEventBySlug } from '@/lib/api'
import {
  getPublicRegistrationStatus,
  resolveRegistrationAccessToken
} from '@/registrations/services/registration-public.service'

type Props = {
  eventLogoUrl?: string | null
  eventName?: string | null
}

type EventBrand = {
  logoUrl?: string | null
  name?: string | null
}

const eventLinks = [
  { label: 'Running', href: '/events/category/running' },
  { label: 'Seminar', href: '/events/category/seminar' },
  { label: 'Workshop', href: '/events/category/workshop' },
  { label: 'Other events', href: '/events/category/other' }
]

const platformLinks = [
  { label: 'Events', href: '/home#event-categories' },
  { label: 'About', href: '/about' },
  { label: 'Account', href: '/account' }
]

const legalLinks = [
  { label: 'Privacy Policy', href: '/legal/privacy' },
  { label: 'Terms of Service', href: '/legal/terms' }
]

const FooterLink = ({ label, href }: { label: string; href: string }) => (
  <Link
    component={NextLink}
    href={href}
    underline='none'
    sx={{
      width: 'fit-content',
      color: 'rgba(226, 236, 247, 0.68)',
      fontSize: '0.875rem',
      lineHeight: 1.5,
      transition: 'color .15s ease',
      '&:hover': {
        color: '#fff'
      },
      '&:focus-visible': {
        color: '#fff',
        outline: '2px solid #4FB3FF',
        outlineOffset: 3,
        borderRadius: 0.5
      }
    }}
  >
    {label}
  </Link>
)

const PublicFooter = ({ eventLogoUrl, eventName }: Props) => {
  const pathname = usePathname()
  const [routeBrand, setRouteBrand] = useState<EventBrand>({})

  const eventSlug = useMemo(() => {
    const match = pathname.match(/^\/events\/(?!category\/)([^/]+)/)
    return match?.[1] ? decodeURIComponent(match[1]) : null
  }, [pathname])

  const bookingCode = useMemo(() => {
    const match = pathname.match(/^\/registration\/([^/]+)/)
    return match?.[1] ? decodeURIComponent(match[1]) : null
  }, [pathname])

  useEffect(() => {
    let active = true

    if (eventLogoUrl !== undefined || eventName !== undefined) {
      setRouteBrand({})
      return () => {
        active = false
      }
    }

    const loadBrand = async () => {
      if (eventSlug) {
        try {
          const event = await getPublicEventBySlug(eventSlug)

          if (active) {
            setRouteBrand({
              logoUrl: event.logoUrl,
              name: event.name
            })
          }
        } catch {
          if (active) setRouteBrand({})
        }

        return
      }

      if (bookingCode) {
        const accessToken = resolveRegistrationAccessToken(bookingCode)

        if (!accessToken) {
          if (active) setRouteBrand({})
          return
        }

        try {
          const registration = await getPublicRegistrationStatus(
            bookingCode,
            accessToken
          )

          if (active) {
            setRouteBrand({
              logoUrl: registration.eventLogoUrl,
              name: registration.eventName
            })
          }
        } catch {
          if (active) setRouteBrand({})
        }

        return
      }

      setRouteBrand({})
    }

    void loadBrand()

    return () => {
      active = false
    }
  }, [bookingCode, eventLogoUrl, eventName, eventSlug])

  const resolvedLogoUrl = eventLogoUrl ?? routeBrand.logoUrl
  const resolvedEventName = eventName ?? routeBrand.name
  const isHome = pathname === '/home' || pathname === '/home/'

  if (isHome) {
    return (
      <Box component='footer' sx={{ mt: 'auto', bgcolor: '#07172B', color: '#fff' }}>
        <Box
          sx={{
            width: '100%',
            maxWidth: 1440,
            mx: 'auto',
            px: { xs: 2.5, sm: 3.5, lg: 4 },
            pt: { xs: 3.5, md: 4 },
            pb: { xs: 2.5, md: 3 }
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              gap: 2.5
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2.25, sm: 3 }, flexWrap: 'wrap' }}>
              <Box
                component='img'
                src='/EO%20Navbar.png'
                alt='Pertamina Event'
                sx={{ display: 'block', width: 'auto', height: { xs: 28, md: 30 }, maxWidth: 140, objectFit: 'contain' }}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.75, sm: 2.5 }, flexWrap: 'wrap' }}>
                {[
                  { label: 'Home', href: '/home' },
                  { label: 'Events', href: '/home#event-categories' },
                  { label: 'About', href: '/about' }
                ].map(link => (
                  <FooterLink key={link.href} {...link} />
                ))}
              </Box>
            </Box>

            <Typography
              sx={{
                color: 'rgba(226,236,247,.72)',
                fontSize: '0.72rem',
                fontStyle: 'italic',
                whiteSpace: 'nowrap'
              }}
            >
              Energizing You & Tomorrow
            </Typography>
          </Box>

          <Box
            sx={{
              mt: 3,
              pt: 2,
              borderTop: '1px solid rgba(255,255,255,.1)',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 1.5
            }}
          >
            <Typography sx={{ color: 'rgba(226,236,247,.46)', fontSize: '0.7rem' }}>
              © 2026 PT Pertamina (Persero). All rights reserved.
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1.5, sm: 2.5 } }}>
              {legalLinks.map(link => <FooterLink key={link.href} {...link} />)}
            </Box>
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      component='footer'
      sx={{
        mt: 'auto',
        bgcolor: '#07172B',
        color: '#fff'
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1440,
          mx: 'auto',
          px: { xs: 2.5, sm: 3.5, lg: 4 },
          pt: { xs: 6, md: 7 },
          pb: { xs: 3, md: 3.5 }
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'minmax(0, 1.4fr) repeat(2, minmax(150px, .7fr))',
              lg: 'minmax(0, 1.6fr) repeat(2, minmax(180px, .6fr))'
            },
            gap: { xs: 4.5, sm: 4, lg: 7 }
          }}
        >
          <Box sx={{ maxWidth: 420 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
              }}
            >
              <Box
                component='img'
                src='/EO%20Navbar.png'
                alt='Pertamina Event'
                sx={{
                  width: 'auto',
                  height: { xs: 32, md: 36 },
                  maxWidth: 164,
                  objectFit: 'contain'
                }}
              />

              {resolvedLogoUrl && (
                <>
                  <Box
                    aria-hidden='true'
                    sx={{
                      width: 1,
                      height: 32,
                      bgcolor: 'rgba(255,255,255,.22)'
                    }}
                  />
                  <Box
                    component='img'
                    src={resolvedLogoUrl}
                    alt={`${resolvedEventName || 'Event'} logo`}
                    sx={{
                      width: 'auto',
                      maxWidth: 132,
                      maxHeight: 40,
                      objectFit: 'contain'
                    }}
                  />
                </>
              )}
            </Box>

            <Typography
              sx={{
                mt: 2.25,
                maxWidth: 390,
                color: 'rgba(226, 236, 247, 0.68)',
                fontSize: { xs: '0.875rem', md: '0.9rem' },
                lineHeight: 1.75
              }}
            >
              Platform resmi seputar agenda, pameran, festival, dan aktivitas Pertamina Event.
            </Typography>

            <Typography
              sx={{
                mt: 2.25,
                width: 'fit-content',
                px: 1.25,
                py: 0.65,
                border: '1px solid rgba(69, 199, 204, .45)',
                borderRadius: 1,
                color: '#45C7CC',
                fontSize: '0.75rem',
                fontWeight: 750,
                letterSpacing: '.01em'
              }}
            >
              Energizing You & Tomorrow
            </Typography>
          </Box>

          <Box>
            <Typography
              sx={{
                mb: 1.75,
                color: '#fff',
                fontSize: '0.78rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '.055em'
              }}
            >
              Events
            </Typography>
            <Box sx={{ display: 'grid', gap: 1.15 }}>
              {eventLinks.map(link => (
                <FooterLink key={link.href} {...link} />
              ))}
            </Box>
          </Box>

          <Box>
            <Typography
              sx={{
                mb: 1.75,
                color: '#fff',
                fontSize: '0.78rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '.055em'
              }}
            >
              Pertamina Event
            </Typography>
            <Box sx={{ display: 'grid', gap: 1.15 }}>
              {platformLinks.map(link => (
                <FooterLink key={link.href} {...link} />
              ))}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            mt: { xs: 5, md: 6 },
            pt: 2.5,
            borderTop: '1px solid rgba(255,255,255,.1)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <Typography
            sx={{
              color: 'rgba(226, 236, 247, 0.5)',
              fontSize: '0.75rem'
            }}
          >
            © 2026 PT Pertamina (Persero). All rights reserved.
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: { xs: 2, sm: 3 }
            }}
          >
            {legalLinks.map(link => (
              <FooterLink key={link.href} {...link} />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default PublicFooter
