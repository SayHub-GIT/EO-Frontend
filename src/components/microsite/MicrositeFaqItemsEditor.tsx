'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
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
  onChange: (section: MicrositeSection) => void
}

type FaqPair = {
  key: string
  question: MicrositeElement
  answer: MicrositeElement
}

const questionPrefix = 'faq-question-'
const answerPrefix = 'faq-answer-'

const itemKey = () =>
  crypto.randomUUID().replaceAll('-', '').slice(0, 12)

const readPairs = (section: MicrositeSection): FaqPair[] => {
  const items = section.elements.filter(element => element.id !== 'faq-title')
  const pairs: FaqPair[] = []

  for (let index = 0; index < items.length; index += 2) {
    const question = items[index]
    const answer = items[index + 1]

    if (!question || !answer) continue
    if (!question.id.startsWith(questionPrefix)) continue
    if (!answer.id.startsWith(answerPrefix)) continue

    const key = question.id.slice(questionPrefix.length)

    if (answer.id.slice(answerPrefix.length) !== key) continue

    pairs.push({ key, question, answer })
  }

  return pairs
}

const rebuildSection = (
  section: MicrositeSection,
  pairs: FaqPair[]
): MicrositeSection => {
  const title = section.elements.find(element => element.id === 'faq-title')
  const elements = [
    ...(title ? [title] : []),
    ...pairs.flatMap(pair => [pair.question, pair.answer])
  ]

  return { ...section, elements }
}

const createPair = (): FaqPair => {
  const key = itemKey()

  return {
    key,
    question: {
      id: `${questionPrefix}${key}`,
      type: 'heading',
      content: 'Pertanyaan baru',
      assetUrl: null,
      altText: null,
      actionType: 'none',
      actionValue: null,
      style: {
        fontFamily: null,
        fontSize: 20,
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: null,
        textAlign: null,
        textColor: null,
        backgroundColor: null,
        borderRadius: null,
        widthPercent: null,
        paddingY: null,
        paddingX: null,
        marginTop: 12,
        marginBottom: 6
      }
    },
    answer: {
      id: `${answerPrefix}${key}`,
      type: 'text',
      content: 'Tulis jawabannya di sini.',
      assetUrl: null,
      altText: null,
      actionType: 'none',
      actionValue: null,
      style: {
        fontFamily: null,
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.6,
        letterSpacing: null,
        textAlign: null,
        textColor: null,
        backgroundColor: null,
        borderRadius: null,
        widthPercent: null,
        paddingY: null,
        paddingX: null,
        marginTop: null,
        marginBottom: 18
      }
    }
  }
}

const MicrositeFaqItemsEditor = ({
  section,
  disabled = false,
  onChange
}: Props) => {
  const pairs = readPairs(section)

  const updatePair = (
    index: number,
    field: 'question' | 'answer',
    value: string
  ) => {
    const next = pairs.map((pair, pairIndex) => {
      if (pairIndex !== index) return pair

      return field === 'question'
        ? {
            ...pair,
            question: { ...pair.question, content: value }
          }
        : {
            ...pair,
            answer: { ...pair.answer, content: value }
          }
    })

    onChange(rebuildSection(section, next))
  }

  const movePair = (index: number, direction: -1 | 1) => {
    const target = index + direction

    if (target < 0 || target >= pairs.length) return

    const next = pairs.slice()
    const current = next[index]
    next[index] = next[target]
    next[target] = current

    onChange(rebuildSection(section, next))
  }

  const removePair = (index: number) => {
    onChange(
      rebuildSection(
        section,
        pairs.filter((_, pairIndex) => pairIndex !== index)
      )
    )
  }

  const addPair = () => {
    if (pairs.length >= 20) return

    onChange(rebuildSection(section, [...pairs, createPair()]))
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
            Daftar Pertanyaan
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {pairs.length} dari 20
          </Typography>
        </Box>

        <Button
          size='small'
          variant='outlined'
          disabled={disabled || pairs.length >= 20}
          onClick={addPair}
          startIcon={<i className='tabler-plus' />}
          sx={{ minHeight: 40 }}
        >
          Tambah pertanyaan
        </Button>
      </Box>

      {pairs.length === 0 ? (
        <Typography variant='body2' color='text.secondary'>
          Belum ada pertanyaan. Tambahkan pertanyaan untuk mulai.
        </Typography>
      ) : (
        pairs.map((pair, index) => (
          <Box
            key={pair.key}
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
                Pertanyaan {index + 1}
              </Typography>

              <Box sx={{ display: 'flex', gap: 0.25 }}>
                <IconButton
                  size='small'
                  disabled={disabled || index === 0}
                  aria-label={`Pindahkan pertanyaan ${index + 1} up`}
                  onClick={() => movePair(index, -1)}
                  sx={{ minWidth: 40, minHeight: 40 }}
                >
                  <i className='tabler-chevron-up' />
                </IconButton>
                <IconButton
                  size='small'
                  disabled={disabled || index === pairs.length - 1}
                  aria-label={`Pindahkan pertanyaan ${index + 1} down`}
                  onClick={() => movePair(index, 1)}
                  sx={{ minWidth: 40, minHeight: 40 }}
                >
                  <i className='tabler-chevron-down' />
                </IconButton>
                <IconButton
                  size='small'
                  disabled={disabled}
                  aria-label={`Hapus pertanyaan ${index + 1}`}
                  onClick={() => removePair(index)}
                  sx={{ minWidth: 40, minHeight: 40 }}
                >
                  <i className='tabler-trash' />
                </IconButton>
              </Box>
            </Box>

            <TextField
              fullWidth
              size='small'
              label='Pertanyaan'
              value={pair.question.content ?? ''}
              disabled={disabled}
              inputProps={{ maxLength: 12000 }}
              onChange={event =>
                updatePair(index, 'question', event.target.value)
              }
            />

            <TextField
              fullWidth
              size='small'
              label='Jawaban'
              value={pair.answer.content ?? ''}
              disabled={disabled}
              multiline
              minRows={3}
              inputProps={{ maxLength: 12000 }}
              onChange={event =>
                updatePair(index, 'answer', event.target.value)
              }
            />
          </Box>
        ))
      )}
    </Box>
  )
}

export default MicrositeFaqItemsEditor
