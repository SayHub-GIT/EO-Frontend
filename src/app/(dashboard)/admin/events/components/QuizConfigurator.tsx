'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import ConfirmActionDialog from '@/components/feedback/ConfirmActionDialog'

import type {
  QuizAnswerMarkerMode,
  QuizGenerationMode,
  QuizQuestionResponse,
  QuizResponse
} from '@/lib/admin-quiz'

export type QuizQuestionDraft = {
  key: string
  id?: string
  isAllocated?: boolean
  questionText: string
  answerA: string
  answerB: string
  answerC: string
  answerD: string
  correctAnswerIndex: number
  shortExplanation: string
  existingImageUrl?: string | null
  imageFile?: File
}

export type QuizMarkerFiles = {
  a?: File
  b?: File
  c?: File
  d?: File
}

export type QuizFormValue = {
  enabled: boolean
  existingQuizId?: string
  name: string
  description: string
  context: string
  generationMode: QuizGenerationMode
  answerMarkerMode: QuizAnswerMarkerMode
  defaultQuestionDurationSeconds: number
  markerAUrl?: string | null
  markerBUrl?: string | null
  markerCUrl?: string | null
  markerDUrl?: string | null
  markerFiles: QuizMarkerFiles
  questions: QuizQuestionDraft[]
}

const keyForQuestion = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
const MAX_QUIZ_IMAGE_BYTES = 5 * 1024 * 1024
const QUIZ_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])

const imageValidationMessage = (file?: File) => {
  if (!file) return undefined
  if (!QUIZ_IMAGE_TYPES.has(file.type)) return 'Use PNG, JPG/JPEG, WEBP, or SVG.'
  if (file.size > MAX_QUIZ_IMAGE_BYTES) return 'Image must not exceed 5 MB.'
  return undefined
}

export const createQuizFormValue = (
  quiz?: QuizResponse | null,
  questions: QuizQuestionResponse[] = []
): QuizFormValue => ({
  enabled: Boolean(quiz && quiz.status !== 'Archived'),
  existingQuizId: quiz?.id,
  name: quiz?.name ?? '',
  description: quiz?.description ?? '',
  context: quiz?.context ?? '',
  generationMode: quiz?.generationMode ?? 'QuestionBank',
  answerMarkerMode: quiz?.answerMarkerMode ?? 'DefaultShapes',
  defaultQuestionDurationSeconds: quiz?.defaultQuestionDurationSeconds ?? 10,
  markerAUrl: quiz?.markerAUrl,
  markerBUrl: quiz?.markerBUrl,
  markerCUrl: quiz?.markerCUrl,
  markerDUrl: quiz?.markerDUrl,
  markerFiles: {},
  questions: questions
    .filter(question => question.isActive)
    .map(question => ({
      key: question.id,
      id: question.id,
      isAllocated: question.isAllocated,
      questionText: question.questionText,
      answerA: question.answerA,
      answerB: question.answerB,
      answerC: question.answerC,
      answerD: question.answerD,
      correctAnswerIndex: question.correctAnswerIndex,
      shortExplanation: question.shortExplanation ?? '',
      existingImageUrl: question.questionImageUrl
    }))
})

const emptyQuestion = (): QuizQuestionDraft => ({
  key: keyForQuestion(),
  questionText: '',
  answerA: '',
  answerB: '',
  answerC: '',
  answerD: '',
  correctAnswerIndex: 0,
  shortExplanation: '',
})

const MARKER_META = [
  { key: 'a' as const, label: 'A', shape: '▲', urlKey: 'markerAUrl' as const },
  { key: 'b' as const, label: 'B', shape: '◆', urlKey: 'markerBUrl' as const },
  { key: 'c' as const, label: 'C', shape: '●', urlKey: 'markerCUrl' as const },
  { key: 'd' as const, label: 'D', shape: '■', urlKey: 'markerDUrl' as const }
]

type RemoveTarget =
  | { kind: 'quiz' }
  | { kind: 'question'; key: string; label: string }
  | null

const QuizConfigurator = ({
  value,
  disabled = false,
  onChange
}: {
  value: QuizFormValue
  disabled?: boolean
  onChange: (value: QuizFormValue) => void
}) => {
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget>(null)

  const update = <K extends keyof QuizFormValue>(key: K, next: QuizFormValue[K]) => {
    onChange({ ...value, [key]: next })
  }

  const updateQuestion = <K extends keyof QuizQuestionDraft>(index: number, key: K, next: QuizQuestionDraft[K]) => {
    const questions = value.questions.map((question, questionIndex) =>
      questionIndex === index ? { ...question, [key]: next } : question
    )
    update('questions', questions)
  }

  const setMarkerFile = (key: keyof QuizMarkerFiles, file?: File) => {
    update('markerFiles', { ...value.markerFiles, [key]: file })
  }

  if (!value.enabled) {
    return (
      <Card id='quiz-configuration' variant='outlined' sx={{ borderStyle: 'dashed' }}>
        <CardContent sx={{ p: { xs: 3, md: 4 }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 42, height: 42, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'primary.lighter', color: 'primary.main' }}>
                <i className='tabler-device-gamepad-2' style={{ fontSize: 23 }} />
              </Box>
              <Typography variant='h6' fontWeight={750}>Realtime Quiz</Typography>
            </Box>
            <Typography color='text.secondary' sx={{ mt: 1.5, maxWidth: 720, lineHeight: 1.65 }}>
              Add a realtime quiz with Pertamina Event branding, a reviewed Question Bank, live sessions, leaderboard, and podium.
            </Typography>
          </Box>
          <Button
            variant='contained'
            disabled={disabled}
            startIcon={<i className='tabler-plus' />}
            onClick={() => onChange({ ...value, enabled: true })}
          >
            Add Quiz
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card id='quiz-configuration'>
      <CardContent sx={{ p: { xs: 3, md: 5 }, display: 'grid', gap: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, justifyContent: 'space-between' }}>
          <Box>
            <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant='h6' fontWeight={750}>Quiz configuration</Typography>
              <Chip label='Game enabled' color='success' variant='tonal' size='small' />
              {value.existingQuizId && <Chip label='Saved quiz' color='primary' variant='tonal' size='small' />}
            </Box>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75, maxWidth: 760, lineHeight: 1.65 }}>
              Configure the Question Bank and answer markers here. AI Parse can structure pasted question banks after the Quiz is saved; live rooms and gameplay are managed separately.
            </Typography>
          </Box>
          {!value.existingQuizId && (
            <Button color='secondary' variant='text' disabled={disabled} onClick={() => setRemoveTarget({ kind: 'quiz' })}>
              Remove Quiz
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 220px' }, gap: 3 }}>
          <TextField
            label='Quiz name'
            value={value.name}
            onChange={event => update('name', event.target.value)}
            disabled={disabled}
            required
            error={!value.name.trim()}
            helperText={!value.name.trim() ? 'Quiz name is required.' : undefined}
            inputProps={{ maxLength: 160 }}
            placeholder='e.g. FFWS Knowledge Challenge'
          />
          <TextField
            label='Default duration / question'
            type='number'
            value={value.defaultQuestionDurationSeconds}
            onChange={event => update('defaultQuestionDurationSeconds', Number(event.target.value))}
            disabled={disabled}
            error={!Number.isInteger(value.defaultQuestionDurationSeconds) || value.defaultQuestionDurationSeconds < 3 || value.defaultQuestionDurationSeconds > 120}
            inputProps={{ min: 3, max: 120, step: 1, inputMode: 'numeric' }}
            helperText={
              !Number.isInteger(value.defaultQuestionDurationSeconds) || value.defaultQuestionDurationSeconds < 3 || value.defaultQuestionDurationSeconds > 120
                ? 'Duration must be a whole number between 3 and 120 seconds.'
                : 'Seconds (3–120)'
            }
          />
        </Box>

        <TextField
          label='Quiz description'
          value={value.description}
          onChange={event => update('description', event.target.value)}
          disabled={disabled}
          multiline
          minRows={2}
          inputProps={{ maxLength: 3000 }}
          helperText='Optional internal/public description for this game.'
        />

        <TextField
          label='Quiz context / notes'
          value={value.context}
          onChange={event => update('context', event.target.value)}
          disabled={disabled}
          multiline
          minRows={5}
          required
          error={!value.context.trim()}
          inputProps={{ maxLength: 12000 }}
          helperText={!value.context.trim() ? 'Quiz context is required.' : 'Keep reference notes for this Quiz. AI Parse uses the pasted Question Bank itself and does not generate new questions from this context.'}
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <FormControl fullWidth>
            <InputLabel id='quiz-source-label'>Question source</InputLabel>
            <Select
              labelId='quiz-source-label'
              label='Question source'
              value={value.generationMode}
              disabled={disabled}
              onChange={event => update('generationMode', event.target.value as QuizGenerationMode)}
            >
              <MenuItem value='AiGenerated' disabled>AI generation (paused)</MenuItem>
              <MenuItem value='QuestionBank'>Question Bank + AI Parse</MenuItem>
              <MenuItem value='Hybrid' disabled>Hybrid generation (paused)</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id='quiz-marker-label'>Answer marker</InputLabel>
            <Select
              labelId='quiz-marker-label'
              label='Answer marker'
              value={value.answerMarkerMode}
              disabled={disabled}
              onChange={event => update('answerMarkerMode', event.target.value as QuizAnswerMarkerMode)}
            >
              <MenuItem value='DefaultShapes'>Pertamina Event shapes (default)</MenuItem>
              <MenuItem value='CustomImages'>Custom images / icons</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Divider />

        <Box>
          <Typography variant='subtitle1' fontWeight={700}>Answer markers</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            Participant phones only show the four answer markers during a live question. The host screen shows the full question and answer text.
          </Typography>

          {value.answerMarkerMode === 'DefaultShapes' ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1.5, mt: 2.5 }}>
              {MARKER_META.map(marker => (
                <Box key={marker.key} sx={{ minHeight: 82, borderRadius: 2, bgcolor: 'action.hover', display: 'grid', placeItems: 'center', color: 'primary.main' }}>
                  <Typography variant='h4' fontWeight={800}>{marker.shape}</Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mt: 2.5 }}>
              {MARKER_META.map(marker => {
                const currentUrl = value[marker.urlKey]
                const file = value.markerFiles[marker.key]
                return (
                  <Card variant='outlined' key={marker.key}>
                    <CardContent sx={{ display: 'grid', gap: 1.5 }}>
                      <Typography fontWeight={700}>Answer {marker.label}</Typography>
                      {currentUrl && !file && <Box component='img' src={currentUrl} alt={`Marker ${marker.label}`} sx={{ width: '100%', height: 80, objectFit: 'contain' }} />}
                      {file && <Chip label={file.name} size='small' color='success' variant='tonal' />}
                      {!currentUrl && !file && <Typography variant='caption' color='error'>Marker image is required.</Typography>}
                      {imageValidationMessage(file) && <Typography variant='caption' color='error'>{imageValidationMessage(file)}</Typography>}
                      <Button component='label' variant='outlined' size='small' disabled={disabled}>
                        {currentUrl || file ? 'Replace' : 'Upload'}
                        <input hidden type='file' accept='.png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml' onChange={event => setMarkerFile(marker.key, event.target.files?.[0])} />
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </Box>
          )}
        </Box>

        <Divider />

        <Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 2, alignItems: { sm: 'center' } }}>
            <Box>
              <Typography variant='subtitle1' fontWeight={700}>Question Bank <Typography component='span' color='text.secondary'>(optional)</Typography></Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, maxWidth: 760 }}>
                Question Bank items stay editable even after they have been used. Existing Quiz sessions keep their own snapshot, so edits here only affect future sessions.
              </Typography>
            </Box>
            <Button
              variant='outlined'
              disabled={disabled}
              startIcon={<i className='tabler-plus' />}
              onClick={() => update('questions', [...value.questions, emptyQuestion()])}
            >
              Add Question
            </Button>
          </Box>

          <Box sx={{ display: 'grid', gap: 2.5, mt: 3 }}>
            {value.questions.length === 0 && (
              <Box sx={{ py: 4, px: 3, border: '1px dashed', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
                <Typography fontWeight={650}>No manual questions yet</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                  This is valid. Use AI Parse to import an existing Question Bank, or add questions manually before creating Quiz sessions.
                </Typography>
              </Box>
            )}

            {value.questions.map((question, index) => (
              <Card variant='outlined' key={question.key}>
                <CardContent sx={{ display: 'grid', gap: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography fontWeight={750}>Question {index + 1}</Typography>
                      {question.isAllocated && <Chip size='small' label='Used in session • editable' color='info' variant='tonal' />}
                    </Box>
                    <Button
                      color='error'
                      variant='text'
                      size='small'
                      disabled={disabled}
                      onClick={() => setRemoveTarget({ kind: 'question', key: question.key, label: question.questionText || `Question ${index + 1}` })}
                    >
                      Remove
                    </Button>
                  </Box>

                  <TextField
                    label='Question'
                    value={question.questionText}
                    disabled={disabled}
                    onChange={event => updateQuestion(index, 'questionText', event.target.value)}
                    error={!question.questionText.trim()}
                    helperText={!question.questionText.trim() ? 'Question text is required.' : undefined}
                    multiline
                    minRows={2}
                    inputProps={{ maxLength: 1500 }}
                  />

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    {(['answerA', 'answerB', 'answerC', 'answerD'] as const).map((answerKey, answerIndex) => {
                      const answer = question[answerKey].trim()
                      const answers = [question.answerA, question.answerB, question.answerC, question.answerD].map(item => item.trim().toLowerCase())
                      const duplicated = Boolean(answer) && answers.filter(item => item === answer.toLowerCase()).length > 1

                      return (
                        <TextField
                          key={answerKey}
                          label={`Answer ${String.fromCharCode(65 + answerIndex)}`}
                          value={question[answerKey]}
                          disabled={disabled}
                          onChange={event => updateQuestion(index, answerKey, event.target.value)}
                          error={!answer || duplicated}
                          helperText={!answer ? 'Answer is required.' : duplicated ? 'Each answer choice must be different.' : undefined}
                          inputProps={{ maxLength: 500 }}
                        />
                      )
                    })}
                  </Box>

                  <Box sx={{ maxWidth: { xs: '100%', md: 420 } }}>
                    <FormControl fullWidth>
                      <InputLabel>Correct answer</InputLabel>
                      <Select
                        label='Correct answer'
                        value={question.correctAnswerIndex}
                        disabled={disabled}
                        onChange={event => updateQuestion(index, 'correctAnswerIndex', Number(event.target.value))}
                      >
                        <MenuItem value={0}>A</MenuItem>
                        <MenuItem value={1}>B</MenuItem>
                        <MenuItem value={2}>C</MenuItem>
                        <MenuItem value={3}>D</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <TextField
                    label='Short explanation'
                    value={question.shortExplanation}
                    disabled={disabled}
                    onChange={event => updateQuestion(index, 'shortExplanation', event.target.value)}
                    inputProps={{ maxLength: 1500 }}
                    helperText='Shown after the question ends. Keep it concise.'
                  />

                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { sm: 'center' } }}>
                    {(question.existingImageUrl || question.imageFile) && (
                      <Box
                        component='img'
                        src={question.imageFile ? URL.createObjectURL(question.imageFile) : question.existingImageUrl ?? undefined}
                        alt={`Question ${index + 1}`}
                        sx={{ width: 120, height: 76, objectFit: 'cover', borderRadius: 1.5, bgcolor: 'action.hover' }}
                      />
                    )}
                    {imageValidationMessage(question.imageFile) && (
                      <Typography variant='caption' color='error'>{imageValidationMessage(question.imageFile)}</Typography>
                    )}
                    <Button component='label' variant='outlined' size='small' disabled={disabled} startIcon={<i className='tabler-photo' />}>
                      {question.existingImageUrl || question.imageFile ? 'Replace image' : 'Add optional image'}
                      <input hidden type='file' accept='.png,.jpg,.jpeg,.webp,.svg,image/*' onChange={event => updateQuestion(index, 'imageFile', event.target.files?.[0])} />
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      </CardContent>

      <ConfirmActionDialog
        open={Boolean(removeTarget)}
        title={removeTarget?.kind === 'quiz' ? 'Remove Quiz configuration?' : 'Remove question?'}
        description={
          removeTarget?.kind === 'quiz'
            ? 'The unsaved Quiz configuration and its draft questions will be removed from this event form.'
            : 'This question will be removed from the active Question Bank. Any existing Quiz session keeps the snapshot it already received.'
        }
        confirmLabel='Confirm Remove'
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (!removeTarget) return

          if (removeTarget.kind === 'quiz') {
            onChange(createQuizFormValue())
          } else {
            update('questions', value.questions.filter(item => item.key !== removeTarget.key))
          }

          setRemoveTarget(null)
        }}
        details={
          removeTarget?.kind === 'quiz'
            ? [
                { label: 'Quiz', value: value.name || 'Untitled Quiz' },
                { label: 'Draft questions', value: String(value.questions.length) }
              ]
            : removeTarget?.kind === 'question'
              ? [{ label: 'Question', value: removeTarget.label }]
              : []
        }
      />
    </Card>
  )
}

export default QuizConfigurator
