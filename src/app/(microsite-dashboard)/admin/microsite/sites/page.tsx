'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { listAdminMicrosites, type MicrositeListItem } from '@/lib/admin-microsites'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'

const formatTemplate = (value: string) =>
  value
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const formatUpdatedAt = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Unknown'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

export default function Page() {
  const [microsites, setMicrosites] = useState<MicrositeListItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const editAccess = usePermissionAccess('microsite.edit')

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      setMicrosites(await listAdminMicrosites())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load MicroSites.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return microsites

    return microsites.filter(item =>
      [item.eventName, item.eventSlug, item.subdomain, item.templateKey]
        .some(value => value.toLowerCase().includes(query))
    )
  }, [microsites, search])

  return (
    <Box sx={{ display: 'grid', gap: 4 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'flex-end' },
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Box>
          <Typography component='h1' variant='h4' fontWeight={700}>
            My MicroSites
          </Typography>
          <Typography color='text.secondary' sx={{ mt: 1, maxWidth: 700, lineHeight: 1.7 }}>
            Find a landing page by event, template, or public slug and open its editor workspace.
          </Typography>
        </Box>

        <TextField
          size='small'
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder='Search MicroSites'
          inputProps={{ 'aria-label': 'Search MicroSites' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='tabler-search' />
                </InputAdornment>
              )
            }
          }}
          sx={{ width: { xs: '100%', md: 300 } }}
        />
      </Box>

      {loading && (
        <Box sx={{ minHeight: 260, display: 'grid', placeItems: 'center' }}>
          <Box sx={{ display: 'grid', justifyItems: 'center', gap: 1.5 }}>
            <CircularProgress size={32} />
            <Typography variant='body2' color='text.secondary'>
              Loading MicroSites...
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

      {!loading && !error && filtered.length === 0 && (
        <Box
          sx={{
            minHeight: 260,
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            border: theme => `1px solid ${theme.palette.divider}`,
            borderRadius: 1.5,
            px: 3
          }}
        >
          <Box>
            <i className='tabler-world-off text-4xl' />
            <Typography variant='h6' fontWeight={650} sx={{ mt: 1.5 }}>
              {microsites.length === 0 ? 'No MicroSites yet' : 'No matching MicroSites'}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
              {microsites.length === 0
                ? 'MicroSites will appear here after they are created from a template.'
                : 'Try a different event name, slug, or template.'}
            </Typography>
          </Box>
        </Box>
      )}

      {!loading && !error && filtered.length > 0 && (
        <Box
          sx={{
            border: theme => `1px solid ${theme.palette.divider}`,
            borderRadius: 1.5,
            overflow: 'hidden'
          }}
        >
          {filtered.map((item, index) => (
            <Box
              key={item.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'minmax(220px, 1.4fr) minmax(140px, .8fr) minmax(170px, 1fr) auto auto'
                },
                gap: { xs: 1.5, md: 2.5 },
                alignItems: { md: 'center' },
                px: { xs: 2.5, sm: 3 },
                py: 2.5,
                borderBottom: index < filtered.length - 1 ? theme => `1px solid ${theme.palette.divider}` : 'none'
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700} noWrap>
                  {item.eventName}
                </Typography>
                <Typography variant='body2' color='text.secondary' noWrap>
                  {item.eventSlug}
                </Typography>
              </Box>

              <Box>
                <Typography variant='caption' color='text.secondary' sx={{ display: { md: 'none' } }}>
                  Template
                </Typography>
                <Typography variant='body2'>{formatTemplate(item.templateKey)}</Typography>
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography variant='caption' color='text.secondary' sx={{ display: { md: 'none' } }}>
                  Public slug
                </Typography>
                <Typography variant='body2' noWrap>
                  {item.subdomain}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'column' }, alignItems: { xs: 'center', md: 'flex-start' }, gap: 0.75 }}>
                <Chip
                  size='small'
                  label={item.publishedVersionNumber !== null ? 'Published' : 'Draft'}
                  color={item.publishedVersionNumber !== null ? 'success' : 'default'}
                  variant={item.publishedVersionNumber !== null ? 'tonal' : 'outlined'}
                />
                <Typography variant='caption' color='text.secondary'>
                  {formatUpdatedAt(item.updatedAtUtc)}
                </Typography>
              </Box>

              <Button
                component={Link}
                href={`/admin/microsite/sites/${encodeURIComponent(item.eventId)}`}
                variant='outlined'
                size='small'
                disabled={!editAccess.allowed}
                startIcon={<i className='tabler-edit' />}
                sx={{ justifySelf: { md: 'end' }, minHeight: 44 }}
              >
                Open editor
              </Button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
