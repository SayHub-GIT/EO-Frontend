'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'

import {
  getAdminMicrosite,
  listAdminMicrosites,
  type MicrositeAdminDetail,
  type MicrositeListItem
} from '@/lib/admin-microsites'

export default function Page() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const [detail, setDetail] = useState<MicrositeAdminDetail | null>(null)
  const [summary, setSummary] = useState<MicrositeListItem | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const [nextDetail, list] = await Promise.all([
          getAdminMicrosite(eventId),
          listAdminMicrosites()
        ])

        if (!active) return

        setDetail(nextDetail)
        setSummary(list.find(item => item.eventId === eventId) ?? null)
        setSelectedSectionId(nextDetail.draft.sections[0]?.id ?? '')
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Unable to load MicroSite editor.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [eventId])

  const selectedSection = useMemo(
    () => detail?.draft.sections.find(section => section.id === selectedSectionId) ?? null,
    [detail, selectedSectionId]
  )

  if (loading) {
    return (
      <Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center' }}>
        <Box sx={{ display: 'grid', justifyItems: 'center', gap: 1.5 }}>
          <CircularProgress size={32} />
          <Typography variant='body2' color='text.secondary'>
            Loading editor workspace...
          </Typography>
        </Box>
      </Box>
    )
  }

  if (error || !detail) {
    return (
      <Alert severity='error'>
        {error || 'MicroSite editor data is unavailable.'}
      </Alert>
    )
  }

  const visibleSections = detail.draft.sections
    .filter(section => section.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          gap: 2,
          alignItems: { md: 'flex-start' }
        }}
      >
        <Box>
          <Button
            component={Link}
            href='/admin/microsite/sites'
            size='small'
            startIcon={<i className='tabler-arrow-left' />}
            sx={{ mb: 1, px: 0 }}
          >
            My MicroSites
          </Button>
          <Typography component='h1' variant='h4' fontWeight={700}>
            {summary?.eventName ?? 'MicroSite editor'}
          </Typography>
          <Typography color='text.secondary' sx={{ mt: 0.75 }}>
            {detail.subdomain} · {detail.templateKey}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip size='small' label={`Draft v${detail.draftVersionNumber}`} variant='outlined' />
          <Chip
            size='small'
            label={detail.publishedVersionNumber !== null ? `Published v${detail.publishedVersionNumber}` : 'Not published'}
            color={detail.publishedVersionNumber !== null ? 'success' : 'default'}
            variant={detail.publishedVersionNumber !== null ? 'tonal' : 'outlined'}
          />
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '260px minmax(0, 1fr) 300px' },
          gap: 2.5,
          alignItems: 'start'
        }}
      >
        <Card variant='outlined'>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box sx={{ px: 2.5, py: 2 }}>
              <Typography variant='subtitle1' fontWeight={700}>
                Sections
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {detail.draft.sections.length} configured
              </Typography>
            </Box>
            <Divider />
            <List disablePadding>
              {detail.draft.sections
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map(section => (
                  <ListItemButton
                    key={section.id}
                    selected={section.id === selectedSectionId}
                    onClick={() => setSelectedSectionId(section.id)}
                    sx={{ minHeight: 48, px: 2.5 }}
                  >
                    <ListItemText
                      primary={section.name}
                      secondary={section.visible ? section.type : `${section.type} · hidden`}
                    />
                  </ListItemButton>
                ))}
            </List>
          </CardContent>
        </Card>

        <Card variant='outlined'>
          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Box>
                <Typography variant='subtitle1' fontWeight={700}>
                  Preview
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Responsive renderer shell
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.75 }}>
                <i className='tabler-device-desktop' aria-hidden='true' />
                <i className='tabler-device-tablet' aria-hidden='true' />
                <i className='tabler-device-mobile' aria-hidden='true' />
              </Box>
            </Box>

            <Divider sx={{ my: 2.5 }} />

            <Box
              sx={{
                minHeight: { xs: 360, md: 520 },
                border: theme => `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                bgcolor: 'background.default',
                p: { xs: 2, sm: 3 },
                display: 'grid',
                alignContent: 'start',
                gap: 1.5
              }}
            >
              {visibleSections.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>
                  No visible sections in the current draft.
                </Typography>
              ) : (
                visibleSections.map(section => (
                  <Box
                    key={section.id}
                    sx={{
                      border: theme => `1px solid ${theme.palette.divider}`,
                      borderRadius: 1,
                      px: 2,
                      py: 2.5,
                      bgcolor: 'background.paper'
                    }}
                  >
                    <Typography fontWeight={650}>{section.name}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {section.dataSource || 'manual'} · {section.elements.length} element{section.elements.length === 1 ? '' : 's'}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          </CardContent>
        </Card>

        <Card variant='outlined'>
          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Typography variant='subtitle1' fontWeight={700}>
              Section details
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              Read-only workspace shell
            </Typography>

            <Divider sx={{ my: 2.5 }} />

            {selectedSection ? (
              <Box component='dl' sx={{ m: 0, display: 'grid', gap: 2 }}>
                {[
                  ['Name', selectedSection.name],
                  ['Type', selectedSection.type],
                  ['Data source', selectedSection.dataSource || 'manual'],
                  ['Visibility', selectedSection.visible ? 'Visible' : 'Hidden'],
                  ['Elements', String(selectedSection.elements.length)]
                ].map(([label, value]) => (
                  <Box key={label}>
                    <Typography component='dt' variant='caption' color='text.secondary'>
                      {label}
                    </Typography>
                    <Typography component='dd' variant='body2' sx={{ m: 0, mt: 0.35, fontWeight: 600 }}>
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant='body2' color='text.secondary'>
                Select a section to inspect its current configuration.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
