'use client'

import { useEffect, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import ConfirmActionDialog from '@/components/feedback/ConfirmActionDialog'

import {
  createBenefitItem,
  createContentSection,
  parseEventBenefits,
  parseEventContentSections,
  sanitizeRichHtml,
  serializeEventBenefits,
  serializeEventContentSections,
  type EventBenefitItem,
  type EventContentSection
} from '@/lib/event-content'

const BENEFIT_ICONS = [
  ['tabler-sparkles', 'Highlights'],
  ['tabler-medal', 'Medal / Achievement'],
  ['tabler-gift', 'Gift / Prize'],
  ['tabler-shirt', 'Apparel'],
  ['tabler-bottle', 'Refreshment'],
  ['tabler-certificate', 'Certificate'],
  ['tabler-ticket', 'Ticket / Access'],
  ['tabler-route', 'Route / Experience'],
  ['tabler-heart', 'Wellness'],
  ['tabler-users', 'Community']
] as const

const RichTextEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef<Range | null>(null)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || document.activeElement === editor) return
    if (editor.innerHTML !== value) editor.innerHTML = value
  }, [value])

  const saveSelection = () => {
    const editor = editorRef.current
    const selection = window.getSelection()

    if (!editor || !selection?.rangeCount) return

    const range = selection.getRangeAt(0)
    const ancestor = range.commonAncestorContainer

    if (editor.contains(ancestor) || ancestor === editor) {
      selectionRef.current = range.cloneRange()
    }
  }

  const restoreSelection = () => {
    const editor = editorRef.current
    const selection = window.getSelection()

    if (!editor || !selection) return

    editor.focus()

    if (!selectionRef.current) return

    selection.removeAllRanges()
    selection.addRange(selectionRef.current)
  }

  const emitChange = () => {
    if (!editorRef.current) return
    onChange(sanitizeRichHtml(editorRef.current.innerHTML))
    saveSelection()
  }

  const command = (name: string, commandValue?: string) => {
    restoreSelection()
    document.execCommand(name, false, commandValue)
    emitChange()
  }

  const addLink = () => {
    restoreSelection()
    const selection = window.getSelection()

    if (!selection || selection.isCollapsed) {
      window.alert('Select the text you want to turn into a link first.')
      return
    }

    const url = window.prompt('Enter a link URL (https://, mailto:, tel:, or /path):')
    if (!url?.trim()) return

    document.execCommand('createLink', false, url.trim())
    emitChange()
  }

  const toolbar = [
    { label: 'Bold', icon: 'tabler-bold', action: () => command('bold') },
    { label: 'Italic', icon: 'tabler-italic', action: () => command('italic') },
    { label: 'Underline', icon: 'tabler-underline', action: () => command('underline') },
    { label: 'Strikethrough', icon: 'tabler-strikethrough', action: () => command('strikeThrough') },
    { label: 'Heading 1', icon: 'tabler-h-1', action: () => command('formatBlock', 'h1') },
    { label: 'Heading 2', icon: 'tabler-h-2', action: () => command('formatBlock', 'h2') },
    { label: 'Heading 3', icon: 'tabler-h-3', action: () => command('formatBlock', 'h3') },
    { label: 'Paragraph', icon: 'tabler-letter-p', action: () => command('formatBlock', 'p') },
    { label: 'Quote', icon: 'tabler-blockquote', action: () => command('formatBlock', 'blockquote') },
    { label: 'Align left', icon: 'tabler-align-left', action: () => command('justifyLeft') },
    { label: 'Align center', icon: 'tabler-align-center', action: () => command('justifyCenter') },
    { label: 'Align right', icon: 'tabler-align-right', action: () => command('justifyRight') },
    { label: 'Justify', icon: 'tabler-align-justified', action: () => command('justifyFull') },
    { label: 'Bulleted list', icon: 'tabler-list', action: () => command('insertUnorderedList') },
    { label: 'Numbered list', icon: 'tabler-list-numbers', action: () => command('insertOrderedList') },
    { label: 'Add link', icon: 'tabler-link', action: addLink },
    { label: 'Remove link', icon: 'tabler-link-off', action: () => command('unlink') },
    { label: 'Clear formatting', icon: 'tabler-clear-formatting', action: () => command('removeFormat') }
  ]

  return (
    <Box sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, overflow: 'hidden' }}>
      <Box
        role='toolbar'
        aria-label='Event section formatting'
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          p: 1,
          bgcolor: 'action.hover',
          borderBottom: theme => `1px solid ${theme.palette.divider}`
        }}
      >
        {toolbar.map(item => (
          <Tooltip title={item.label} key={item.label}>
            <IconButton
              type='button'
              size='small'
              onMouseDown={event => event.preventDefault()}
              onClick={item.action}
              aria-label={item.label}
            >
              <i className={item.icon} />
            </IconButton>
          </Tooltip>
        ))}
      </Box>
      <Box
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role='textbox'
        aria-multiline='true'
        aria-label='Section content'
        onInput={emitChange}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onFocus={saveSelection}
        sx={{
          minHeight: 180,
          maxHeight: 520,
          overflowY: 'auto',
          p: 2,
          outline: 'none',
          lineHeight: 1.75,
          '&:empty:before': {
            content: '"Write section content..."',
            color: 'text.disabled',
            pointerEvents: 'none'
          },
          '& h1': { fontSize: '1.8rem', mt: 1, mb: 1 },
          '& h2': { fontSize: '1.45rem', mt: 1, mb: 1 },
          '& h3': { fontSize: '1.2rem', mt: 1, mb: 1 },
          '& p, & div': { my: 1 },
          '& ul, & ol': { pl: 3 },
          '& blockquote': {
            mx: 0,
            pl: 2,
            borderLeft: '4px solid',
            borderColor: 'divider',
            color: 'text.secondary'
          },
          '& a': { color: 'primary.main', textDecoration: 'underline' }
        }}
      />
    </Box>
  )
}

export const DynamicBenefitsEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const items = parseEventBenefits(value)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)

  const updateItems = (next: EventBenefitItem[]) => onChange(serializeEventBenefits(next))
  const patch = (index: number, changes: Partial<EventBenefitItem>) =>
    updateItems(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item))

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant='subtitle1' fontWeight={700}>Event benefits</Typography>
          <Typography variant='body2' color='text.secondary'>Add benefit cards individually and choose the icon shown on the public event page.</Typography>
        </Box>
        <Button type='button' variant='outlined' startIcon={<i className='tabler-plus' />} onClick={() => updateItems([...items, createBenefitItem()])}>
          Add Benefit
        </Button>
      </Box>

      {items.length === 0 && (
        <Box sx={{ p: 3, border: theme => `1px dashed ${theme.palette.divider}`, borderRadius: 1, textAlign: 'center' }}>
          <Typography color='text.secondary'>No event benefits yet.</Typography>
        </Box>
      )}

      {items.map((item, index) => (
        <Card variant='outlined' key={item.id}>
          <CardContent sx={{ display: 'grid', gap: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
              <Typography fontWeight={700}>Benefit {index + 1}</Typography>
              <IconButton type='button' color='error' onClick={() => setRemoveIndex(index)} aria-label='Remove benefit'>
                <i className='tabler-trash' />
              </IconButton>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' }, gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel id={`benefit-icon-${item.id}`}>Icon</InputLabel>
                <Select labelId={`benefit-icon-${item.id}`} label='Icon' value={item.icon} onChange={event => patch(index, { icon: event.target.value })}>
                  {BENEFIT_ICONS.map(([icon, label]) => (
                    <MenuItem value={icon} key={icon}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}><i className={icon} /> {label}</Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField label='Benefit title' value={item.title} onChange={event => patch(index, { title: event.target.value })} inputProps={{ maxLength: 120 }} fullWidth />
            </Box>
            <TextField label='Short description (optional)' value={item.description} onChange={event => patch(index, { description: event.target.value })} inputProps={{ maxLength: 280 }} multiline minRows={2} fullWidth />
          </CardContent>
        </Card>
      ))}

      <ConfirmActionDialog
        open={removeIndex !== null}
        title='Remove event benefit?'
        description='This benefit card will be removed from the participant-facing event content.'
        confirmLabel='Confirm Remove'
        onClose={() => setRemoveIndex(null)}
        onConfirm={() => {
          if (removeIndex === null) return
          updateItems(items.filter((_, itemIndex) => itemIndex !== removeIndex))
          setRemoveIndex(null)
        }}
        details={
          removeIndex !== null && items[removeIndex]
            ? [{ label: 'Benefit', value: items[removeIndex].title || `Benefit ${removeIndex + 1}` }]
            : []
        }
      />
    </Box>
  )
}

export const DynamicContentSectionsEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const sections = parseEventContentSections(value)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)
  const updateSections = (next: EventContentSection[]) => onChange(serializeEventContentSections(next))
  const patch = (index: number, changes: Partial<EventContentSection>) =>
    updateSections(sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, ...changes } : section))

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant='subtitle1' fontWeight={700}>Additional information sections</Typography>
          <Typography variant='body2' color='text.secondary'>Create sections such as Prize, Rules, Winner Information, or What to Bring. Each section supports headings, bold, italic, underline, and lists.</Typography>
        </Box>
        <Button type='button' variant='outlined' startIcon={<i className='tabler-plus' />} onClick={() => updateSections([...sections, createContentSection()])}>
          Add Section
        </Button>
      </Box>

      {sections.length === 0 && (
        <Box sx={{ p: 3, border: theme => `1px dashed ${theme.palette.divider}`, borderRadius: 1, textAlign: 'center' }}>
          <Typography color='text.secondary'>No additional information sections yet.</Typography>
        </Box>
      )}

      {sections.map((section, index) => (
        <Card variant='outlined' key={section.id}>
          <CardContent sx={{ display: 'grid', gap: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
              <Typography fontWeight={700}>Section {index + 1}</Typography>
              <IconButton type='button' color='error' onClick={() => setRemoveIndex(index)} aria-label='Remove section'>
                <i className='tabler-trash' />
              </IconButton>
            </Box>
            <TextField label='Section title' placeholder='e.g. Prize' value={section.title} onChange={event => patch(index, { title: event.target.value })} inputProps={{ maxLength: 160 }} fullWidth />
            <RichTextEditor value={section.contentHtml} onChange={contentHtml => patch(index, { contentHtml })} />
          </CardContent>
        </Card>
      ))}

      <ConfirmActionDialog
        open={removeIndex !== null}
        title='Remove information section?'
        description='This section and its rich-text content will be removed from the participant-facing event page.'
        confirmLabel='Confirm Remove'
        onClose={() => setRemoveIndex(null)}
        onConfirm={() => {
          if (removeIndex === null) return
          updateSections(sections.filter((_, sectionIndex) => sectionIndex !== removeIndex))
          setRemoveIndex(null)
        }}
        details={
          removeIndex !== null && sections[removeIndex]
            ? [{ label: 'Section', value: sections[removeIndex].title || `Section ${removeIndex + 1}` }]
            : []
        }
        warning='The section content will be discarded from the current event form.'
      />
    </Box>
  )
}

// Default export keeps compatibility with the initial event-form import while
// the named exports are used for the two dedicated editors.
export default DynamicBenefitsEditor
