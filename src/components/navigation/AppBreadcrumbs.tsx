'use client'

import { useEffect, useMemo, useState } from 'react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'

import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

import { getPublicEventBySlug } from '@/lib/api'
import { getAdminEvent } from '@/lib/admin-events'
import {
  buildBreadcrumbs,
  getBreadcrumbEventReference,
  type BreadcrumbScope
} from '@/lib/breadcrumbs'

type Props = {
  scope: BreadcrumbScope
  surface?: boolean
}

const AppBreadcrumbs = ({ scope, surface = false }: Props) => {
  const pathname = usePathname() ?? '/'
  const eventReference = useMemo(
    () => getBreadcrumbEventReference(pathname, scope),
    [pathname, scope]
  )
  const [eventLabel, setEventLabel] = useState<string | undefined>()

  useEffect(() => {
    let active = true

    setEventLabel(undefined)

    if (!eventReference) return () => { active = false }

    const resolveEventLabel = async () => {
      try {
        const event = scope === 'admin'
          ? await getAdminEvent(eventReference)
          : await getPublicEventBySlug(eventReference)

        if (active) setEventLabel(event.name)
      } catch {
        // Breadcrumbs remain useful with a safe route-derived fallback.
      }
    }

    void resolveEventLabel()

    return () => {
      active = false
    }
  }, [eventReference, scope])

  const items = useMemo(
    () => buildBreadcrumbs(pathname, scope, { eventLabel }),
    [eventLabel, pathname, scope]
  )

  if (items.length === 0) return null

  return (
    <Box
      component='nav'
      aria-label='Breadcrumb'
      sx={{
        minWidth: 0,
        mb: scope === 'admin' && !surface ? 4 : 0,
        ...(surface
          ? {
              display: 'inline-flex',
              maxWidth: '100%',
              px: 2,
              py: 1.1,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              boxShadow: 3
            }
          : {})
      }}
    >
      <Breadcrumbs
        separator={<i className='tabler-chevron-right text-sm' aria-hidden='true' />}
        sx={{
          minWidth: 0,
          '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap' },
          '& .MuiBreadcrumbs-li': { minWidth: 0 }
        }}
      >
        {items.map((item, index) => {
          if (index === items.length - 1 || !item.href) {
            return (
              <Typography
                key={`${item.label}-${index}`}
                color={index === items.length - 1 ? 'text.primary' : 'text.secondary'}
                variant='body2'
                fontWeight={index === items.length - 1 ? 700 : 500}
                sx={{ maxWidth: { xs: 180, sm: 320 }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {item.label}
              </Typography>
            )
          }

          return (
            <Link
              key={`${item.label}-${index}`}
              component={NextLink}
              href={item.href}
              color='text.secondary'
              underline='hover'
              variant='body2'
              sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}
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
