'use client'

import { useEffect, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

type Props = {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  disabled?: boolean
}

type ToolbarButtonProps = {
  label: string
  icon: string
  onClick: () => void
  disabled?: boolean
}

const ToolbarButton = ({ label, icon, onClick, disabled }: ToolbarButtonProps) => (
  <Tooltip title={label}>
    <span>
      <IconButton
        size='small'
        aria-label={label}
        disabled={disabled}
        onMouseDown={event => event.preventDefault()}
        onClick={onClick}
      >
        <i className={icon} />
      </IconButton>
    </span>
  </Tooltip>
)

const fontFamilies = [
  ['Arial', 'Arial'],
  ['Georgia', 'Georgia'],
  ['Times New Roman', 'Times New Roman'],
  ['Verdana', 'Verdana'],
  ['Trebuchet MS', 'Trebuchet MS'],
  ['Courier New', 'Courier New']
] as const

const LegalRichEditor = ({
  value,
  onChange,
  ariaLabel,
  disabled = false
}: Props) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef<Range | null>(null)
  const [textColor, setTextColor] = useState('#111827')
  const [highlightColor, setHighlightColor] = useState('#fff3a3')

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
    const range = selectionRef.current
    const selection = window.getSelection()

    if (!editor || !selection) return

    editor.focus()

    if (!range) return

    selection.removeAllRanges()
    selection.addRange(range)
  }

  const emitChange = () => {
    const editor = editorRef.current
    if (!editor) return

    onChange(editor.innerHTML)
    saveSelection()
  }

  const runCommand = (command: string, commandValue?: string) => {
    if (disabled) return

    restoreSelection()
    document.execCommand(command, false, commandValue)
    emitChange()
  }

  const runCssCommand = (command: string, commandValue: string) => {
    if (disabled) return

    restoreSelection()
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(command, false, commandValue)
    emitChange()
  }

  const applyBlock = (block: string) => {
    runCommand('formatBlock', block)
  }

  const applyTextSize = (size: string) => {
    runCommand('fontSize', size)
  }

  const addLink = () => {
    if (disabled) return

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

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: disabled ? 'action.disabledBackground' : 'background.paper'
      }}
    >
      <Box
        role='toolbar'
        aria-label='Legal document formatting'
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          flexWrap: 'wrap',
          px: 1,
          py: 0.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover'
        }}
      >
        <Select
          size='small'
          defaultValue='p'
          disabled={disabled}
          aria-label='Block style'
          onChange={event => applyBlock(String(event.target.value))}
          sx={{ minWidth: 126, '& .MuiSelect-select': { py: 0.75 } }}
        >
          <MenuItem value='p'>Paragraph</MenuItem>
          <MenuItem value='h1'>Heading 1</MenuItem>
          <MenuItem value='h2'>Heading 2</MenuItem>
          <MenuItem value='h3'>Heading 3</MenuItem>
          <MenuItem value='blockquote'>Quote</MenuItem>
        </Select>

        <Select
          size='small'
          defaultValue='3'
          disabled={disabled}
          aria-label='Text size'
          onChange={event => applyTextSize(String(event.target.value))}
          sx={{ minWidth: 108, '& .MuiSelect-select': { py: 0.75 } }}
        >
          <MenuItem value='2'>Small</MenuItem>
          <MenuItem value='3'>Normal</MenuItem>
          <MenuItem value='4'>Large</MenuItem>
          <MenuItem value='5'>X-Large</MenuItem>
          <MenuItem value='6'>2X-Large</MenuItem>
        </Select>

        <Select
          size='small'
          defaultValue='Arial'
          disabled={disabled}
          aria-label='Font family'
          onChange={event => runCssCommand('fontName', String(event.target.value))}
          sx={{ minWidth: 150, '& .MuiSelect-select': { py: 0.75 } }}
        >
          {fontFamilies.map(([label, value]) => (
            <MenuItem key={value} value={value} sx={{ fontFamily: value }}>
              {label}
            </MenuItem>
          ))}
        </Select>

        <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />

        <ToolbarButton label='Bold' icon='tabler-bold' disabled={disabled} onClick={() => runCommand('bold')} />
        <ToolbarButton label='Italic' icon='tabler-italic' disabled={disabled} onClick={() => runCommand('italic')} />
        <ToolbarButton label='Underline' icon='tabler-underline' disabled={disabled} onClick={() => runCommand('underline')} />
        <ToolbarButton label='Strikethrough' icon='tabler-strikethrough' disabled={disabled} onClick={() => runCommand('strikeThrough')} />

        <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />

        <Tooltip title='Text color'>
          <Box
            component='label'
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              display: 'grid',
              placeItems: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <i className='tabler-letter-a' />
            <Box
              component='input'
              type='color'
              value={textColor}
              disabled={disabled}
              aria-label='Choose text color'
              onMouseDown={saveSelection}
              onChange={event => {
                setTextColor(event.target.value)
                runCssCommand('foreColor', event.target.value)
              }}
              sx={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
            />
            <Box sx={{ position: 'absolute', left: 6, right: 6, bottom: 3, height: 3, bgcolor: textColor, borderRadius: 2 }} />
          </Box>
        </Tooltip>

        <Tooltip title='Highlight color'>
          <Box
            component='label'
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              display: 'grid',
              placeItems: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <i className='tabler-highlight' />
            <Box
              component='input'
              type='color'
              value={highlightColor}
              disabled={disabled}
              aria-label='Choose highlight color'
              onMouseDown={saveSelection}
              onChange={event => {
                setHighlightColor(event.target.value)
                runCssCommand('hiliteColor', event.target.value)
              }}
              sx={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
            />
            <Box sx={{ position: 'absolute', left: 6, right: 6, bottom: 3, height: 3, bgcolor: highlightColor, borderRadius: 2 }} />
          </Box>
        </Tooltip>

        <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />

        <ToolbarButton label='Align left' icon='tabler-align-left' disabled={disabled} onClick={() => runCommand('justifyLeft')} />
        <ToolbarButton label='Align center' icon='tabler-align-center' disabled={disabled} onClick={() => runCommand('justifyCenter')} />
        <ToolbarButton label='Align right' icon='tabler-align-right' disabled={disabled} onClick={() => runCommand('justifyRight')} />
        <ToolbarButton label='Justify' icon='tabler-align-justified' disabled={disabled} onClick={() => runCommand('justifyFull')} />

        <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />

        <ToolbarButton label='Bulleted list' icon='tabler-list' disabled={disabled} onClick={() => runCommand('insertUnorderedList')} />
        <ToolbarButton label='Numbered list' icon='tabler-list-numbers' disabled={disabled} onClick={() => runCommand('insertOrderedList')} />
        <ToolbarButton label='Add link' icon='tabler-link' disabled={disabled} onClick={addLink} />
        <ToolbarButton label='Remove link' icon='tabler-link-off' disabled={disabled} onClick={() => runCommand('unlink')} />

        <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />

        <ToolbarButton label='Undo' icon='tabler-arrow-back-up' disabled={disabled} onClick={() => runCommand('undo')} />
        <ToolbarButton label='Redo' icon='tabler-arrow-forward-up' disabled={disabled} onClick={() => runCommand('redo')} />
        <ToolbarButton label='Clear formatting' icon='tabler-clear-formatting' disabled={disabled} onClick={() => runCommand('removeFormat')} />
      </Box>

      <Box
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role='textbox'
        aria-label={ariaLabel}
        aria-multiline='true'
        onInput={emitChange}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onFocus={saveSelection}
        sx={{
          minHeight: 380,
          maxHeight: 680,
          overflowY: 'auto',
          p: { xs: 2, sm: 2.5 },
          outline: 'none',
          lineHeight: 1.8,
          cursor: disabled ? 'not-allowed' : 'text',
          '&:empty:before': {
            content: '"Start writing the legal document..."',
            color: 'text.disabled',
            pointerEvents: 'none'
          },
          '& h1': { fontSize: '2rem', lineHeight: 1.25, mt: 1, mb: 2 },
          '& h2': { fontSize: '1.6rem', lineHeight: 1.3, mt: 2.5, mb: 1.5 },
          '& h3': { fontSize: '1.3rem', lineHeight: 1.35, mt: 2, mb: 1.25 },
          '& p, & div': { my: 1.25 },
          '& ul, & ol': { pl: 3.5 },
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

      <Box sx={{ px: 1.5, py: 0.75, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant='caption' color='text.secondary'>
          Preview and public rendering use the same safe formatting rules. Scripts and unsupported styles are removed.
        </Typography>
      </Box>
    </Box>
  )
}

export default LegalRichEditor
