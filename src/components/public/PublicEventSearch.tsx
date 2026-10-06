'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { getPublicEvents, type PublicEvent } from '@/lib/api'

type Props = {
  compact?: boolean
  onNavigate?: () => void
}

const searchableText = (event: PublicEvent) =>
  [
    event.name,
    event.type,
    event.location,
    event.venue,
    event.city,
    event.address
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

const PublicEventSearch = ({ compact = false, onNavigate }: Props) => {
  const router = useRouter()
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const ensureEvents = useCallback(async () => {
    if (loaded || loading) return

    try {
      setLoading(true)
      setLoadError('')
      setEvents(await getPublicEvents())
      setLoaded(true)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load events.')
    } finally {
      setLoading(false)
    }
  }, [loaded, loading])

  return (
    <Autocomplete
      options={events}
      loading={loading}
      noOptionsText={
        loadError
          ? 'Event search is temporarily unavailable.'
          : loaded
            ? 'No matching events.'
            : 'Start typing to search events.'
      }
      getOptionLabel={option => option.name}
      filterOptions={(options, state) => {
        const query = state.inputValue.trim().toLowerCase()

        if (!query) return options.slice(0, 6)

        return options
          .filter(event => searchableText(event).includes(query))
          .slice(0, 8)
      }}
      onOpen={() => void ensureEvents()}
      onInputChange={(_, value, reason) => {
        if (reason === 'input' && value.trim()) void ensureEvents()
      }}
      onChange={(_, event) => {
        if (!event) return
        onNavigate?.()
        router.push(`/events/${encodeURIComponent(event.slug)}`)
      }}
      slotProps={{
        paper: {
          elevation: 0,
          sx: {
            mt: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden'
          }
        }
      }}
      renderOption={(props, event) => (
        <Box
          component='li'
          {...props}
          key={event.id}
          sx={{
            display: 'grid !important',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            alignItems: 'center !important',
            gap: 2,
            py: '10px !important'
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={700} noWrap>
              {event.name}
            </Typography>
            <Typography variant='caption' color='text.secondary' noWrap>
              {[event.type, event.location || event.city]
                .filter(Boolean)
                .join(' · ') || 'Event details'}
            </Typography>
          </Box>
          <i className='tabler-arrow-up-right text-base' aria-hidden='true' />
        </Box>
      )}
      renderInput={params => (
        <TextField
          {...params}
          placeholder='Search events, categories, or locations...'
          aria-label='Search public events'
          size='small'
          error={Boolean(loadError)}
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <>
                  <i className='tabler-search text-lg' aria-hidden='true' />
                  {params.InputProps.startAdornment}
                </>
              ),
              endAdornment: (
                <>
                  {loading ? <CircularProgress color='inherit' size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              )
            }
          }}
          sx={{
            width: compact ? '100%' : { md: 300, xl: 380 },
            '& .MuiOutlinedInput-root': {
              minHeight: 42,
              borderRadius: 999,
              bgcolor: 'background.paper',
              px: 1.25,
              '& fieldset': {
                borderColor: 'divider'
              },
              '&:hover fieldset': {
                borderColor: 'text.disabled'
              },
              '&.Mui-focused fieldset': {
                borderWidth: 1,
                borderColor: 'primary.main'
              }
            },
            '& .MuiInputBase-input': {
              fontSize: '0.875rem'
            }
          }}
        />
      )}
    />
  )
}

export default PublicEventSearch
