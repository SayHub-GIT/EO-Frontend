'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import { listAdminMicrosites, type MicrositeListItem } from '@/lib/admin-microsites'

const formatUpdatedAt = (value: string | null | undefined) => {
  if (!value) return 'Not available'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Not available'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export default function Page() {
  const [microsites, setMicrosites] = useState<MicrositeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      setMicrosites(await listAdminMicrosites())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load MicroSite overview.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const summary = useMemo(() => {
    const published = microsites.filter(item => item.publishedVersionNumber !== null).length

    return {
      total: microsites.length,
      published,
      draft: microsites.length - published,
      lastUpdated: microsites[0]?.updatedAtUtc ?? null
    }
  }, [microsites])

  const recent = microsites.slice(0, 3)

  return (
    <Box sx={{ display: 'grid', gap: 4 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { md: 'flex-start' },
          gap: 2
        }}
      >
        <Box>
          <Typography component='h1' variant='h4' fontWeight={700}>
            MicroSite
          </Typography>
          <Typography color='text.secondary' sx={{ mt: 1, maxWidth: 720, lineHeight: 1.7 }}>
            Manage event landing pages from a workspace separate from the main event operations dashboard.
          </Typography>
        </Box>

        <Button
          component={Link}
          href='/admin/microsite/sites'
          variant='contained'
          startIcon={<i className='tabler-world-www' />}
          sx={{ alignSelf: { xs: 'flex-start', md: 'auto' } }}
        >
          My MicroSites
        </Button>
      </Box>

      {loading && (
        <Box sx={{ minHeight: 220, display: 'grid', placeItems: 'center' }}>
          <Box sx={{ display: 'grid', justifyItems: 'center', gap: 1.5 }}>
            <CircularProgress size={32} />
            <Typography variant='body2' color='text.secondary'>
              Loading MicroSite overview...
            </Typography>
          </Box>
        </Box>
      )}

      {!loading && error && (
        <Alert
          severity='error'
          action={
            <Button color='inherit' size='small' onClick={() => void load()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <>
          <Box
            component='dl'
            sx={{
              m: 0,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, minmax(0, 1fr))' },
              border: theme => `1px solid ${theme.palette.divider}`,
              borderRadius: 1.5,
              overflow: 'hidden'
            }}
          >
            {[
              ['Total MicroSites', String(summary.total)],
              ['Draft', String(summary.draft)],
              ['Published', String(summary.published)],
              ['Last updated', formatUpdatedAt(summary.lastUpdated)]
            ].map(([label, value], index) => (
              <Box
                key={label}
                sx={{
                  px: { xs: 2.5, sm: 3 },
                  py: 2.5,
                  borderRight: {
                    xs: index % 2 === 0 ? theme => `1px solid ${theme.palette.divider}` : 'none',
                    lg: index < 3 ? theme => `1px solid ${theme.palette.divider}` : 'none'
                  },
                  borderBottom: {
                    xs: index < 2 ? theme => `1px solid ${theme.palette.divider}` : 'none',
                    lg: 'none'
                  }
                }}
              >
                <Typography component='dt' variant='body2' color='text.secondary'>
                  {label}
                </Typography>
                <Typography component='dd' sx={{ m: 0, mt: 0.75, fontWeight: 700, fontSize: label === 'Last updated' ? '0.95rem' : '1.55rem' }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box>
            <Typography component='h2' variant='h6' fontWeight={650}>
              Recently updated
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
              The latest MicroSites based on saved changes.
            </Typography>

            <Divider sx={{ my: 2 }} />

            {recent.length === 0 ? (
              <Box sx={{ py: 4 }}>
                <Typography fontWeight={650}>No MicroSites yet</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                  This workspace will list MicroSites after one has been created from a template.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'grid' }}>
                {recent.map((item, index) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto auto' },
                      gap: { xs: 1, md: 3 },
                      alignItems: { md: 'center' },
                      py: 2,
                      borderBottom: index < recent.length - 1 ? theme => `1px solid ${theme.palette.divider}` : 'none'
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={650} noWrap>
                        {item.eventName}
                      </Typography>
                      <Typography variant='body2' color='text.secondary' noWrap>
                        {item.subdomain}
                      </Typography>
                    </Box>
                    <Typography variant='body2' color='text.secondary'>
                      {item.publishedVersionNumber !== null ? 'Published' : 'Draft'}
                    </Typography>
                    <Button
                      component={Link}
                      href={`/admin/microsite/sites/${encodeURIComponent(item.eventId)}`}
                      size='small'
                    >
                      Open
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  )
}
