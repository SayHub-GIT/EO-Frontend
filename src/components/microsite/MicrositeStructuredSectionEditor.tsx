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

const newKey = () =>
  crypto.randomUUID().replaceAll('-', '').slice(0, 20)

const replaceElement = (
  section: MicrositeSection,
  elementId: string,
  patch: Partial<MicrositeElement>
): MicrositeSection => ({
  ...section,
  elements: section.elements.map(element =>
    element.id === elementId
      ? { ...element, ...patch }
      : element
  )
})

const itemSeparator = {
  pt: 2,
  mt: 0.5,
  borderTop: '1px solid var(--mui-palette-divider)'
} as const

const MoveControls = ({
  label,
  index,
  count,
  disabled,
  onMove
}: {
  label: string
  index: number
  count: number
  disabled: boolean
  onMove: (direction: -1 | 1) => void
}) => (
  <Box sx={{ display: 'flex', gap: 0.5 }}>
    <IconButton
      aria-label={`Move ${label} up`}
      disabled={disabled || index === 0}
      onClick={() => onMove(-1)}
      sx={{ minWidth: 44, minHeight: 44 }}
    >
      <i className='tabler-chevron-up' />
    </IconButton>
    <IconButton
      aria-label={`Move ${label} down`}
      disabled={disabled || index === count - 1}
      onClick={() => onMove(1)}
      sx={{ minWidth: 44, minHeight: 44 }}
    >
      <i className='tabler-chevron-down' />
    </IconButton>
  </Box>
)

const SponsorEditor = ({
  section,
  disabled,
  onChange
}: Props) => {
  const fixed = section.elements.filter(
    element => !element.id.startsWith('sponsor-item-')
  )
  const sponsors = section.elements.filter(element =>
    element.id.startsWith('sponsor-item-')
  )

  const commit = (items: MicrositeElement[]) =>
    onChange({
      ...section,
      elements: [...fixed, ...items]
    })

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= sponsors.length) return

    const next = [...sponsors]
    ;[next[index], next[target]] = [next[target], next[index]]
    commit(next)
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box>
        <Typography fontWeight={700}>Sponsors</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
          Add up to 24 sponsor logos. Website links are optional.
        </Typography>
      </Box>

      {sponsors.length === 0 && (
        <Typography variant='body2' color='text.secondary'>
          No sponsors configured yet.
        </Typography>
      )}

      {sponsors.map((sponsor, index) => (
        <Box key={sponsor.id} sx={itemSeparator}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 1,
              alignItems: 'center',
              mb: 1.5
            }}
          >
            <Typography variant='body2' fontWeight={700}>
              Sponsor {index + 1}
            </Typography>
            <MoveControls
              label={sponsor.altText || `sponsor ${index + 1}`}
              index={index}
              count={sponsors.length}
              disabled={Boolean(disabled)}
              onMove={direction => move(index, direction)}
            />
          </Box>

          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <TextField
              size='small'
              label='Sponsor name'
              value={sponsor.altText || ''}
              disabled={disabled}
              inputProps={{ maxLength: 300 }}
              onChange={event =>
                onChange(
                  replaceElement(section, sponsor.id, {
                    altText: event.target.value
                  })
                )
              }
            />
            <TextField
              size='small'
              label='Logo URL'
              value={sponsor.assetUrl || ''}
              disabled={disabled}
              placeholder='https://...'
              inputProps={{ maxLength: 2000 }}
              onChange={event =>
                onChange(
                  replaceElement(section, sponsor.id, {
                    assetUrl: event.target.value || null
                  })
                )
              }
            />
            <TextField
              size='small'
              label='Website URL (optional)'
              value={sponsor.actionValue || ''}
              disabled={disabled}
              placeholder='https://...'
              inputProps={{ maxLength: 2000 }}
              onChange={event => {
                const value = event.target.value

                onChange(
                  replaceElement(section, sponsor.id, {
                    actionType: value.trim() ? 'external' : 'none',
                    actionValue: value || null
                  })
                )
              }}
            />
            <Button
              color='error'
              size='small'
              disabled={disabled}
              onClick={() =>
                commit(sponsors.filter(item => item.id !== sponsor.id))
              }
              sx={{ justifySelf: 'start', minHeight: 44 }}
            >
              Remove sponsor
            </Button>
          </Box>
        </Box>
      ))}

      <Button
        variant='outlined'
        disabled={disabled || sponsors.length >= 24}
        onClick={() => {
          const key = newKey()

          commit([
            ...sponsors,
            {
              id: `sponsor-item-${key}`,
              type: 'image',
              content: null,
              assetUrl: null,
              altText: '',
              actionType: 'none',
              actionValue: null,
              style: {
                widthPercent: 50,
                borderRadius: 8
              }
            }
          ])
        }}
        sx={{ justifySelf: 'start', minHeight: 44 }}
      >
        Add sponsor
      </Button>
    </Box>
  )
}

const FaqEditor = ({
  section,
  disabled,
  onChange
}: Props) => {
  const fixed = section.elements.filter(
    element => element.id === 'faq-title'
  )
  const raw = section.elements.filter(
    element => element.id !== 'faq-title'
  )

  const pairs = Array.from(
    { length: Math.floor(raw.length / 2) },
    (_, index) => ({
      question: raw[index * 2],
      answer: raw[index * 2 + 1]
    })
  )

  const commit = (
    next: Array<{
      question: MicrositeElement
      answer: MicrositeElement
    }>
  ) =>
    onChange({
      ...section,
      elements: [
        ...fixed,
        ...next.flatMap(pair => [pair.question, pair.answer])
      ]
    })

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= pairs.length) return

    const next = [...pairs]
    ;[next[index], next[target]] = [next[target], next[index]]
    commit(next)
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box>
        <Typography fontWeight={700}>FAQ items</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
          Questions and answers are saved as ordered pairs.
        </Typography>
      </Box>

      {pairs.length === 0 && (
        <Typography variant='body2' color='text.secondary'>
          No FAQ items configured yet.
        </Typography>
      )}

      {pairs.map((pair, index) => (
        <Box key={pair.question.id} sx={itemSeparator}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 1,
              alignItems: 'center',
              mb: 1.5
            }}
          >
            <Typography variant='body2' fontWeight={700}>
              FAQ {index + 1}
            </Typography>
            <MoveControls
              label={`FAQ ${index + 1}`}
              index={index}
              count={pairs.length}
              disabled={Boolean(disabled)}
              onMove={direction => move(index, direction)}
            />
          </Box>

          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <TextField
              size='small'
              label='Question'
              value={pair.question.content || ''}
              disabled={disabled}
              inputProps={{ maxLength: 12000 }}
              onChange={event =>
                onChange(
                  replaceElement(section, pair.question.id, {
                    content: event.target.value
                  })
                )
              }
            />
            <TextField
              size='small'
              label='Answer'
              value={pair.answer.content || ''}
              disabled={disabled}
              multiline
              minRows={3}
              inputProps={{ maxLength: 12000 }}
              onChange={event =>
                onChange(
                  replaceElement(section, pair.answer.id, {
                    content: event.target.value
                  })
                )
              }
            />
            <Button
              color='error'
              size='small'
              disabled={disabled}
              onClick={() =>
                commit(pairs.filter((_, pairIndex) => pairIndex !== index))
              }
              sx={{ justifySelf: 'start', minHeight: 44 }}
            >
              Remove FAQ
            </Button>
          </Box>
        </Box>
      ))}

      <Button
        variant='outlined'
        disabled={disabled || pairs.length >= 20}
        onClick={() => {
          const key = newKey()

          commit([
            ...pairs,
            {
              question: {
                id: `faq-question-${key}`,
                type: 'heading',
                content: '',
                assetUrl: null,
                altText: null,
                actionType: 'none',
                actionValue: null,
                style: {
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 8
                }
              },
              answer: {
                id: `faq-answer-${key}`,
                type: 'text',
                content: '',
                assetUrl: null,
                altText: null,
                actionType: 'none',
                actionValue: null,
                style: {
                  fontSize: 16,
                  fontWeight: 400,
                  lineHeight: 1.6,
                  marginBottom: 20
                }
              }
            }
          ])
        }}
        sx={{ justifySelf: 'start', minHeight: 44 }}
      >
        Add FAQ
      </Button>
    </Box>
  )
}

const ContactEditor = ({
  section,
  disabled,
  onChange
}: Props) => {
  const fixed = section.elements.filter(
    element => !element.id.startsWith('contact-item-')
  )
  const contacts = section.elements.filter(element =>
    element.id.startsWith('contact-item-')
  )

  const commit = (items: MicrositeElement[]) =>
    onChange({
      ...section,
      elements: [...fixed, ...items]
    })

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box>
        <Typography fontWeight={700}>Contact links</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
          Supported types are email, phone, and website.
        </Typography>
      </Box>

      {contacts.length === 0 && (
        <Typography variant='body2' color='text.secondary'>
          No contact links configured yet.
        </Typography>
      )}

      {contacts.map((contact, index) => (
        <Box key={contact.id} sx={itemSeparator}>
          <Typography variant='body2' fontWeight={700} sx={{ mb: 1.5 }}>
            Contact {index + 1}
          </Typography>

          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <TextField
              select
              size='small'
              label='Type'
              value={contact.actionType || 'email'}
              disabled={disabled}
              onChange={event =>
                onChange(
                  replaceElement(section, contact.id, {
                    actionType: event.target.value
                  })
                )
              }
            >
              <MenuItem value='email'>Email</MenuItem>
              <MenuItem value='phone'>Phone</MenuItem>
              <MenuItem value='external'>Website</MenuItem>
            </TextField>

            <TextField
              size='small'
              label='Label'
              value={contact.content || ''}
              disabled={disabled}
              inputProps={{ maxLength: 80 }}
              onChange={event =>
                onChange(
                  replaceElement(section, contact.id, {
                    content: event.target.value
                  })
                )
              }
            />

            <TextField
              size='small'
              label={
                contact.actionType === 'phone'
                  ? 'Phone number'
                  : contact.actionType === 'external'
                    ? 'Website URL'
                    : 'Email address'
              }
              value={contact.actionValue || ''}
              disabled={disabled}
              inputProps={{ maxLength: 2000 }}
              onChange={event =>
                onChange(
                  replaceElement(section, contact.id, {
                    actionValue: event.target.value
                  })
                )
              }
            />

            <Button
              color='error'
              size='small'
              disabled={disabled}
              onClick={() =>
                commit(contacts.filter(item => item.id !== contact.id))
              }
              sx={{ justifySelf: 'start', minHeight: 44 }}
            >
              Remove contact
            </Button>
          </Box>
        </Box>
      ))}

      <Button
        variant='outlined'
        disabled={disabled || contacts.length >= 12}
        onClick={() => {
          const key = newKey()

          commit([
            ...contacts,
            {
              id: `contact-item-${key}`,
              type: 'button',
              content: 'Email',
              assetUrl: null,
              altText: null,
              actionType: 'email',
              actionValue: '',
              style: {
                fontSize: 15,
                fontWeight: 600,
                paddingY: 10,
                paddingX: 16,
                borderRadius: 8
              }
            }
          ])
        }}
        sx={{ justifySelf: 'start', minHeight: 44 }}
      >
        Add contact
      </Button>
    </Box>
  )
}

const MicrositeStructuredSectionEditor = (props: Props) => {
  if (props.section.type === 'sponsor') {
    return <SponsorEditor {...props} />
  }

  if (props.section.type === 'faq') {
    return <FaqEditor {...props} />
  }

  if (props.section.type === 'contact') {
    return <ContactEditor {...props} />
  }

  return null
}

export default MicrositeStructuredSectionEditor
