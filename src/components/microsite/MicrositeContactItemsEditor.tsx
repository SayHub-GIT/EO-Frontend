'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type {
  MicrositeElement,
  MicrositeSection
} from '@/lib/admin-microsites'

type Props = {
  section: MicrositeSection
  disabled?: boolean
  onChange: (section: MicrositeSection) => void
}

type ContactType = 'email' | 'phone' | 'external'

const contactPrefix = 'contact-item-'

const itemKey = () =>
  crypto.randomUUID().replaceAll('-', '').slice(0, 12)

const labelForType: Record<ContactType, string> = {
  email: 'Email',
  phone: 'Telepon',
  external: 'Website'
}

const inputTypeFor = (type: ContactType) => {
  switch (type) {
    case 'email':
      return 'email'
    case 'phone':
      return 'tel'
    default:
      return 'url'
  }
}

const contactItems = (section: MicrositeSection) =>
  section.elements.filter(element => element.id !== 'contact-title')

const rebuildSection = (
  section: MicrositeSection,
  items: MicrositeElement[]
): MicrositeSection => {
  const title = section.elements.find(element => element.id === 'contact-title')

  return {
    ...section,
    elements: [
      ...(title ? [title] : []),
      ...items
    ]
  }
}

const createContact = (): MicrositeElement => ({
  id: `${contactPrefix}${itemKey()}`,
  type: 'button',
  content: '',
  assetUrl: null,
  altText: null,
  actionType: 'email',
  actionValue: '',
  style: {
    fontFamily: null,
    fontSize: 15,
    fontWeight: 700,
    lineHeight: null,
    letterSpacing: null,
    textAlign: null,
    textColor: null,
    backgroundColor: null,
    borderRadius: 8,
    widthPercent: null,
    paddingY: 10,
    paddingX: 18,
    marginTop: null,
    marginBottom: 8
  }
})

const MicrositeContactItemsEditor = ({
  section,
  disabled = false,
  onChange
}: Props) => {
  const items = contactItems(section)

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
    if (items.length >= 12) return

    onChange(rebuildSection(section, [...items, createContact()]))
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
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
            Contact links
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {items.length} dari 12
          </Typography>
        </Box>

        <Button
          size='small'
          variant='outlined'
          disabled={disabled || items.length >= 12}
          onClick={addItem}
          startIcon={<i className='tabler-plus' />}
          sx={{ minHeight: 40 }}
        >
          Add contact
        </Button>
      </Box>

      {items.length === 0 ? (
        <Typography variant='body2' color='text.secondary'>
          Belum ada kontak. Tambahkan email, nomor telepon, atau website.
        </Typography>
      ) : (
        items.map((item, index) => {
          const actionType = (
            item.actionType === 'phone' || item.actionType === 'external'
              ? item.actionType
              : 'email'
          ) as ContactType

          return (
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
                  Kontak {index + 1}
                </Typography>

                <Box sx={{ display: 'flex', gap: 0.25 }}>
                  <IconButton
                    size='small'
                    disabled={disabled || index === 0}
                    aria-label={`Pindahkan kontak ${index + 1} up`}
                    onClick={() => moveItem(index, -1)}
                    sx={{ minWidth: 40, minHeight: 40 }}
                  >
                    <i className='tabler-chevron-up' />
                  </IconButton>
                  <IconButton
                    size='small'
                    disabled={disabled || index === items.length - 1}
                    aria-label={`Pindahkan kontak ${index + 1} down`}
                    onClick={() => moveItem(index, 1)}
                    sx={{ minWidth: 40, minHeight: 40 }}
                  >
                    <i className='tabler-chevron-down' />
                  </IconButton>
                  <IconButton
                    size='small'
                    disabled={disabled}
                    aria-label={`Hapus kontak ${index + 1}`}
                    onClick={() => removeItem(index)}
                    sx={{ minWidth: 40, minHeight: 40 }}
                  >
                    <i className='tabler-trash' />
                  </IconButton>
                </Box>
              </Box>

              <TextField
                select
                fullWidth
                size='small'
                label='Jenis kontak'
                value={actionType}
                disabled={disabled}
                onChange={event => {
                  const nextType = event.target.value as ContactType
                  updateItem(index, {
                    actionType: nextType,
                    actionValue: ''
                  })
                }}
              >
                <MenuItem value='email'>Email</MenuItem>
                <MenuItem value='phone'>Telepon</MenuItem>
                <MenuItem value='external'>Website</MenuItem>
              </TextField>

              <TextField
                fullWidth
                size='small'
                label='Nama yang ditampilkan'
                value={item.content ?? ''}
                disabled={disabled}
                inputProps={{ maxLength: 12000 }}
                onChange={event =>
                  updateItem(index, { content: event.target.value })
                }
              />

              <TextField
                fullWidth
                size='small'
                type={inputTypeFor(actionType)}
                label={labelForType[actionType]}
                value={item.actionValue ?? ''}
                disabled={disabled}
                inputProps={{ maxLength: 2000 }}
                onChange={event =>
                  updateItem(index, { actionValue: event.target.value })
                }
              />
            </Box>
          )
        })
      )}
    </Box>
  )
}

export default MicrositeContactItemsEditor
