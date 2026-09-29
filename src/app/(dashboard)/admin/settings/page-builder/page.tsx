'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import { useUnsavedChanges } from '@/components/navigation/UnsavedChangesProvider'
import PageBuilderShell from '@/components/page-builder/PageBuilderShell'
import {
  PageStyleControls,
  SectionStyleControls
} from '@/components/page-builder/PageBuilderStyleControls'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'
import {
  getAdminPageBuilder,
  updateAdminPageBuilder,
  type SitePageDefinition,
  type SitePageKey,
  type SitePageSection,
  type SiteSectionAlign,
  type SiteSectionLayout,
  type SiteSectionPlacement,
  type SiteSectionType,
} from '@/lib/site-page-builder'

const pageLabels: Record<SitePageKey, string> = {
  home: 'Home',
  event: 'Event Detail',
  registration: 'Registration',
  about: 'About',
  'event-category': 'Event Category',
  payment: 'Payment',
  'quiz-join': 'Quiz Join',
  ticket: 'Ticket',
  receipt: 'Receipt',
  'registration-status': 'Registration Status'
}

const sectionTypes: SiteSectionType[] = ['content', 'hero', 'cta', 'image', 'spacer']
const layouts: SiteSectionLayout[] = ['stack', 'split', 'banner', 'center']
const placements: SiteSectionPlacement[] = ['before', 'after']
const alignments: SiteSectionAlign[] = ['left', 'center', 'right']

const createSection = (index: number): SitePageSection => ({
  id: 'section-' + Date.now().toString(36) + '-' + index.toString(36),
  type: 'content',
  enabled: true,
  sortOrder: index,
  layout: 'stack',
  placement: 'after',
  align: 'left',
  eyebrow: '',
  title: 'New Section',
  body: '',
  imageUrl: '',
  ctaLabel: '',
  ctaHref: '',
  backgroundColor: '',
  backgroundImageUrl: '',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  textColor: '',
  accentColor: '',
  borderColor: '',
  borderWidth: 0,
  shadow: 'none',
  paddingX: 24,
  paddingY: 64,
  gap: 24,
  minHeight: 0,
  contentMaxWidth: 0,
  imagePosition: 'right',
  imageFit: 'cover',
  titleSize: 'large',
  bodySize: 'medium',
  borderRadius: 0
})

const normalizeOrder = (sections: SitePageSection[]) =>
  sections.map((section, index) => ({ ...section, sortOrder: index }))

export default function PageBuilderSettingsPage() {
  const [pages, setPages] = useState<SitePageDefinition[]>([])
  const [selectedKey, setSelectedKey] = useState<SitePageKey>('home')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [baseline, setBaseline] = useState('')
  const manageAccess = usePermissionAccess('settings.manage')

  const selectedPage = useMemo(
    () => pages.find(page => page.key === selectedKey) ?? null,
    [pages, selectedKey]
  )

  const dirty = Boolean(baseline) && JSON.stringify(pages) !== baseline
  useUnsavedChanges(dirty || saving)

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const result = await getAdminPageBuilder()
      setPages(result.pages)
      setBaseline(JSON.stringify(result.pages))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Page Builder.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const updatePage = (patch: Partial<SitePageDefinition>) => {
    setPages(current => current.map(page =>
      page.key === selectedKey ? { ...page, ...patch } : page
    ))
  }

  const updateSection = (id: string, patch: Partial<SitePageSection>) => {
    if (!selectedPage) return

    updatePage({
      sections: selectedPage.sections.map(section =>
        section.id === id ? { ...section, ...patch } : section
      )
    })
  }

  const addSection = () => {
    if (!selectedPage) return
    updatePage({
      sections: normalizeOrder([
        ...selectedPage.sections,
        createSection(selectedPage.sections.length)
      ])
    })
  }

  const moveSection = (id: string, direction: -1 | 1) => {
    if (!selectedPage) return
    const sections = [...selectedPage.sections]
    const index = sections.findIndex(section => section.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= sections.length) return
    const [item] = sections.splice(index, 1)
    sections.splice(target, 0, item)
    updatePage({ sections: normalizeOrder(sections) })
  }

  const removeSection = (id: string) => {
    if (!selectedPage) return
    updatePage({
      sections: normalizeOrder(selectedPage.sections.filter(section => section.id !== id))
    })
  }

  const save = async () => {
    if (saving || !manageAccess.allowed) return

    try {
      setSaving(true)
      setError('')
      const result = await updateAdminPageBuilder(pages)
      setPages(result.pages)
      setBaseline(JSON.stringify(result.pages))
      pushAppAlert({ severity: 'success', message: 'Page Builder changes saved.' })
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save Page Builder.'
      setError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Box sx={{ minHeight: 420, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box>
          <Chip label='Design System' color='primary' size='small' sx={{ mb: 1.5 }} />
          <Typography variant='h4' fontWeight={850}>Page Builder</Typography>
          <Typography color='text.secondary' sx={{ mt: .75, maxWidth: 900 }}>
            Rebuild public pages from reusable sections. Add sections, reorder them, change layout, background, colors, spacing, radius, image, text, and CTA without editing source files.
          </Typography>
        </Box>

        <Button
          variant='contained'
          disabled={!dirty || saving || !manageAccess.allowed}
          onClick={() => void save()}
          startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}
        >
          Save Page Design
        </Button>
      </Box>

      {error && <Alert severity='error'>{error}</Alert>}

      {!manageAccess.allowed && (
        <Alert severity='info'>
          You can preview this configuration, but editing actions are disabled because your role does not have Settings Update permission.
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {(Object.keys(pageLabels) as SitePageKey[]).map(key => (
          <Button
            key={key}
            variant={selectedKey === key ? 'contained' : 'outlined'}
            onClick={() => setSelectedKey(key)}
          >
            {pageLabels[key]}
          </Button>
        ))}
      </Box>

      {selectedPage && (
        <>
          <Card variant='outlined'>
            <CardContent sx={{ display: 'grid', gap: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant='h6' fontWeight={800}>{pageLabels[selectedPage.key]} Canvas</Typography>
                  <Typography variant='body2' color='text.secondary'>Global page background and custom-section content width.</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectedPage.enabled}
                        disabled={!manageAccess.allowed}
                        onChange={event => updatePage({ enabled: event.target.checked })}
                      />
                    }
                    label={selectedPage.enabled ? 'Builder enabled' : 'Builder disabled'}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectedPage.showDefaultContent !== false}
                        disabled={!manageAccess.allowed || !selectedPage.enabled}
                        onChange={event => updatePage({ showDefaultContent: event.target.checked })}
                      />
                    }
                    label={selectedPage.showDefaultContent !== false ? 'Default content visible' : 'Custom sections only'}
                  />
                </Box>
              </Box>

              <PageStyleControls
                page={selectedPage}
                disabled={!manageAccess.allowed}
                onChange={updatePage}
              />
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box>
              <Typography variant='h5' fontWeight={800}>Custom Sections</Typography>
              <Typography variant='body2' color='text.secondary'>
                Sections can render before or after built-in content. Turn off default content when you want a fully custom remake.
              </Typography>
            </Box>
            <Button
              variant='outlined'
              disabled={!manageAccess.allowed || selectedPage.sections.length >= 50}
              onClick={addSection}
              startIcon={<i className='tabler-plus' />}
            >
              Add Section
            </Button>
          </Box>

          {selectedPage.sections.length === 0 ? (
            <Card variant='outlined'>
              <CardContent sx={{ py: 6, textAlign: 'center' }}>
                <i className='tabler-layout-grid-add text-5xl' />
                <Typography variant='h6' sx={{ mt: 2 }}>No custom section yet</Typography>
                <Typography color='text.secondary' sx={{ mt: 1 }}>Add a section to start remaking this page without hardcoding content.</Typography>
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {selectedPage.sections.map((section, index) => (
                <Card key={section.id} variant='outlined'>
                  <CardContent sx={{ display: 'grid', gap: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Chip label={'#' + String(index + 1)} size='small' />
                        <Typography fontWeight={800}>{section.title || section.type}</Typography>
                        <Chip label={section.type} size='small' variant='outlined' />
                      </Box>

                      <Box sx={{ display: 'flex', gap: .5 }}>
                        <Button size='small' disabled={!manageAccess.allowed || index === 0} onClick={() => moveSection(section.id, -1)}>Up</Button>
                        <Button size='small' disabled={!manageAccess.allowed || index === selectedPage.sections.length - 1} onClick={() => moveSection(section.id, 1)}>Down</Button>
                        <Button size='small' color='error' disabled={!manageAccess.allowed} onClick={() => removeSection(section.id)}>Delete</Button>
                      </Box>
                    </Box>

                    <Divider />

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(5,1fr)' }, gap: 2 }}>
                      <TextField
                        select
                        label='Section type'
                        value={section.type}
                        disabled={!manageAccess.allowed}
                        onChange={event => updateSection(section.id, { type: event.target.value as SiteSectionType })}
                      >
                        {sectionTypes.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                      </TextField>

                      <TextField
                        select
                        label='Layout'
                        value={section.layout}
                        disabled={!manageAccess.allowed}
                        onChange={event => updateSection(section.id, { layout: event.target.value as SiteSectionLayout })}
                      >
                        {layouts.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                      </TextField>

                      <TextField
                        select
                        label='Placement'
                        value={section.placement ?? 'after'}
                        disabled={!manageAccess.allowed}
                        onChange={event => updateSection(section.id, { placement: event.target.value as SiteSectionPlacement })}
                      >
                        {placements.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                      </TextField>

                      <TextField
                        select
                        label='Alignment'
                        value={section.align}
                        disabled={!manageAccess.allowed}
                        onChange={event => updateSection(section.id, { align: event.target.value as SiteSectionAlign })}
                      >
                        {alignments.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                      </TextField>

                      <FormControlLabel
                        control={
                          <Switch
                            checked={section.enabled}
                            disabled={!manageAccess.allowed}
                            onChange={event => updateSection(section.id, { enabled: event.target.checked })}
                          />
                        }
                        label='Visible'
                      />
                    </Box>

                    {section.type !== 'spacer' && (
                      <>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 2 }}>
                          <TextField
                            label='Eyebrow / label'
                            value={section.eyebrow ?? ''}
                            disabled={!manageAccess.allowed}
                            onChange={event => updateSection(section.id, { eyebrow: event.target.value })}
                          />
                          <TextField
                            label='Title'
                            value={section.title ?? ''}
                            disabled={!manageAccess.allowed}
                            onChange={event => updateSection(section.id, { title: event.target.value })}
                          />
                        </Box>

                        <TextField
                          label='Body'
                          multiline
                          minRows={4}
                          value={section.body ?? ''}
                          disabled={!manageAccess.allowed}
                          onChange={event => updateSection(section.id, { body: event.target.value })}
                        />

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 2fr' }, gap: 2 }}>
                          <TextField
                            label='Image URL'
                            value={section.imageUrl ?? ''}
                            disabled={!manageAccess.allowed}
                            onChange={event => updateSection(section.id, { imageUrl: event.target.value })}
                          />
                          <TextField
                            label='CTA label'
                            value={section.ctaLabel ?? ''}
                            disabled={!manageAccess.allowed}
                            onChange={event => updateSection(section.id, { ctaLabel: event.target.value })}
                          />
                          <TextField
                            label='CTA link'
                            value={section.ctaHref ?? ''}
                            disabled={!manageAccess.allowed}
                            onChange={event => updateSection(section.id, { ctaHref: event.target.value })}
                          />
                        </Box>
                      </>
                    )}

                    <SectionStyleControls
                      section={section}
                      disabled={!manageAccess.allowed}
                      onChange={patch => updateSection(section.id, patch)}
                    />
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          <Card variant='outlined'>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 3, py: 2.5 }}>
                <Typography variant='h6' fontWeight={800}>Live Page Preview</Typography>
                <Typography variant='body2' color='text.secondary'>Preview uses the exact Page Builder shell and style renderer used on public pages.</Typography>
              </Box>
              <Divider />
              <Box sx={{ minHeight: 220, bgcolor: 'background.default' }}>
                <PageBuilderShell page={selectedPage}>
                  <Box
                    sx={{
                      minHeight: 140,
                      display: 'grid',
                      placeItems: 'center',
                      border: '1px dashed',
                      borderColor: 'divider',
                      color: 'inherit'
                    }}
                  >
                    <Typography variant='body2'>
                      Built-in {pageLabels[selectedPage.key]} content
                    </Typography>
                  </Box>
                </PageBuilderShell>
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  )
}
