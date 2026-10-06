'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import ConfirmActionDialog from '@/components/feedback/ConfirmActionDialog'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'
import {
  changeMicrositeSubdomain,
  changeMicrositeTemplate,
  checkMicrositeSubdomainAvailability,
  deleteAdminMicrosite,
  getMicrositeHistory,
  publishAdminMicrosite,
  restoreMicrositeVersion,
  type MicrositeAdminDetail,
  type MicrositeTemplateCatalog,
  type MicrositeVersionHistory
} from '@/lib/admin-microsites'

type Props = {
  eventId: string
  eventName: string
  detail: MicrositeAdminDetail
  catalog: MicrositeTemplateCatalog
  dirty: boolean
  onChanged: (detail: MicrositeAdminDetail, message: string) => void | Promise<void>
  onDeleted: () => void
  onError: (message: string) => void
}

type BusyAction =
  | 'publish'
  | 'subdomain'
  | 'template'
  | 'history'
  | 'restore'
  | 'delete'
  | null

const MicrositeLifecycleActions = ({
  eventId,
  eventName,
  detail,
  catalog,
  dirty,
  onChanged,
  onDeleted,
  onError
}: Props) => {
  const publishAccess = usePermissionAccess('microsite.publish')
  const historyAccess = usePermissionAccess('microsite.history.read')
  const restoreAccess = usePermissionAccess('microsite.restore')
  const templateAccess = usePermissionAccess('microsite.template.manage')
  const domainAccess = usePermissionAccess('microsite.domain.manage')
  const deleteAccess = usePermissionAccess('microsite.delete')
  const editAccess = usePermissionAccess('microsite.edit')

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState<BusyAction>(null)
  const [subdomain, setSubdomain] = useState(detail.subdomain)
  const [subdomainState, setSubdomainState] = useState('')
  const [templateKey, setTemplateKey] = useState(detail.templateKey)
  const [templateMode, setTemplateMode] = useState<'keep-content' | 'reset'>('keep-content')
  const [history, setHistory] = useState<MicrositeVersionHistory | null>(null)

  useEffect(() => {
    setSubdomain(detail.subdomain)
    setTemplateKey(detail.templateKey)
    setSubdomainState('')
  }, [detail.subdomain, detail.templateKey])

  const publish = async () => {
    if (dirty || busy) return

    try {
      setBusy('publish')
      const next = await publishAdminMicrosite(eventId, {
        expectedDraftVersionNumber: detail.draftVersionNumber
      })

      await onChanged(next, `Published MicroSite v${next.publishedVersionNumber ?? next.draftVersionNumber}.`)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to publish MicroSite.')
    } finally {
      setBusy(null)
    }
  }

  const saveSubdomain = async () => {
    const value = subdomain.trim().toLowerCase()

    if (!value || value === detail.subdomain || busy) return

    try {
      setBusy('subdomain')
      setSubdomainState('Checking availability...')

      const availability = await checkMicrositeSubdomainAvailability(eventId, value)

      if (!availability.available) {
        setSubdomainState(availability.reason || 'This subdomain is unavailable.')
        return
      }

      const next = await changeMicrositeSubdomain(eventId, { subdomain: value })
      setSubdomainState('Subdomain updated.')
      await onChanged(next, `MicroSite subdomain changed to ${next.subdomain}.`)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to change MicroSite subdomain.')
    } finally {
      setBusy(null)
    }
  }

  const saveTemplate = async () => {
    if (
      busy ||
      dirty ||
      templateKey === detail.templateKey ||
      !editAccess.allowed ||
      !templateAccess.allowed
    ) {
      return
    }

    try {
      setBusy('template')
      const next = await changeMicrositeTemplate(eventId, {
        expectedDraftVersionNumber: detail.draftVersionNumber,
        templateKey,
        mode: templateMode
      })

      await onChanged(
        next,
        templateMode === 'keep-content'
          ? `Applied ${templateKey} styling while keeping content.`
          : `Reset draft to the ${templateKey} template.`
      )
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to change MicroSite template.')
    } finally {
      setBusy(null)
    }
  }

  const loadHistory = async () => {
    if (!historyAccess.allowed) return

    setHistoryOpen(true)

    try {
      setBusy('history')
      setHistory(await getMicrositeHistory(eventId, 1, 50))
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to load MicroSite history.')
    } finally {
      setBusy(null)
    }
  }

  const restore = async (versionNumber: number) => {
    if (dirty || busy || !restoreAccess.allowed || !editAccess.allowed) return

    try {
      setBusy('restore')
      const next = await restoreMicrositeVersion(eventId, versionNumber, {
        expectedDraftVersionNumber: detail.draftVersionNumber
      })

      setHistoryOpen(false)
      await onChanged(next, `Restored version ${versionNumber} as draft v${next.draftVersionNumber}.`)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to restore MicroSite version.')
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (busy || !deleteAccess.allowed) return

    try {
      setBusy('delete')
      await deleteAdminMicrosite(eventId, detail.draftVersionNumber)
      setDeleteOpen(false)
      onDeleted()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to delete MicroSite.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {detail.publishedVersionNumber !== null && (
          <Button
            component={Link}
            href={`/microsite/${encodeURIComponent(detail.subdomain)}`}
            target='_blank'
            variant='outlined'
            startIcon={<i className='tabler-external-link' />}
            sx={{ minHeight: 44 }}
          >
            Open public
          </Button>
        )}

        {historyAccess.allowed && (
          <Button
            variant='outlined'
            onClick={() => void loadHistory()}
            startIcon={<i className='tabler-history' />}
            sx={{ minHeight: 44 }}
          >
            History
          </Button>
        )}

        {(domainAccess.allowed || templateAccess.allowed || deleteAccess.allowed) && (
          <Button
            variant='outlined'
            onClick={() => setSettingsOpen(true)}
            startIcon={<i className='tabler-settings' />}
            sx={{ minHeight: 44 }}
          >
            Settings
          </Button>
        )}

        {publishAccess.allowed && (
          <Button
            variant='contained'
            onClick={() => void publish()}
            disabled={dirty || busy !== null}
            startIcon={
              busy === 'publish'
                ? <i className='tabler-loader-2 animate-spin' />
                : <i className='tabler-rocket' />
            }
            sx={{ minHeight: 44 }}
          >
            {busy === 'publish' ? 'Publishing...' : 'Publish'}
          </Button>
        )}
      </Box>

      <Dialog
        open={settingsOpen}
        onClose={busy ? undefined : () => setSettingsOpen(false)}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle>MicroSite settings</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 3, pt: '12px !important' }}>
          {dirty && (
            <Alert severity='warning'>
              Save your current editor changes before changing the template.
            </Alert>
          )}

          {domainAccess.allowed && (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              <Typography variant='subtitle1' fontWeight={700}>Public subdomain</Typography>
              <TextField
                label='Subdomain'
                value={subdomain}
                onChange={event => {
                  setSubdomain(event.target.value.toLowerCase())
                  setSubdomainState('')
                }}
                helperText={subdomainState || '3-63 lowercase letters, numbers, and hyphens.'}
                inputProps={{ maxLength: 63 }}
                fullWidth
                disabled={busy !== null}
              />
              <Button
                variant='outlined'
                onClick={() => void saveSubdomain()}
                disabled={
                  busy !== null ||
                  !subdomain.trim() ||
                  subdomain.trim().toLowerCase() === detail.subdomain
                }
                sx={{ justifySelf: 'start' }}
              >
                Save subdomain
              </Button>
            </Box>
          )}

          {domainAccess.allowed && templateAccess.allowed && <Divider />}

          {templateAccess.allowed && editAccess.allowed && (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              <Typography variant='subtitle1' fontWeight={700}>Template</Typography>
              <FormControl fullWidth>
                <InputLabel id='microsite-template-label'>Template</InputLabel>
                <Select
                  labelId='microsite-template-label'
                  label='Template'
                  value={templateKey}
                  onChange={event => setTemplateKey(String(event.target.value))}
                  disabled={busy !== null}
                >
                  {catalog.templates
                    .filter(template => template.isActive)
                    .map(template => (
                      <MenuItem key={template.id} value={template.key}>
                        {template.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <RadioGroup
                value={templateMode}
                onChange={event =>
                  setTemplateMode(event.target.value as 'keep-content' | 'reset')
                }
              >
                <FormControlLabel
                  value='keep-content'
                  control={<Radio />}
                  label='Keep current content and apply the new template design'
                />
                <FormControlLabel
                  value='reset'
                  control={<Radio />}
                  label='Reset the draft to the selected template defaults'
                />
              </RadioGroup>

              <Button
                variant='outlined'
                onClick={() => void saveTemplate()}
                disabled={
                  busy !== null ||
                  dirty ||
                  templateKey === detail.templateKey
                }
                sx={{ justifySelf: 'start' }}
              >
                Apply template
              </Button>
            </Box>
          )}

          {deleteAccess.allowed && detail.publishedVersionNumber === null && (
            <>
              <Divider />
              <Box>
                <Typography variant='subtitle1' fontWeight={700}>Delete draft MicroSite</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                  Only a MicroSite that has never been published can be deleted.
                </Typography>
                <Button
                  color='error'
                  variant='outlined'
                  onClick={() => {
                    setSettingsOpen(false)
                    setDeleteOpen(true)
                  }}
                  sx={{ mt: 1.5 }}
                >
                  Delete MicroSite
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)} disabled={busy !== null}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={historyOpen}
        onClose={busy === 'restore' ? undefined : () => setHistoryOpen(false)}
        fullWidth
        maxWidth='md'
      >
        <DialogTitle>Version history</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          {dirty && (
            <Alert severity='warning' sx={{ mb: 2 }}>
              Save your current changes before restoring another version.
            </Alert>
          )}

          {busy === 'history' && (
            <Typography color='text.secondary'>Loading version history...</Typography>
          )}

          {busy !== 'history' && history?.items.length === 0 && (
            <Typography color='text.secondary'>No versions are available yet.</Typography>
          )}

          <Box sx={{ display: 'grid', gap: 1.25 }}>
            {history?.items.map(item => {
              const isDraft = item.versionNumber === detail.draftVersionNumber
              const isPublished = item.versionNumber === detail.publishedVersionNumber

              return (
                <Box
                  key={item.versionNumber}
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    gap: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5
                  }}
                >
                  <Box>
                    <Typography fontWeight={700}>
                      Version {item.versionNumber}
                      {isDraft ? ' · current draft' : ''}
                      {isPublished ? ' · published' : ''}
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                      {item.templateKey} · {new Date(item.createdAtUtc).toLocaleString()}
                    </Typography>
                    {item.restoredFromVersionNumber !== null && (
                      <Typography variant='caption' color='text.secondary'>
                        Restored from v{item.restoredFromVersionNumber}
                      </Typography>
                    )}
                  </Box>

                  {restoreAccess.allowed && editAccess.allowed && !isDraft && (
                    <Button
                      variant='outlined'
                      disabled={dirty || busy !== null}
                      onClick={() => void restore(item.versionNumber)}
                      sx={{ alignSelf: { sm: 'center' } }}
                    >
                      Restore
                    </Button>
                  )}
                </Box>
              )
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)} disabled={busy === 'restore'}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmActionDialog
        open={deleteOpen}
        title='Delete this MicroSite?'
        description='This removes the never-published MicroSite draft and its version history for this event.'
        confirmLabel='Delete MicroSite'
        loading={busy === 'delete'}
        onClose={() => setDeleteOpen(false)}
        onConfirm={remove}
        details={[
          { label: 'Event', value: eventName },
          { label: 'Subdomain', value: detail.subdomain },
          { label: 'Draft', value: `v${detail.draftVersionNumber}` }
        ]}
        warning='Published MicroSites cannot be deleted by this action.'
      />
    </>
  )
}

export default MicrositeLifecycleActions
