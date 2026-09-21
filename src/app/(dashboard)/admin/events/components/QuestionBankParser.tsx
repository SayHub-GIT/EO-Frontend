'use client'

import { useMemo, useRef, useState, type ClipboardEvent } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { pushAppAlert } from '@/components/feedback/AppAlertProvider'
import {
  importQuizQuestionBank,
  parseQuizQuestionBank,
  type ImportQuizQuestionBankItem,
  type ParsedQuizQuestionDraft,
  type QuizQuestionResponse
} from '@/lib/admin-quiz'

type EditableDraft = ParsedQuizQuestionDraft & {
  selected: boolean
  originalQuestionText: string
}

type Props = {
  eventId: string
  disabled?: boolean
  onImported: (questions: QuizQuestionResponse[]) => Promise<void> | void
}

const MAX_SOURCE_LENGTH = 100_000

const normalizeQuestionBankPaste = (event: ClipboardEvent<HTMLDivElement>) => {
  const plainText = event.clipboardData.getData('text/plain')
  const html = event.clipboardData.getData('text/html')

  let text = plainText

  if (html && !plainText.includes('\n')) {
    const withBreaks = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, '\n')

    const documentFragment = new DOMParser().parseFromString(withBreaks, 'text/html')
    const htmlText = documentFragment.body.textContent ?? ''
    if (htmlText.split('\n').filter(Boolean).length > 1) text = htmlText
  }

  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(
      /((?:kunci\s*(?:jawaban)?|jawaban|answer\s*key|correct\s*answer)\s*[:\-]\s*[A-D])(?=\s*\d{1,4}\s*[.)])/gi,
      '$1\n'
    )
    .replace(
      /(\d{1,4}\s*[.)]\s*)(?=[\p{L}])/gu,
      match => `\n${match}`
    )
    .replace(/^\s+/, '')
    .replace(/\n{3,}/g, '\n\n')
}

const validateDraft = (draft: EditableDraft) => {
  const issues: string[] = []
  const question = draft.questionText.trim()
  const answers = [draft.answerA, draft.answerB, draft.answerC, draft.answerD].map(value => value.trim())

  if (!question) issues.push('Question text is required.')
  else if (question.length > 1500) issues.push('Question text must be 1,500 characters or fewer.')

  answers.forEach((answer, index) => {
    if (!answer) issues.push(`Answer ${String.fromCharCode(65 + index)} is required.`)
    else if (answer.length > 500) issues.push(`Answer ${String.fromCharCode(65 + index)} must be 500 characters or fewer.`)
  })

  if (answers.every(Boolean) && new Set(answers.map(answer => answer.toLowerCase())).size !== 4) {
    issues.push('All four answer choices must be different.')
  }

  if (draft.correctAnswerIndex === null || draft.correctAnswerIndex < 0 || draft.correctAnswerIndex > 3) {
    issues.push('Choose the correct answer.')
  }

  if (
    draft.isDuplicate &&
    question.toLowerCase() === draft.originalQuestionText.trim().toLowerCase()
  ) {
    issues.push('This question is a duplicate or near-duplicate. Edit the question before importing it.')
  }

  return issues
}

const statusFor = (draft: EditableDraft) => {
  const issues = validateDraft(draft)
  if (issues.length === 0) return { label: 'Ready', color: 'success' as const }

  const duplicate = draft.isDuplicate && draft.questionText.trim().toLowerCase() === draft.originalQuestionText.trim().toLowerCase()
  return duplicate
    ? { label: 'Duplicate', color: 'warning' as const }
    : { label: 'Needs review', color: 'error' as const }
}

const QuestionBankParser = ({ eventId, disabled = false, onImported }: Props) => {
  const [sourceText, setSourceText] = useState('')
  const [drafts, setDrafts] = useState<EditableDraft[]>([])
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const parseLockRef = useRef(false)
  const importLockRef = useRef(false)

  const validCount = useMemo(
    () => drafts.filter(draft => validateDraft(draft).length === 0).length,
    [drafts]
  )
  const selectedValidCount = useMemo(
    () => drafts.filter(draft => draft.selected && validateDraft(draft).length === 0).length,
    [drafts]
  )

  const updateDraft = <K extends keyof EditableDraft>(index: number, key: K, value: EditableDraft[K]) => {
    setDrafts(current => current.map((draft, draftIndex) =>
      draftIndex === index ? { ...draft, [key]: value } : draft
    ))
  }

  const parse = async () => {
    if (disabled || parsing || parseLockRef.current) return

    const text = sourceText.trim()
    if (!text) {
      setError('Paste the Question Bank text first.')
      return
    }

    if (text.length > MAX_SOURCE_LENGTH) {
      setError('Question Bank text must be 100,000 characters or fewer.')
      return
    }

    parseLockRef.current = true
    setParsing(true)
    setError(null)
    setSummary(null)

    try {
      const result = await parseQuizQuestionBank(eventId, text)
      const nextDrafts: EditableDraft[] = result.questions.map(question => ({
        ...question,
        selected: question.status === 'Ready',
        originalQuestionText: question.questionText
      }))

      setDrafts(nextDrafts)
      const message = `Detected ${result.detected} question(s): ${result.ready} ready, ${result.needsReview} need review, ${result.duplicates} duplicate.`
      setSummary(message)
      pushAppAlert({ severity: result.ready > 0 ? 'success' : 'warning', message })
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : 'Unable to parse Question Bank text.'
      setError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setParsing(false)
      parseLockRef.current = false
    }
  }

  const importSelected = async () => {
    if (disabled || importing || importLockRef.current) return

    const selected = drafts.filter(draft => draft.selected && validateDraft(draft).length === 0)
    if (selected.length === 0) {
      setError('Select at least one valid question to import.')
      return
    }

    const payload: ImportQuizQuestionBankItem[] = selected.map(draft => ({
      sourceNumber: draft.sourceNumber,
      questionText: draft.questionText.trim(),
      answerA: draft.answerA.trim(),
      answerB: draft.answerB.trim(),
      answerC: draft.answerC.trim(),
      answerD: draft.answerD.trim(),
      correctAnswerIndex: draft.correctAnswerIndex ?? -1
    }))

    importLockRef.current = true
    setImporting(true)
    setError(null)

    try {
      const result = await importQuizQuestionBank(eventId, payload)
      const importedQuestions = result.results.flatMap(item => item.question ? [item.question] : [])

      await onImported(importedQuestions)

      const skippedReasons = result.results
        .filter(item => item.status !== 'Imported' && item.message)
        .slice(0, 3)
        .map(item => `#${item.sourceNumber}: ${item.message}`)
        .join(' • ')

      const message = result.skipped === 0
        ? `Imported ${result.imported} question(s) into the Question Bank.`
        : `Imported ${result.imported} of ${result.requested} question(s). ${result.skipped} were skipped.`

      setSummary(skippedReasons ? `${message} ${skippedReasons}` : message)
      pushAppAlert({
        severity: result.imported > 0 ? (result.skipped > 0 ? 'warning' : 'success') : 'warning',
        message
      })

      if (result.imported > 0) {
        setDrafts([])
        setSourceText('')
      }
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : 'Unable to import Question Bank questions.'
      setError(message)
      pushAppAlert({ severity: 'error', message })
    } finally {
      setImporting(false)
      importLockRef.current = false
    }
  }

  return (
    <Card variant='outlined'>
      <CardContent sx={{ p: { xs: 3, md: 4 }, display: 'grid', gap: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Typography variant='h6' fontWeight={800}>AI Parse Question Bank</Typography>
            <Chip label='Source-locked' color='primary' variant='tonal' size='small' />
            <Chip label='No question generation' color='success' variant='tonal' size='small' />
          </Box>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75, maxWidth: 900, lineHeight: 1.65 }}>
            Paste an existing bank of questions. The parser only structures the source into question, answers A-D, and answer key. It does not invent missing choices or create new facts. Review and edit the preview before importing.
          </Typography>
        </Box>

        {error && <Alert severity='error'>{error}</Alert>}
        {summary && <Alert severity='info'>{summary}</Alert>}

        <TextField
          label='Paste Question Bank'
          value={sourceText}
          disabled={disabled || parsing || importing}
          onChange={event => {
            setSourceText(event.target.value)
            setError(null)
          }}
          onPaste={event => {
            const normalized = normalizeQuestionBankPaste(event)
            const plainText = event.clipboardData.getData('text/plain')
            if (!normalized || normalized === plainText) return

            event.preventDefault()
            const target = event.currentTarget.querySelector('textarea')
            const start = target?.selectionStart ?? sourceText.length
            const end = target?.selectionEnd ?? sourceText.length
            setSourceText(current => `${current.slice(0, start)}${normalized}${current.slice(end)}`)
            setError(null)
          }}
          multiline
          minRows={10}
          maxRows={22}
          inputProps={{ maxLength: MAX_SOURCE_LENGTH }}
          helperText={`${sourceText.length.toLocaleString()} / ${MAX_SOURCE_LENGTH.toLocaleString()} characters • Numbered questions, A-D choices, and “Kunci Jawaban: B” are supported even when pasted text loses line breaks.`}
          placeholder={'1. Pertanyaan ...\nA. Pilihan A\nB. Pilihan B\nC. Pilihan C\nD. Pilihan D\nKunci Jawaban: B'}
        />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          

          <Button
            variant='contained'
            disabled={disabled || parsing || importing || !sourceText.trim()}
            onClick={() => void parse()}
            startIcon={<i className={parsing ? 'tabler-loader-2 animate-spin' : 'tabler-scan'} />}
          >
            {parsing ? 'Parsing...' : 'Parse Question Bank'}
          </Button>

          {drafts.length > 0 && (
            <Button
              variant='outlined'
              disabled={disabled || parsing || importing || validCount === 0}
              onClick={() => setDrafts(current => current.map(draft => ({
                ...draft,
                selected: validateDraft(draft).length === 0
              })))}
            >
              Select all valid ({validCount})
            </Button>
          )}
        </Box>

        {drafts.length > 0 && (
          <>
            <Divider />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' } }}>
              <Box>
                <Typography variant='subtitle1' fontWeight={800}>Review parsed questions</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Edit anything that was parsed incorrectly. Only valid, selected rows will be sent to the Question Bank.
                </Typography>
              </Box>
              <Chip label={`${selectedValidCount} selected & valid`} color='success' variant='tonal' />
            </Box>

            <Box sx={{ display: 'grid', gap: 2 }}>
              {drafts.map((draft, index) => {
                const issues = validateDraft(draft)
                const status = statusFor(draft)

                return (
                  <Card key={`${draft.sourceNumber}-${index}`} variant='outlined'>
                    <CardContent sx={{ p: { xs: 2.5, md: 3 }, display: 'grid', gap: 2.25 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography fontWeight={850}>Source #{draft.sourceNumber}</Typography>
                          <Chip size='small' label={status.label} color={status.color} variant='tonal' />
                        </Box>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={draft.selected}
                              disabled={disabled || parsing || importing || issues.length > 0}
                              onChange={event => updateDraft(index, 'selected', event.target.checked)}
                            />
                          }
                          label='Import'
                        />
                      </Box>

                      {issues.length > 0 && (
                        <Alert severity={status.label === 'Duplicate' ? 'warning' : 'error'}>
                          {issues.join(' ')}
                        </Alert>
                      )}

                      <TextField
                        label='Question'
                        value={draft.questionText}
                        disabled={disabled || importing}
                        onChange={event => {
                          updateDraft(index, 'questionText', event.target.value)
                          updateDraft(index, 'selected', false)
                        }}
                        multiline
                        minRows={2}
                        inputProps={{ maxLength: 1500 }}
                        error={!draft.questionText.trim()}
                      />

                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        {(['answerA', 'answerB', 'answerC', 'answerD'] as const).map((key, answerIndex) => (
                          <TextField
                            key={key}
                            label={`Answer ${String.fromCharCode(65 + answerIndex)}`}
                            value={draft[key]}
                            disabled={disabled || importing}
                            onChange={event => {
                              updateDraft(index, key, event.target.value)
                              updateDraft(index, 'selected', false)
                            }}
                            inputProps={{ maxLength: 500 }}
                          />
                        ))}
                      </Box>

                      <Box sx={{ maxWidth: { xs: '100%', md: 420 } }}>
                        <FormControl fullWidth error={draft.correctAnswerIndex === null}>
                          <InputLabel>Correct answer</InputLabel>
                          <Select
                            label='Correct answer'
                            value={draft.correctAnswerIndex ?? ''}
                            disabled={disabled || importing}
                            onChange={event => {
                              updateDraft(index, 'correctAnswerIndex', Number(event.target.value))
                              updateDraft(index, 'selected', false)
                            }}
                          >
                            <MenuItem value={0}>A</MenuItem>
                            <MenuItem value={1}>B</MenuItem>
                            <MenuItem value={2}>C</MenuItem>
                            <MenuItem value={3}>D</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>

                      {issues.length === 0 && !draft.selected && (
                        <Button
                          variant='text'
                          size='small'
                          sx={{ justifySelf: 'start' }}
                          onClick={() => updateDraft(index, 'selected', true)}
                        >
                          Mark for import
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant='text'
                color='secondary'
                disabled={disabled || importing}
                onClick={() => {
                  setDrafts([])
                  setSummary(null)
                }}
              >
                Clear preview
              </Button>
              <Button
                variant='contained'
                disabled={disabled || importing || selectedValidCount === 0}
                onClick={() => void importSelected()}
                startIcon={<i className={importing ? 'tabler-loader-2 animate-spin' : 'tabler-database-import'} />}
              >
                {importing ? 'Importing...' : `Import ${selectedValidCount} question(s)`}
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default QuestionBankParser
