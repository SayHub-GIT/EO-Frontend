'use client'

import { useEffect, useMemo, useState } from 'react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'

import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

import { getAdminEvent } from '@/lib/admin-events'
import {
  buildBreadcrumbs,
  getBreadcrumbEventReference,
  getBreadcrumbSessionReference
} from '@/lib/breadcrumbs'
import { listAdminQuizSessions } from '@/lib/quiz-rooms'

const AppBreadcrumbs = () => {
  const pathname = usePathname() ?? '/'
  const eventReference = useMemo(
    () => getBreadcrumbEventReference(pathname),
    [pathname]
  )
  const sessionReference = useMemo(
    () => getBreadcrumbSessionReference(pathname),
    [pathname]
  )
  const [eventLabel, setEventLabel] = useState<string | undefined>()
  const [sessionLabel, setSessionLabel] = useState<string | undefined>()

  useEffect(() => {
    let active = true

    setEventLabel(undefined)
    setSessionLabel(undefined)

    if (!eventReference) return () => { active = false }

    const resolveLabels = async () => {
      try {
        const event = await getAdminEvent(eventReference)
        if (!active) return

        setEventLabel(event.name)

        if (sessionReference) {
          try {
            const sessions = await listAdminQuizSessions(eventReference)
            if (!active) return

            const session = sessions.find(item => item.id === sessionReference)
            setSessionLabel(session?.name || 'Quiz Session')
          } catch {
            if (active) setSessionLabel('Quiz Session')
          }
        }
      } catch {
        // Route-derived fallbacks keep the breadcrumb usable while data reloads.
      }
    }

    void resolveLabels()

    return () => {
      active = false
    }
  }, [eventReference, sessionReference])

  const items = useMemo(
    () => buildBreadcrumbs(pathname, { eventLabel, sessionLabel }),
    [eventLabel, pathname, sessionLabel]
  )

  if (items.length === 0) return null

  return (
    <Box component='nav' aria-label='Breadcrumb' sx={{ minWidth: 0, mb: 4 }}>
      <Breadcrumbs
        separator={<i className='tabler-chevron-right text-sm' aria-hidden='true' />}
        sx={{
          minWidth: 0,
          '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap', rowGap: 1 },
          '& .MuiBreadcrumbs-li': { minWidth: 0 }
        }}
      >
        {items.map((item, index) => {
          const href = item.href
          const current = index === items.length - 1 || !href

          if (current) {
            return (
              <Typography
                key={`${item.label}-${index}`}
                color={index === items.length - 1 ? 'text.primary' : 'text.secondary'}
                variant='body1'
                fontWeight={index === items.length - 1 ? 750 : 600}
                sx={{ maxWidth: { xs: 210, sm: 360 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {item.label}
              </Typography>
            )
          }

          return (
            <Link
              key={`${item.label}-${index}`}
              component={NextLink}
              href={href}
              color='primary.main'
              underline='hover'
              variant='body1'
              sx={{ fontWeight: 650, whiteSpace: 'nowrap' }}
            >
              {item.label}
            </Link>
          )
        })}
      </Breadcrumbs>
    </Box>
  )
}

export default AppBreadcrumbs
