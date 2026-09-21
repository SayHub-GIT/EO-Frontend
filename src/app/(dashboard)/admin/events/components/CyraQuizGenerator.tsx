'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { generateQuizQuestions } from '@/lib/quiz-ai'
import type { QuizDifficulty, QuizGenerationMode, QuizQuestionResponse } from '@/lib/admin-quiz'

const CyraQuizGenerator = ({
  eventId,
  generationMode,
  disabled = false,
  onGenerated
}: {
  eventId: string
  generationMode: QuizGenerationMode
  disabled?: boolean
  onGenerated: (questions: QuizQuestionResponse[]) => Promise<void> | void
}) => {
  const [count, setCount] = useState(10)
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('Medium')
  const [instructions, setInstructions] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const generate = async () => {
    if (disabled || generating) return

    setError(null)
    setSuccess(null)

    if (!Number.isInteger(count) || count < 1 || count > 50) {
      setError('Generate between 1 and 50 questions at a time.')
      return
    }

    try {
      setGenerating(true)
      const result = await generateQuizQuestions(eventId, {
        count,
        difficulty,
        additionalInstructions: instructions.trim() || null
      })

      await onGenerated(result.questions)
      setSuccess(
        result.created === result.requested
          ? `CYRA added ${result.created} unique questions to the Question Bank.`
          : `CYRA added ${result.created} of ${result.requested} requested questions after duplicate filtering.`
      )
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'CYRA could not generate questions.')
    } finally {
      setGenerating(false)
    }
  }

  if (generationMode === 'QuestionBank') {
    return (
      <Alert severity='info' icon={<i className='tabler-sparkles' />}>
        This Quiz uses Question Bank mode. CYRA will not create new questions; it will be used later when allocating unique questions between sessions.
      </Alert>
    )
  }

  return (
    <Card variant='outlined'>
      <CardContent sx={{ p: { xs: 3, md: 4 }, display: 'grid', gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
              <Typography variant='h6' fontWeight={750}>Generate with CYRA</Typography>
              <Chip label='AI • Server-side' color='primary' variant='tonal' size='small' />
            </Box>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75, maxWidth: 760, lineHeight: 1.65 }}>
              CYRA uses the saved Quiz context, checks the existing Question Bank, rejects repeated or highly similar questions, and stores only unique results.
            </Typography>
          </Box>
        </Box>

        {error && <Alert severity='error'>{error}</Alert>}
        {success && <Alert severity='success'>{success}</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '180px 220px minmax(0, 1fr)' }, gap: 2.5, alignItems: 'start' }}>
          <TextField
            label='Questions'
            type='number'
            value={count}
            disabled={disabled || generating}
            onChange={event => setCount(Number(event.target.value))}
            inputProps={{ min: 1, max: 50, step: 1 }}
          />

          <FormControl fullWidth>
            <InputLabel>Difficulty</InputLabel>
            <Select
              label='Difficulty'
              value={difficulty}
              disabled={disabled || generating}
              onChange={event => setDifficulty(event.target.value as QuizDifficulty)}
            >
              <MenuItem value='Easy'>Easy</MenuItem>
              <MenuItem value='Medium'>Medium</MenuItem>
              <MenuItem value='Hard'>Hard</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label='Additional instruction (optional)'
            value={instructions}
            disabled={disabled || generating}
            onChange={event => setInstructions(event.target.value)}
            inputProps={{ maxLength: 2000 }}
            placeholder='e.g. focus 50% on speaker material and 50% on FFWS history'
          />
        </Box>

        <Box>
          <Button
            variant='contained'
            disabled={disabled || generating}
            startIcon={<i className={generating ? 'tabler-loader-2' : 'tabler-sparkles'} />}
            onClick={() => void generate()}
          >
            {generating ? 'CYRA is generating...' : 'Generate Questions'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}

export default CyraQuizGenerator
