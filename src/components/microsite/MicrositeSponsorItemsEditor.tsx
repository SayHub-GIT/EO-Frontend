'use client'

import { useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type {
  MicrositeElement,
  MicrositeSection
} from '@/lib/admin-microsites'

type Props = {
  section: MicrositeSection
  disabled?: boolean
  onUploadAsset?: (file: File) => Promise<string>
  onChange: (section: MicrositeSection) => void
}

const sponsorPrefix = 'sponsor-item-'

const itemKey = () =>
  crypto.randomUUID().replaceAll('-', '').slice(0, 12)

const sponsorItems = (section: MicrositeSection) =>
  section.elements.filter(element => element.id !== 'sponsor-title')

const rebuildSection = (
  section: MicrositeSection,
  items: MicrositeElement[]
): MicrositeSection => {
  const title = section.elements.find(element => element.id === 'sponsor-title')

  return {
    ...section,
    elements: [
      ...(title ? [title] : []),
      ...items
    ]
  }
}

const createSponsor = (): MicrositeElement => ({
  id: `${sponsorPrefix}${itemKey()}`,
  type: 'image',
  content: null,
  assetUrl: null,
  altText: '',
  actionType: 'none',
  actionValue: null,
  style: {
    fontFamily: null,
    fontSize: null,
    fontWeight: null,
    lineHeight: null,
    letterSpacing: null,
    textAlign: null,
    textColor: null,
    backgroundColor: null,
    borderRadius: 8,
    widthPercent: 100,
    paddingY: null,
    paddingX: null,
    marginTop: null,
    marginBottom: null
  }
})

const MicrositeSponsorItemsEditor = ({
  section,
  disabled = false,
  onUploadAsset,
  onChange
}: Props) => {
  const items = sponsorItems(section)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadIndex, setUploadIndex] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const updateItem = (
    index: number,
    patch: Partial<MicrositeElement>
  ) => {
    const next = items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item
    )

    onChange(rebuildSection(section, next))
  }

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction

    if (target < 0 || target >= items.length) return

    const next = items.slice()
    const current = next[index]
    next[index] = next[target]
    next[target] = current

    onChange(rebuildSection(section, next))
  }

  const removeItem = (index: number) => {
    onChange(
      rebuildSection(
        section,
        items.filter((_, itemIndex) => itemIndex !== index)
      )
    )
  }

  const addItem = () => {
    if (items.length >= 24) return

    onChange(rebuildSection(section, [...items, createSponsor()]))
  }

  const startUpload = (index: number) => {
    setUploadIndex(index)
    setUploadError('')
    fileInputRef.current?.click()
  }

  const upload = async (file: File) => {
    if (!onUploadAsset || uploadIndex === null || uploading) return

    try {
      setUploading(true)
      setUploadError('')
      const url = await onUploadAsset(file)
      updateItem(uploadIndex, { assetUrl: url })
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'Unable to upload sponsor logo.'
      )
    } finally {
      setUploading(false)
      setUploadIndex(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <input
        ref={fileInputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp,image/gif'
        hidden
        onChange={event => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
        }}
      />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Box>
          <Typography variant='subtitle2' fontWeight={700}>
            Sponsors
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {items.length} of 24
          </Typography>
        </Box>

        <Button
          size='small'
          variant='outlined'
          disabled={disabled || items.length >= 24}
          onClick={addItem}
          startIcon={<i className='tabler-plus' />}
          sx={{ minHeight: 40 }}
        >
          Add sponsor
        </Button>
      </Box>

      {uploadError && (
        <Typography variant='caption' color='error'>
          {uploadError}
        </Typography>
      )}

      {items.length === 0 ? (
        <Typography variant='body2' color='text.secondary'>
          No sponsor logos yet. Add a sponsor when you have approved media.
        </Typography>
      ) : (
        items.map((item, index) => (
          <Box
            key={item.id}
            sx={{
              display: 'grid',
              gap: 1.25,
              p: 1.5,
              border: theme => `1px solid ${theme.palette.divider}`,
              borderRadius: 1
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Typography variant='caption' color='text.secondary'>
                Sponsor {index + 1}
              </Typography>

              <Box sx={{ display: 'flex', gap: 0.25 }}>
                <IconButton
                  size='small'
                  disabled={disabled || index === 0}
                  aria-label={`Move sponsor ${index + 1} up`}
                  onClick={() => moveItem(index, -1)}
                  sx={{ minWidth: 40, minHeight: 40 }}
                >
                  <i className='tabler-chevron-up' />
                </IconButton>
                <IconButton
                  size='small'
                  disabled={disabled || index === items.length - 1}
                  aria-label={`Move sponsor ${index + 1} down`}
                  onClick={() => moveItem(index, 1)}
                  sx={{ minWidth: 40, minHeight: 40 }}
                >
                  <i className='tabler-chevron-down' />
                </IconButton>
                <IconButton
                  size='small'
                  disabled={disabled}
                  aria-label={`Delete sponsor ${index + 1}`}
                  onClick={() => removeItem(index)}
                  sx={{ minWidth: 40, minHeight: 40 }}
                >
                  <i className='tabler-trash' />
                </IconButton>
              </Box>
            </Box>

            {item.assetUrl && (
              <Box
                component='img'
                src={item.assetUrl}
                alt={item.altText || ''}
                sx={{
                  width: 112,
                  height: 72,
                  objectFit: 'contain',
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  p: 1,
                  bgcolor: 'background.default'
                }}
              />
            )}

            <TextField
              fullWidth
              size='small'
              label='Sponsor name'
              value={item.altText ?? ''}
              disabled={disabled}
              inputProps={{ maxLength: 300 }}
              onChange={event =>
                updateItem(index, { altText: event.target.value })
              }
            />

            <TextField
              fullWidth
              size='small'
              label='Logo URL'
              value={item.assetUrl ?? ''}
              disabled={disabled || uploading}
              inputProps={{ maxLength: 2000 }}
              onChange={event =>
                updateItem(index, { assetUrl: event.target.value })
              }
            />

            {onUploadAsset && (
              <Button
                type='button'
                variant='outlined'
                size='small'
                disabled={disabled || uploading}
                startIcon={
                  uploading && uploadIndex === index
                    ? <CircularProgress size={16} />
                    : <i className='tabler-upload' />
                }
                onClick={() => startUpload(index)}
                sx={{ justifySelf: 'start', minHeight: 40 }}
              >
                {uploading && uploadIndex === index
                  ? 'Uploading...'
                  : 'Upload logo'}
              </Button>
            )}

            <TextField
              fullWidth
              size='small'
              label='Website (optional)'
              value={
                item.actionType === 'external'
                  ? item.actionValue ?? ''
                  : ''
              }
              disabled={disabled}
              inputProps={{ maxLength: 2000 }}
              onChange={event => {
                const value = event.target.value

                updateItem(index, {
                  actionType: value.trim() ? 'external' : 'none',
                  actionValue: value.trim() ? value : null
                })
              }}
            />
          </Box>
        ))
      )}
    </Box>
  )
}

export default MicrositeSponsorItemsEditor
