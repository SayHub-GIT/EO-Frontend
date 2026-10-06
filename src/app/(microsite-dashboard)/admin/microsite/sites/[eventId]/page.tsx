'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import MicrositeContactItemsEditor from '@/components/microsite/MicrositeContactItemsEditor'
import MicrositeDocumentPreview from '@/components/microsite/MicrositeDocumentPreview'
import MicrositeFaqItemsEditor from '@/components/microsite/MicrositeFaqItemsEditor'
import MicrositeLifecycleActions from '@/components/microsite/MicrositeLifecycleActions'
import MicrositeSectionFieldEditor from '@/components/microsite/MicrositeSectionFieldEditor'
import MicrositeSponsorItemsEditor from '@/components/microsite/MicrositeSponsorItemsEditor'
import MicrositeThemeEditor from '@/components/microsite/MicrositeThemeEditor'
import { useUnsavedChanges } from '@/components/navigation/UnsavedChangesProvider'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'
import {
  getAdminMicrosite,
  getEventMicrositeCatalog,
  getMicrositePreview,
  listAdminMicrosites,
  saveMicrositeContent,
  saveMicrositeLayout,
  uploadMicrositeAsset,
  type MicrositeAdminDetail,
  type MicrositeListItem,
  type MicrositeSectionFieldDefinition,
  type MicrositeSectionRegistryItem,
  type MicrositeTemplateCatalog
} from '@/lib/admin-microsites'
import {
  readMicrositeFieldValue,
  validateMicrositeField,
  validateMicrositeSectionSafety,
  validateMicrositeStructuredSection,
  writeMicrositeFieldValue,
  type MicrositeFieldValue
} from '@/lib/microsite-editor'

type FieldGroup = 'content' | 'appearance' | 'settings'
type PreviewViewport = 'desktop' | 'tablet' | 'mobile'

const viewportWidth: Record<PreviewViewport, number | string> = {
  desktop: '100%',
  tablet: 760,
  mobile: 390
}

const groupLabels: Record<FieldGroup, string> = {
  content: 'Content',
  appearance: 'Appearance',
  settings: 'Settings'
}

const fieldGroups: FieldGroup[] = ['content', 'appearance', 'settings']
const themeEditorId = '__theme__'
const hexColorPattern = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/

const validateDocument = (
  detail: MicrositeAdminDetail,
  catalog: MicrositeTemplateCatalog
) => {
  const errors: string[] = []
  const theme = detail.draft.theme

  if (!catalog.allowedFonts.includes(theme.fontFamily)) {
    errors.push('Theme body font is not supported.')
  }
  if (!catalog.allowedFonts.includes(theme.headingFontFamily)) {
    errors.push('Theme heading font is not supported.')
  }
  if (theme.baseFontSize < 12 || theme.baseFontSize > 24) {
    errors.push('Theme base font size must be between 12 and 24.')
  }
  if (theme.buttonRadius < 0 || theme.buttonRadius > 48) {
    errors.push('Theme button radius must be between 0 and 48.')
  }
  if (theme.containerWidth < 720 || theme.containerWidth > 1600) {
    errors.push('Theme container width must be between 720 and 1600.')
  }
  for (const [label, value] of [
    ['Primary', theme.primaryColor],
    ['Secondary', theme.secondaryColor],
    ['Background', theme.backgroundColor],
    ['Text', theme.textColor]
  ] as const) {
    if (!hexColorPattern.test(value)) {
      errors.push(`${label} theme color is invalid.`)
    }
  }

  for (const section of detail.draft.sections) {
    const definition = catalog.sectionRegistry.find(item => item.type === section.type)
    if (!definition) {
      errors.push(`Unsupported section type: ${section.type}`)
      continue
    }

    for (const field of definition.fields) {
      const value = readMicrositeFieldValue(section, field.target)
      const error = validateMicrositeField(field, value)

      if (error) errors.push(`${definition.label}: ${error}`)
    }

    if (
      section.dataSource &&
      !definition.allowedDataSources.includes(section.dataSource)
    ) {
      errors.push(
        `${definition.label}: Unsupported data source '${section.dataSource}'.`
      )
    }

    for (const element of section.elements) {
      if (!definition.allowedElementTypes.includes(element.type)) {
        errors.push(
          `${definition.label}: Unsupported element type '${element.type}'.`
        )
      }
    }

    for (const error of validateMicrositeSectionSafety(section)) {
      errors.push(`${definition.label}: ${error}`)
    }

    for (const error of validateMicrositeStructuredSection(section)) {
      errors.push(`${definition.label}: ${error}`)
    }
  }

  return errors
}

export default function Page() {
  const params = useParams<{ eventId: string }>()
  const router = useRouter()
  const eventId = params.eventId

  const editAccess = usePermissionAccess('microsite.edit')
  const sectionManageAccess = usePermissionAccess('microsite.section.manage')
  const assetUploadAccess = usePermissionAccess('microsite.asset.upload')

  const [detail, setDetail] = useState<MicrositeAdminDetail | null>(null)
  const [summary, setSummary] = useState<MicrositeListItem | null>(null)
  const [catalog, setCatalog] = useState<MicrositeTemplateCatalog | null>(null)
  const [dataBindings, setDataBindings] = useState<Record<string, unknown>>({})
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [activeGroup, setActiveGroup] = useState<FieldGroup>('content')
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>('desktop')
  const [baseline, setBaseline] = useState('')
  const [baselineStructure, setBaselineStructure] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  const structureSnapshot = (value: MicrositeAdminDetail['draft']) =>
    JSON.stringify(
      value.sections
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(section => ({
          id: section.id,
          type: section.type
        }))
    )

  const dirty = Boolean(
    detail &&
    baseline &&
    JSON.stringify(detail.draft) !== baseline
  )
  const layoutDirty = Boolean(
    detail &&
    baselineStructure &&
    structureSnapshot(detail.draft) !== baselineStructure
  )

  useUnsavedChanges(dirty)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        setSaveMessage('')

        const [nextDetail, list, nextCatalog, preview] = await Promise.all([
          getAdminMicrosite(eventId),
          listAdminMicrosites(),
          getEventMicrositeCatalog(eventId),
          getMicrositePreview(eventId)
        ])

        if (!active) return

        setDetail(nextDetail)
        setSummary(list.find(item => item.eventId === eventId) ?? null)
        setCatalog(nextCatalog)
        setDataBindings(preview.dataBindings)
        setSelectedSectionId(nextDetail.draft.sections[0]?.id ?? '')
        setBaseline(JSON.stringify(nextDetail.draft))
        setBaselineStructure(structureSnapshot(nextDetail.draft))
      } catch (loadError) {
        if (!active) return

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load MicroSite editor.'
        )
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
    () =>
      detail?.draft.sections.find(section => section.id === selectedSectionId) ??
      null,
    [detail, selectedSectionId]
  )

  const selectedDefinition = useMemo<MicrositeSectionRegistryItem | null>(
    () =>
      selectedSection && catalog
        ? catalog.sectionRegistry.find(item => item.type === selectedSection.type) ??
          null
        : null,
    [catalog, selectedSection]
  )

  const visibleFields = useMemo(
    () =>
      selectedDefinition?.fields.filter(field => field.group === activeGroup) ??
      [],
    [activeGroup, selectedDefinition]
  )

  const orderedSections = useMemo(
    () =>
      detail?.draft.sections
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder) ?? [],
    [detail]
  )

  const availableSections = useMemo(
    () => {
      if (!detail || !catalog) return []

      const existing = new Set(detail.draft.sections.map(section => section.type))
      return catalog.sectionRegistry.filter(definition => !existing.has(definition.type))
    },
    [catalog, detail]
  )

  const applyServerDetail = async (
    next: MicrositeAdminDetail,
    message: string
  ) => {
    setDetail(next)
    setBaseline(JSON.stringify(next.draft))
    setBaselineStructure(structureSnapshot(next.draft))
    setError('')
    setSaveMessage(message)

    if (
      selectedSectionId !== themeEditorId &&
      !next.draft.sections.some(section => section.id === selectedSectionId)
    ) {
      setSelectedSectionId(next.draft.sections[0]?.id ?? themeEditorId)
    }

    try {
      const preview = await getMicrositePreview(eventId)
      setDataBindings(preview.dataBindings)
    } catch {
      // The saved draft remains authoritative even if preview bindings are temporarily unavailable.
    }
  }

  const addSection = (type: string) => {
    if (!detail || !catalog || !sectionManageAccess.allowed) return

    const definition = catalog.sectionRegistry.find(item => item.type === type)
    if (!definition) return

    const template =
      catalog.templates.find(item => item.key === detail.templateKey) ??
      catalog.templates.find(item => item.isActive)
    const source =
      template?.defaultDocument.sections.find(section => section.type === type) ??
      catalog.templates
        .flatMap(item => item.defaultDocument.sections)
        .find(section => section.type === type)

    const nextSection = source
      ? JSON.parse(JSON.stringify(source)) as MicrositeAdminDetail['draft']['sections'][number]
      : {
          id: `${type}-${Date.now().toString(36)}`,
          type,
          name: definition.label,
          visible: true,
          sortOrder: detail.draft.sections.length,
          dataSource: definition.allowedDataSources[0] ?? 'manual',
          style: {
            backgroundColor: null,
            backgroundImageUrl: null,
            textColor: null,
            paddingTop: 64,
            paddingBottom: 64,
            contentAlign: 'left',
            layoutPreset: 'stacked'
          },
          elements: []
        }

    nextSection.sortOrder = detail.draft.sections.length

    const sections = [...detail.draft.sections, nextSection].map(
      (section, sortOrder) => ({ ...section, sortOrder })
    )

    setDetail({
      ...detail,
      draft: { ...detail.draft, sections }
    })
    setSelectedSectionId(nextSection.id)
    setActiveGroup('content')
    setSaveMessage('')
  }

  const deleteSection = (sectionId: string) => {
    if (
      !detail ||
      !sectionManageAccess.allowed ||
      detail.draft.sections.length <= 1
    ) {
      return
    }

    const sections = detail.draft.sections
      .filter(section => section.id !== sectionId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((section, sortOrder) => ({ ...section, sortOrder }))

    setDetail({
      ...detail,
      draft: { ...detail.draft, sections }
    })
    setSelectedSectionId(sections[0]?.id ?? themeEditorId)
    setActiveGroup('content')
    setSaveMessage('')
  }

  const moveSection = (
    sectionId: string,
    direction: -1 | 1
  ) => {
    if (!detail || !sectionManageAccess.allowed) return

    const ordered = detail.draft.sections
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const index = ordered.findIndex(section => section.id === sectionId)
    const targetIndex = index + direction

    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >= ordered.length
    ) {
      return
    }

    const current = ordered[index]
    ordered[index] = ordered[targetIndex]
    ordered[targetIndex] = current

    const nextSections = ordered.map((section, sortOrder) => ({
      ...section,
      sortOrder
    }))

    setDetail({
      ...detail,
      draft: {
        ...detail.draft,
        sections: nextSections
      }
    })
    setSaveMessage('')
  }

  const updateField = (
    field: MicrositeSectionFieldDefinition,
    value: MicrositeFieldValue
  ) => {
    if (!detail || !selectedSection) return

    const nextSection = writeMicrositeFieldValue(
      selectedSection,
      field.target,
      value
    )

    setDetail({
      ...detail,
      draft: {
        ...detail.draft,
        sections: detail.draft.sections.map(section =>
          section.id === selectedSection.id ? nextSection : section
        )
      }
    })
    setSaveMessage('')
  }

  const updateSelectedSection = (
    nextSection: MicrositeAdminDetail['draft']['sections'][number]
  ) => {
    if (!detail || !selectedSection) return

    setDetail({
      ...detail,
      draft: {
        ...detail.draft,
        sections: detail.draft.sections.map(section =>
          section.id === selectedSection.id ? nextSection : section
        )
      }
    })
    setSaveMessage('')
  }

  const save = async () => {
    if (!detail || !catalog || saving || !dirty) return

    const validationErrors = validateDocument(detail, catalog)

    if (validationErrors.length > 0) {
      setError(validationErrors[0])
      return
    }

    try {
      setSaving(true)
      setError('')
      setSaveMessage('')

      const request = {
        expectedDraftVersionNumber: detail.draftVersionNumber,
        document: detail.draft
      }
      const saved = layoutDirty
        ? await saveMicrositeLayout(eventId, request)
        : await saveMicrositeContent(eventId, request)

      await applyServerDetail(
        saved,
        layoutDirty
          ? `Layout saved as draft v${saved.draftVersionNumber}.`
          : `Draft v${saved.draftVersionNumber} saved.`
      )
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save MicroSite changes.'
      )
    } finally {
      setSaving(false)
    }
  }

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

  if (error && !detail) {
    return <Alert severity='error'>{error}</Alert>
  }

  if (!detail || !catalog) {
    return <Alert severity='error'>MicroSite editor data is unavailable.</Alert>
  }

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
            sx={{ mb: 1, px: 0, minHeight: 44 }}
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

        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}
        >
          <Chip
            size='small'
            label={`Draft v${detail.draftVersionNumber}`}
            variant='outlined'
          />
          <Chip
            size='small'
            label={
              detail.publishedVersionNumber !== null
                ? `Published v${detail.publishedVersionNumber}`
                : 'Not published'
            }
            color={
              detail.publishedVersionNumber !== null ? 'success' : 'default'
            }
            variant={
              detail.publishedVersionNumber !== null ? 'tonal' : 'outlined'
            }
          />
          {dirty && (
            <Chip
              size='small'
              label='Unsaved changes'
              color='warning'
              variant='outlined'
            />
          )}
          <Button
            variant='contained'
            disabled={
              !editAccess.allowed ||
              !dirty ||
              saving ||
              (layoutDirty && !sectionManageAccess.allowed)
            }
            onClick={() => void save()}
            sx={{ minHeight: 44 }}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </Button>

          <MicrositeLifecycleActions
            eventId={eventId}
            eventName={summary?.eventName ?? 'Event'}
            detail={detail}
            catalog={catalog}
            dirty={dirty}
            onChanged={applyServerDetail}
            onDeleted={() => router.push('/admin/microsite/sites')}
            onError={setError}
          />
        </Box>
      </Box>

      {error && <Alert severity='error'>{error}</Alert>}
      {saveMessage && <Alert severity='success'>{saveMessage}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: '250px minmax(0, 1fr) 320px'
          },
          gap: 2.5,
          alignItems: 'start'
        }}
      >
        <Card
          variant='outlined'
          sx={{
            position: { lg: 'sticky' },
            top: { lg: 88 },
            maxHeight: { lg: 'calc(100vh - 120px)' },
            overflow: 'hidden'
          }}
        >
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box sx={{ px: 2.5, py: 2, display: 'grid', gap: 1.5 }}>
              <Box>
                <Typography variant='subtitle1' fontWeight={700}>
                  Sections
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {detail.draft.sections.length} configured
                </Typography>
              </Box>

              {sectionManageAccess.allowed && availableSections.length > 0 && (
                <TextField
                  select
                  size='small'
                  label='Add section'
                  value=''
                  onChange={event => addSection(event.target.value)}
                  disabled={saving}
                  fullWidth
                >
                  {availableSections.map(definition => (
                    <MenuItem key={definition.type} value={definition.type}>
                      {definition.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Box>

            <Divider />

            <ListItemButton
              selected={selectedSectionId === themeEditorId}
              onClick={() => {
                setSelectedSectionId(themeEditorId)
                setActiveGroup('appearance')
              }}
              sx={{ minHeight: 56, px: 2.5 }}
            >
              <ListItemText
                primary='Global Theme'
                secondary='Fonts, colors and page width'
                primaryTypographyProps={{ fontWeight: 650 }}
              />
            </ListItemButton>

            <Divider />

            <List
              disablePadding
              sx={{
                overflowY: { lg: 'auto' },
                maxHeight: { lg: 'calc(100vh - 210px)' }
              }}
            >
              {orderedSections.map((section, index) => {
                const definition = catalog.sectionRegistry.find(
                  item => item.type === section.type
                )
                const canReorder =
                  Boolean(definition?.supportsReorder) &&
                  sectionManageAccess.allowed &&
                  !saving

                return (
                  <Box
                    component='li'
                    key={section.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'stretch',
                      borderBottom:
                        index < orderedSections.length - 1
                          ? theme => `1px solid ${theme.palette.divider}`
                          : 'none'
                    }}
                  >
                    <ListItemButton
                      selected={section.id === selectedSectionId}
                      onClick={() => {
                        setSelectedSectionId(section.id)
                        setActiveGroup('content')
                      }}
                      sx={{ minHeight: 56, px: 2.5, minWidth: 0 }}
                    >
                      <ListItemText
                        primary={definition?.label || section.name}
                        secondary={
                          section.visible
                            ? section.name
                            : `${section.name} · hidden`
                        }
                        primaryTypographyProps={{
                          fontWeight: 650,
                          noWrap: true
                        }}
                        secondaryTypographyProps={{
                          noWrap: true
                        }}
                      />
                    </ListItemButton>

                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        px: 0.5
                      }}
                    >
                      <IconButton
                        size='small'
                        aria-label={`Move ${section.name} up`}
                        disabled={!canReorder || index === 0}
                        onClick={() => moveSection(section.id, -1)}
                        sx={{ minWidth: 44, minHeight: 44 }}
                      >
                        <i className='tabler-chevron-up' />
                      </IconButton>
                      <IconButton
                        size='small'
                        aria-label={`Move ${section.name} down`}
                        disabled={
                          !canReorder ||
                          index === orderedSections.length - 1
                        }
                        onClick={() => moveSection(section.id, 1)}
                        sx={{ minWidth: 44, minHeight: 44 }}
                      >
                        <i className='tabler-chevron-down' />
                      </IconButton>
                    </Box>
                  </Box>
                )
              })}
            </List>
          </CardContent>
        </Card>

        <Card variant='outlined' sx={{ minWidth: 0 }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box
              sx={{
                px: { xs: 2.5, sm: 3 },
                py: 2,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { sm: 'center' },
                gap: 1.5
              }}
            >
              <Box>
                <Typography variant='subtitle1' fontWeight={700}>
                  Live Preview
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Uses the current draft and backend section contract.
                </Typography>
              </Box>

              <ToggleButtonGroup
                exclusive
                size='small'
                value={previewViewport}
                onChange={(_, value: PreviewViewport | null) => {
                  if (value) setPreviewViewport(value)
                }}
                aria-label='Preview viewport'
              >
                <ToggleButton value='desktop' aria-label='Desktop preview'>
                  <i className='tabler-device-desktop' />
                </ToggleButton>
                <ToggleButton value='tablet' aria-label='Tablet preview'>
                  <i className='tabler-device-tablet' />
                </ToggleButton>
                <ToggleButton value='mobile' aria-label='Mobile preview'>
                  <i className='tabler-device-mobile' />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Divider />

            <Box
              sx={{
                p: { xs: 1.5, sm: 2.5 },
                bgcolor: 'action.hover',
                overflowX: 'auto'
              }}
            >
              <Box
                sx={{
                  width: viewportWidth[previewViewport],
                  maxWidth:
                    previewViewport === 'desktop' ? '100%' : undefined,
                  mx: 'auto',
                  bgcolor: 'background.paper',
                  border: theme => `1px solid ${theme.palette.divider}`,
                  transition: 'width 160ms ease'
                }}
              >
                <MicrositeDocumentPreview
                  document={detail.draft}
                  dataBindings={dataBindings}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant='outlined'
          sx={{
            position: { lg: 'sticky' },
            top: { lg: 88 },
            maxHeight: { lg: 'calc(100vh - 120px)' },
            overflow: 'hidden'
          }}
        >
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box sx={{ px: 2.5, pt: 2.5 }}>
              <Typography variant='subtitle1' fontWeight={700}>
                {selectedSectionId === themeEditorId
                  ? 'Global Theme'
                  : selectedDefinition?.label || 'Edit Section'}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ display: 'block', mt: 0.5, lineHeight: 1.5 }}
              >
                {selectedSectionId === themeEditorId
                  ? 'Set the default typography, colors, button radius, and content width for this MicroSite.'
                  : selectedDefinition?.description ||
                    'Select a supported section to edit its properties.'}
              </Typography>
            </Box>

            {selectedSectionId !== themeEditorId && (
              <>
                <Tabs
                  value={activeGroup}
                  onChange={(_, value: FieldGroup) => setActiveGroup(value)}
                  variant='fullWidth'
                  sx={{ mt: 1.5 }}
                >
                  {fieldGroups.map(group => (
                    <Tab
                      key={group}
                      value={group}
                      label={groupLabels[group]}
                      sx={{ minWidth: 0, minHeight: 48, px: 1 }}
                    />
                  ))}
                </Tabs>
                <Divider />
              </>
            )}

            <Box
              sx={{
                p: 2.5,
                display: 'grid',
                gap: 2,
                overflowY: { lg: 'auto' },
                maxHeight: { lg: 'calc(100vh - 300px)' }
              }}
            >
              {selectedSectionId === themeEditorId ? (
                <MicrositeThemeEditor
                  theme={detail.draft.theme}
                  fonts={catalog.allowedFonts}
                  disabled={!editAccess.allowed || saving}
                  onChange={theme => {
                    setDetail({
                      ...detail,
                      draft: {
                        ...detail.draft,
                        theme
                      }
                    })
                    setSaveMessage('')
                  }}
                />
              ) : !selectedSection || !selectedDefinition ? (
                <Alert severity='info'>
                  This section does not have an editor definition yet.
                </Alert>
              ) : (
                <>
                  {visibleFields.map(field => {
                    const value = readMicrositeFieldValue(
                      selectedSection,
                      field.target
                    )
                    const fieldError = validateMicrositeField(field, value)

                    return (
                      <MicrositeSectionFieldEditor
                        key={field.key}
                        field={field}
                        value={value}
                        error={fieldError}
                        disabled={!editAccess.allowed || saving}
                        onChange={nextValue => updateField(field, nextValue)}
                        onUploadAsset={
                          assetUploadAccess.allowed
                            ? async file => {
                                const uploaded = await uploadMicrositeAsset(eventId, file)
                                return uploaded.url
                              }
                            : undefined
                        }
                      />
                    )
                  })}

                  {selectedSection.type === 'faq' && activeGroup === 'content' && (
                    <>
                      {visibleFields.length > 0 && <Divider />}
                      <MicrositeFaqItemsEditor
                        section={selectedSection}
                        disabled={!editAccess.allowed || saving}
                        onChange={updateSelectedSection}
                      />
                    </>
                  )}

                  {selectedSection.type === 'contact' && activeGroup === 'content' && (
                    <>
                      {visibleFields.length > 0 && <Divider />}
                      <MicrositeContactItemsEditor
                        section={selectedSection}
                        disabled={!editAccess.allowed || saving}
                        onChange={updateSelectedSection}
                      />
                    </>
                  )}

                  {selectedSection.type === 'sponsor' && activeGroup === 'content' && (
                    <>
                      {visibleFields.length > 0 && <Divider />}
                      <MicrositeSponsorItemsEditor
                        section={selectedSection}
                        disabled={!editAccess.allowed || saving}
                        onUploadAsset={
                          assetUploadAccess.allowed
                            ? async file => {
                                const uploaded = await uploadMicrositeAsset(eventId, file)
                                return uploaded.url
                              }
                            : undefined
                        }
                        onChange={updateSelectedSection}
                      />
                    </>
                  )}

                  {visibleFields.length === 0 &&
                    !(
                      activeGroup === 'content' &&
                      (
                        selectedSection.type === 'faq' ||
                        selectedSection.type === 'contact' ||
                        selectedSection.type === 'sponsor'
                      )
                    ) && (
                      <Typography variant='body2' color='text.secondary'>
                        No {groupLabels[activeGroup].toLowerCase()} fields are available for this section.
                      </Typography>
                    )}

                  {activeGroup === 'settings' &&
                    sectionManageAccess.allowed &&
                    detail.draft.sections.length > 1 && (
                      <>
                        <Divider />
                        <Button
                          color='error'
                          variant='outlined'
                          startIcon={<i className='tabler-trash' />}
                          disabled={saving}
                          onClick={() => deleteSection(selectedSection.id)}
                        >
                          Delete section
                        </Button>
                      </>
                    )}
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
