'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import ConfirmActionDialog from '@/components/feedback/ConfirmActionDialog'

import {
  getAdminEventExperience,
  updateAdminEventExperience,
  type EventWorkspaceItem
} from '@/lib/event-experience'
import { getAllRegistrations } from '../../registrations/services/registration.service'
import type { Registration } from '../../registrations/types'

type Props = {
  eventId: string
  eventName: string
  templates: EventWorkspaceItem[]
  disabled?: boolean
}

type RecipientMode = 'eligible' | 'registration' | 'manual'
type AssetKey = 'logoDataUrl' | 'signatureDataUrl' | 'stampDataUrl'

type CertificateRecipient = {
  fullName: string
  bookingCode?: string
  eventPackageName?: string | null
}

type AssetState = Record<AssetKey, string>

const EMPTY_ASSETS: AssetState = { logoDataUrl: '', signatureDataUrl: '', stampDataUrl: '' }
const ASSET_LABELS: Record<AssetKey, string> = {
  logoDataUrl: 'Certificate logo',
  signatureDataUrl: 'Signature image',
  stampDataUrl: 'Official stamp'
}
const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024
const TARGET_DATA_URL_LENGTH = 26000

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const isCheckedIn = (registration: Registration) => Boolean(registration.checkedInAt) || registration.status === 'CHECKED_IN'

const eligibleForTemplate = (registrations: Registration[], template: EventWorkspaceItem | undefined) => {
  const eligibility = String(template?.eligibility ?? '').toLowerCase()
  const active = registrations.filter(item => item.status !== 'CANCELLED')
  if (eligibility.includes('all registered') || eligibility.includes('all participant')) return active
  return active.filter(isCheckedIn)
}

const issuerInitials = (issuer: unknown) =>
  String(issuer || 'Event Organizer')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || 'EO'

const certificateDate = () =>
  new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Unable to read this image.'))
    }
    image.src = url
  })

const compressCertificateImage = async (file: File) => {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size <= 0) throw new Error('The selected image is empty.')
  if (file.size > MAX_SOURCE_FILE_BYTES) throw new Error('Image must not exceed 10 MB.')

  const image = await loadImage(file)
  let scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight))
  let quality = 0.86
  let result = ''

  for (let attempt = 0; attempt < 9; attempt += 1) {
    const width = Math.max(120, Math.round(image.naturalWidth * scale))
    const height = Math.max(80, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image processing is not supported in this browser.')

    context.clearRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)
    result = canvas.toDataURL('image/webp', quality)

    if (result.length <= TARGET_DATA_URL_LENGTH) return result
    scale *= 0.78
    quality = Math.max(0.48, quality - 0.08)
  }

  if (!result || result.length > 38000) {
    throw new Error('Image is still too large after compression. Try a simpler or smaller image.')
  }
  return result
}

export default function CertificateGenerator({ eventId, eventName, templates, disabled = false }: Props) {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [templateId, setTemplateId] = useState('')
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('eligible')
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('')
  const [manualName, setManualName] = useState('')
  const [assets, setAssets] = useState<AssetState>(EMPTY_ASSETS)
  const [assetSaving, setAssetSaving] = useState<AssetKey | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removeAssetTarget, setRemoveAssetTarget] = useState<AssetKey | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getAllRegistrations(eventId)
        if (mounted) setRegistrations(result)
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load certificate recipients.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [eventId])

  useEffect(() => {
    if (!templateId && templates.length) setTemplateId(templates[0].id)
    if (templateId && !templates.some(template => template.id === templateId)) {
      setTemplateId(templates[0]?.id ?? '')
    }
  }, [templateId, templates])

  const template = templates.find(item => item.id === templateId)

  useEffect(() => {
    setAssets({
      logoDataUrl: typeof template?.logoDataUrl === 'string' ? template.logoDataUrl : '',
      signatureDataUrl: typeof template?.signatureDataUrl === 'string' ? template.signatureDataUrl : '',
      stampDataUrl: typeof template?.stampDataUrl === 'string' ? template.stampDataUrl : ''
    })
  }, [templateId, template?.logoDataUrl, template?.signatureDataUrl, template?.stampDataUrl])

  const activeRegistrations = useMemo(
    () => registrations.filter(item => item.status !== 'CANCELLED'),
    [registrations]
  )

  const eligibleRecipients = useMemo(
    () => eligibleForTemplate(registrations, template),
    [registrations, template]
  )

  const recipients = useMemo<CertificateRecipient[]>(() => {
    if (recipientMode === 'eligible') return eligibleRecipients

    if (recipientMode === 'registration') {
      const selected = activeRegistrations.find(item => item.id === selectedRegistrationId)
      return selected ? [selected] : []
    }

    const name = manualName.trim()
    return name ? [{ fullName: name }] : []
  }, [activeRegistrations, eligibleRecipients, manualName, recipientMode, selectedRegistrationId])

  const previewRecipient = recipients[0] ?? { fullName: 'Participant Name' }
  const previewIssuer = String(template?.issuer || 'Event Organizer')
  const previewSigner = String(template?.signer || 'Authorized Signatory')
  const previewSignerTitle = String(template?.signerTitle || 'Event Organizer')
  const previewTitle = String(template?.title || 'Certificate of Participation')
  const previewBody = String(template?.bodyText || 'has successfully participated in')

  const persistAsset = async (key: AssetKey, value: string) => {
    if (!template) return
    const experience = await getAdminEventExperience(eventId)
    const currentItems = Array.isArray(experience.moduleData?.certificates)
      ? experience.moduleData.certificates as EventWorkspaceItem[]
      : []

    const nextItems = currentItems.map(item =>
      item.id === template.id ? { ...item, [key]: value || undefined } : item
    )

    await updateAdminEventExperience(eventId, {
      enabledModules: experience.enabledModules,
      registrationFields: experience.registrationFields,
      moduleData: { ...experience.moduleData, certificates: nextItems }
    })
  }

  const handleAssetUpload = async (key: AssetKey, file: File | undefined) => {
    if (!file || !template || disabled || assetSaving) return
    try {
      setAssetSaving(key)
      setError(null)
      const dataUrl = await compressCertificateImage(file)
      await persistAsset(key, dataUrl)
      setAssets(current => ({ ...current, [key]: dataUrl }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to save certificate image.')
    } finally {
      setAssetSaving(null)
    }
  }

  const removeAsset = async (key: AssetKey) => {
    if (!template || disabled || assetSaving || !assets[key]) return
    try {
      setAssetSaving(key)
      setError(null)
      await persistAsset(key, '')
      setAssets(current => ({ ...current, [key]: '' }))
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove certificate image.')
    } finally {
      setAssetSaving(null)
    }
  }

  const generate = () => {
    if (!template || recipients.length === 0) return

    setError(null)
    const popup = window.open('', '_blank')
    if (!popup) {
      setError('Certificate preview was blocked by the browser. Allow pop-ups for this site and try again.')
      return
    }

    try {
      popup.opener = null
    } catch {
      // Rendering can continue when the browser prevents changing opener.
    }

    const issuer = escapeHtml(template.issuer || 'Event Organizer')
    const signer = escapeHtml(template.signer || '')
    const signerTitle = escapeHtml(template.signerTitle || '')
    const certificateTitle = escapeHtml(template.title || 'Certificate of Participation')
    const bodyText = escapeHtml(template.bodyText || 'has successfully participated in')
    const safeEventName = escapeHtml(eventName)
    const seal = escapeHtml(issuerInitials(template.issuer))
    const issuedOn = escapeHtml(certificateDate())
    const eventCode = eventId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || 'EVENT'

    const logoHtml = assets.logoDataUrl
      ? `<img class="uploaded-logo" src="${escapeHtml(assets.logoDataUrl)}" alt="Organizer logo" />`
      : `<div class="brand-mark">${seal}</div>`

    const signatureImageHtml = assets.signatureDataUrl
      ? `<img class="signature-image" src="${escapeHtml(assets.signatureDataUrl)}" alt="Signature" />`
      : ''

    const stampImageHtml = assets.stampDataUrl
      ? `<img class="stamp-image" src="${escapeHtml(assets.stampDataUrl)}" alt="Official stamp" />`
      : `<div class="seal-ring"><div class="seal-inner">${seal}</div></div>`

    const certificates = recipients.map((recipient, index) => {
      const certificateId = escapeHtml(
        recipient.bookingCode
          ? `CERT-${recipient.bookingCode}`
          : `CERT-${eventCode}-${String(index + 1).padStart(3, '0')}`
      )
      const packageName = recipient.eventPackageName ? escapeHtml(recipient.eventPackageName) : ''

      return `
        <section class="certificate">
          <div class="corner corner-tl"></div>
          <div class="corner corner-tr"></div>
          <div class="corner corner-bl"></div>
          <div class="corner corner-br"></div>
          <div class="inner-frame"></div>

          <header class="certificate-header">
            <div class="brand-slot">${logoHtml}</div>
            <div class="brand-copy">
              <div class="issuer">${issuer}</div>
              <div class="document-label">Official Event Certificate</div>
            </div>
            <div class="certificate-number">${certificateId}</div>
          </header>

          <main class="certificate-content">
            <div class="kicker">CERTIFICATE</div>
            <h1>${certificateTitle}</h1>
            <div class="ornament"><span></span><i></i><span></span></div>
            <p class="intro">This certificate is proudly presented to</p>
            <h2>${escapeHtml(recipient.fullName)}</h2>
            <div class="name-rule"></div>
            <p class="body-copy">${bodyText}</p>
            <h3>${safeEventName}</h3>
            ${packageName ? `<div class="package-badge">${packageName}</div>` : ''}
          </main>

          <footer class="certificate-footer">
            <div class="issued-block">
              <div class="footer-label">Issued on</div>
              <strong>${issuedOn}</strong>
              ${recipient.bookingCode ? `<span>Booking ${escapeHtml(recipient.bookingCode)}</span>` : '<span>Official event record</span>'}
            </div>

            <div class="stamp-block">
              ${stampImageHtml}
              <span>OFFICIAL</span>
            </div>

            <div class="signature-block">
              <div class="signature-space">${signatureImageHtml}</div>
              <div class="signature-line"></div>
              <strong>${signer || issuer}</strong>
              <span>${signerTitle || 'Authorized Signatory'}</span>
            </div>
          </footer>
        </section>
      `
    }).join('')

    popup.document.open()
    popup.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${certificateTitle} - ${safeEventName}</title>
          <style>
            :root { --navy:#0d1b2a; --navy-soft:#18324d; --gold:#c99a3d; --paper:#fffdf8; --muted:#667085; }
            * { box-sizing:border-box; }
            html,body { margin:0; min-height:100%; }
            body { font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif; background:#e8edf3; color:var(--navy); }
            .toolbar { position:sticky; top:0; z-index:20; padding:14px 22px; background:rgba(13,27,42,.97); color:#fff; display:flex; justify-content:space-between; align-items:center; gap:16px; box-shadow:0 8px 24px rgba(13,27,42,.18); }
            .toolbar-copy { display:grid; gap:2px; } .toolbar-copy strong{font-size:14px}.toolbar-copy span{font-size:12px;color:rgba(255,255,255,.68)}
            .toolbar button { border:1px solid rgba(255,255,255,.18); background:linear-gradient(135deg,#fff,#f4e7c3); color:var(--navy); border-radius:10px; padding:10px 17px; font-weight:800; cursor:pointer; }
            .certificate { position:relative; width:297mm; height:210mm; margin:22px auto; overflow:hidden; background:radial-gradient(circle at 18% 12%,rgba(201,154,61,.08),transparent 24%),radial-gradient(circle at 88% 88%,rgba(24,50,77,.06),transparent 28%),linear-gradient(135deg,#fff 0%,var(--paper) 100%); box-shadow:0 18px 55px rgba(13,27,42,.16); page-break-after:always; padding:14mm 18mm; }
            .certificate::before { content:""; position:absolute; inset:7mm; border:1px solid rgba(201,154,61,.72); pointer-events:none; }
            .certificate::after { content:""; position:absolute; inset:9mm; border:1px solid rgba(13,27,42,.16); pointer-events:none; }
            .inner-frame { position:absolute; inset:11mm; border:1px solid rgba(201,154,61,.25); pointer-events:none; }
            .corner { position:absolute; width:43mm; height:43mm; pointer-events:none; z-index:0; }
            .corner::before,.corner::after { content:""; position:absolute; background:var(--navy); opacity:.96; }
            .corner::before { width:43mm; height:7mm; } .corner::after { width:7mm; height:43mm; }
            .corner-tl{top:0;left:0}.corner-tr{top:0;right:0;transform:rotate(90deg)}.corner-br{bottom:0;right:0;transform:rotate(180deg)}.corner-bl{bottom:0;left:0;transform:rotate(270deg)}
            .certificate-header,.certificate-content,.certificate-footer { position:relative; z-index:2; }
            .certificate-header { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:12px; padding:2mm 4mm 0; }
            .brand-slot { width:19mm; height:19mm; display:grid; place-items:center; }
            .uploaded-logo { display:block; max-width:19mm; max-height:19mm; object-fit:contain; }
            .brand-mark { width:16mm; height:16mm; display:grid; place-items:center; border-radius:50%; border:1.4px solid var(--gold); outline:1px solid rgba(201,154,61,.28); outline-offset:3px; background:var(--navy); color:#fff; font-family:Georgia,"Times New Roman",serif; font-size:17px; font-weight:800; letter-spacing:.08em; }
            .brand-copy{display:grid;gap:2px}.issuer{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.document-label{font-size:9px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}.certificate-number{font-size:9px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase}
            .certificate-content { height:128mm; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:4mm 20mm 0; }
            .kicker{font-size:11px;font-weight:900;letter-spacing:.42em;color:var(--gold);margin-left:.42em}
            h1{margin:4mm 0 1.8mm;font-family:Georgia,"Times New Roman",serif;font-size:33px;line-height:1.08;letter-spacing:-.025em;color:var(--navy)}
            .ornament{display:flex;align-items:center;gap:9px;margin:2mm 0 5mm}.ornament span{display:block;width:31mm;height:1px;background:linear-gradient(90deg,transparent,var(--gold))}.ornament span:last-child{transform:scaleX(-1)}.ornament i{width:7px;height:7px;border:1.5px solid var(--gold);transform:rotate(45deg)}
            .intro{margin:0 0 3mm;color:var(--muted);font-size:13px;letter-spacing:.035em}
            h2{margin:0;max-width:230mm;font-family:Georgia,"Times New Roman",serif;font-size:35px;line-height:1.05;color:#102a43;letter-spacing:-.025em}
            .name-rule{width:min(125mm,70%);height:1px;margin:3mm auto 4mm;background:linear-gradient(90deg,transparent,rgba(201,154,61,.9),transparent)}
            .body-copy{margin:0;color:#536273;font-size:13px;line-height:1.55} h3{margin:2.2mm 0 0;font-size:22px;line-height:1.18;color:var(--navy);font-weight:800}
            .package-badge{margin-top:3.2mm;display:inline-flex;align-items:center;justify-content:center;min-height:7mm;padding:1.2mm 4mm;border-radius:999px;border:1px solid rgba(201,154,61,.45);background:rgba(201,154,61,.08);color:#77591f;font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
            .certificate-footer { display:grid; grid-template-columns:1fr auto 1fr; gap:16mm; align-items:end; padding:0 8mm 2mm; }
            .issued-block,.signature-block{display:grid;gap:4px}.issued-block{justify-self:start}.signature-block{justify-self:end;text-align:center;min-width:54mm}.footer-label{font-size:8px;color:var(--muted);letter-spacing:.14em;text-transform:uppercase}.issued-block strong,.signature-block strong{font-size:10px}.issued-block span,.signature-block span{font-size:8.5px;color:var(--muted)}
            .signature-space{height:18mm;display:flex;align-items:end;justify-content:center}.signature-image{display:block;max-height:17mm;max-width:46mm;object-fit:contain}.signature-line{border-top:1px solid rgba(13,27,42,.65);margin-bottom:1mm}
            .stamp-block{display:grid;place-items:center;gap:3px;min-width:24mm}.stamp-block>span{font-size:7px;font-weight:900;letter-spacing:.14em;color:var(--gold)}.stamp-image{display:block;max-width:25mm;max-height:25mm;object-fit:contain}
            .seal-ring{width:22mm;height:22mm;border:1.5px solid var(--gold);border-radius:50%;display:grid;place-items:center;outline:1px solid rgba(201,154,61,.32);outline-offset:2px}.seal-inner{width:16mm;height:16mm;border:1px dashed rgba(201,154,61,.78);border-radius:50%;display:grid;place-items:center;font-family:Georgia,serif;font-weight:900;font-size:10px}
            @media print { @page{size:A4 landscape;margin:0} body{background:#fff}.toolbar{display:none}.certificate{margin:0;width:297mm;height:210mm;box-shadow:none} }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <div class="toolbar-copy"><strong>${recipients.length} certificate(s) ready</strong><span>A4 landscape · premium event certificate</span></div>
            <button onclick="window.print()">Print / Save PDF</button>
          </div>
          ${certificates}
        </body>
      </html>`)
    popup.document.close()
  }

  const AssetUpload = ({ assetKey, title, helper }: { assetKey: AssetKey; title: string; helper: string }) => {
    const inputId = `certificate-${assetKey}-${templateId}`
    const image = assets[assetKey]
    const saving = assetSaving === assetKey

    return (
      <Box sx={{ p: 2, borderRadius: 2.5, border: theme => `1px solid ${theme.palette.divider}`, display: 'grid', gap: 1.5 }}>
        <Box sx={{ minHeight: 92, borderRadius: 2, bgcolor: 'action.hover', display: 'grid', placeItems: 'center', overflow: 'hidden', p: 1 }}>
          {image ? (
            <Box component='img' src={image} alt={title} sx={{ maxWidth: '100%', maxHeight: 82, objectFit: 'contain' }} />
          ) : (
            <i className='tabler-photo-plus text-3xl' />
          )}
        </Box>
        <Box>
          <Typography fontWeight={800}>{title}</Typography>
          <Typography variant='caption' color='text.secondary'>{helper}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button component='label' htmlFor={inputId} size='small' variant='outlined' disabled={disabled || !!assetSaving}>
            {saving ? 'Saving…' : image ? 'Replace' : 'Upload'}
          </Button>
          <input
            id={inputId}
            type='file'
            accept='image/png,image/jpeg,image/webp'
            hidden
            onChange={event => {
              const file = event.target.files?.[0]
              event.target.value = ''
              void handleAssetUpload(assetKey, file)
            }}
          />
          {image && (
            <Button size='small' color='error' variant='text' disabled={disabled || !!assetSaving} onClick={() => setRemoveAssetTarget(assetKey)}>
              Remove
            </Button>
          )}
        </Box>
      </Box>
    )
  }

  return (
    <Card variant='outlined'>
      <CardContent sx={{ p: { xs: 3, md: 4 }, display: 'grid', gap: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant='h5' fontWeight={850}>Certificate Studio</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: .75, maxWidth: 780 }}>
              Create premium A4 certificates with participant data, organizer branding, uploaded signature, and official stamp.
            </Typography>
          </Box>
          <Chip label={`${recipients.length} selected`} color='success' variant='tonal' />
        </Box>

        {error && <Alert severity='error'>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
        ) : templates.length === 0 ? (
          <Alert severity='info'>Create a certificate template above first.</Alert>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(300px,.72fr) minmax(0,1.28fr)' }, gap: 3 }}>
              <Box sx={{ display: 'grid', gap: 2, alignContent: 'start' }}>
                <TextField
                  select
                  label='Certificate template'
                  value={templateId}
                  onChange={event => setTemplateId(event.target.value)}
                  disabled={disabled}
                >
                  {templates.map(item => <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>)}
                </TextField>

                <TextField
                  select
                  label='Recipient source'
                  value={recipientMode}
                  onChange={event => setRecipientMode(event.target.value as RecipientMode)}
                  disabled={disabled}
                >
                  <MenuItem value='eligible'>All eligible participants ({eligibleRecipients.length})</MenuItem>
                  <MenuItem value='registration'>Choose from registrations</MenuItem>
                  <MenuItem value='manual'>Type name manually</MenuItem>
                </TextField>

                {recipientMode === 'registration' && (
                  <TextField
                    select
                    required
                    label='Registrant name'
                    value={selectedRegistrationId}
                    onChange={event => setSelectedRegistrationId(event.target.value)}
                    disabled={disabled}
                  >
                    <MenuItem value=''><em>Select registrant</em></MenuItem>
                    {activeRegistrations.map(registration => (
                      <MenuItem key={registration.id} value={registration.id}>
                        {registration.fullName} — {registration.bookingCode}{registration.eventPackageName ? ` · ${registration.eventPackageName}` : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                )}

                {recipientMode === 'manual' && (
                  <TextField
                    required
                    label='Recipient name'
                    value={manualName}
                    onChange={event => setManualName(event.target.value)}
                    disabled={disabled}
                    placeholder='Type the name exactly as it should appear'
                  />
                )}

                <Divider />

                <Box>
                  <Typography variant='subtitle1' fontWeight={850}>Certificate branding</Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: .5 }}>
                    Images are automatically resized and compressed before being stored with this certificate template.
                  </Typography>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0,1fr))', lg: '1fr' }, gap: 1.5 }}>
                  <AssetUpload assetKey='logoDataUrl' title='Logo' helper='PNG/JPG/WebP. Transparent PNG works best.' />
                  <AssetUpload assetKey='signatureDataUrl' title='Signature' helper='Use a clean transparent signature image.' />
                  <AssetUpload assetKey='stampDataUrl' title='Official stamp' helper='Upload a scanned or transparent stamp.' />
                </Box>
              </Box>

              <Box
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 4,
                  border: theme => `1px solid ${theme.palette.divider}`,
                  bgcolor: '#fffdf8',
                  aspectRatio: '1.414 / 1',
                  minHeight: 420,
                  boxShadow: '0 20px 55px rgba(13,27,42,.10)'
                }}
              >
                <Box sx={{ position: 'absolute', inset: 14, border: '1px solid rgba(201,154,61,.72)' }} />
                <Box sx={{ position: 'absolute', inset: 22, border: '1px solid rgba(13,27,42,.13)' }} />
                <Box sx={{ position: 'absolute', top: 0, left: 0, width: '20%', height: 24, bgcolor: '#0d1b2a' }} />
                <Box sx={{ position: 'absolute', top: 0, left: 0, width: 24, height: '28%', bgcolor: '#0d1b2a' }} />
                <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: '20%', height: 24, bgcolor: '#0d1b2a' }} />
                <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: '28%', bgcolor: '#0d1b2a' }} />

                <Box sx={{ position: 'relative', zIndex: 2, height: '100%', p: { xs: 4, md: 5 }, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 58, height: 58, display: 'grid', placeItems: 'center' }}>
                      {assets.logoDataUrl ? (
                        <Box component='img' src={assets.logoDataUrl} alt='Logo' sx={{ maxWidth: 58, maxHeight: 58, objectFit: 'contain' }} />
                      ) : (
                        <Box sx={{ width: 50, height: 50, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: '#0d1b2a', color: '#fff', border: '2px solid #c99a3d', fontFamily: 'Georgia,serif', fontWeight: 900 }}>
                          {issuerInitials(previewIssuer)}
                        </Box>
                      )}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 11, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', color: '#0d1b2a' }}>{previewIssuer}</Typography>
                      <Typography sx={{ fontSize: 9, color: '#667085', letterSpacing: '.08em', textTransform: 'uppercase' }}>Official Event Certificate</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 9, color: '#667085' }}>CERT-PREVIEW</Typography>
                  </Box>

                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: { xs: 1, md: 7 } }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 900, letterSpacing: '.4em', color: '#c99a3d' }}>CERTIFICATE</Typography>
                    <Typography sx={{ mt: 1.4, fontFamily: 'Georgia,serif', fontWeight: 800, fontSize: { xs: 26, md: 34 }, color: '#0d1b2a' }}>{previewTitle}</Typography>
                    <Box sx={{ width: 100, height: 1, bgcolor: '#c99a3d', my: 2 }} />
                    <Typography sx={{ fontSize: 12, color: '#667085' }}>This certificate is proudly presented to</Typography>
                    <Typography sx={{ mt: 1, fontFamily: 'Georgia,serif', fontWeight: 800, fontSize: { xs: 29, md: 38 }, color: '#102a43' }}>{previewRecipient.fullName}</Typography>
                    <Typography sx={{ mt: 2, fontSize: 12, color: '#536273' }}>{previewBody}</Typography>
                    <Typography sx={{ mt: .8, fontSize: { xs: 18, md: 22 }, fontWeight: 900, color: '#0d1b2a' }}>{eventName}</Typography>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 2, alignItems: 'end' }}>
                    <Box>
                      <Typography sx={{ fontSize: 8, color: '#667085', textTransform: 'uppercase', letterSpacing: '.12em' }}>Issued on</Typography>
                      <Typography sx={{ mt: .4, fontSize: 10, fontWeight: 800, color: '#0d1b2a' }}>{certificateDate()}</Typography>
                    </Box>
                    <Box sx={{ width: 62, height: 62, display: 'grid', placeItems: 'center' }}>
                      {assets.stampDataUrl ? (
                        <Box component='img' src={assets.stampDataUrl} alt='Stamp' sx={{ maxWidth: 62, maxHeight: 62, objectFit: 'contain' }} />
                      ) : (
                        <Box sx={{ width: 54, height: 54, borderRadius: '50%', border: '2px solid #c99a3d', display: 'grid', placeItems: 'center', color: '#c99a3d', fontWeight: 900, fontSize: 10 }}>{issuerInitials(previewIssuer)}</Box>
                      )}
                    </Box>
                    <Box sx={{ justifySelf: 'end', width: 150, textAlign: 'center' }}>
                      <Box sx={{ height: 50, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
                        {assets.signatureDataUrl && <Box component='img' src={assets.signatureDataUrl} alt='Signature' sx={{ maxWidth: 130, maxHeight: 48, objectFit: 'contain' }} />}
                      </Box>
                      <Box sx={{ borderTop: '1px solid rgba(13,27,42,.55)', pt: .5 }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 900, color: '#0d1b2a' }}>{previewSigner}</Typography>
                        <Typography sx={{ fontSize: 8, color: '#667085' }}>{previewSignerTitle}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Button
              variant='contained'
              size='large'
              disabled={disabled || !template || recipients.length === 0 || !!assetSaving}
              onClick={generate}
              startIcon={<i className='tabler-certificate' />}
              sx={{ justifySelf: 'start', px: 3 }}
            >
              Generate {recipients.length === 1 ? 'Certificate' : `${recipients.length} Certificates`}
            </Button>
          </>
        )}
      </CardContent>
      <ConfirmActionDialog
        open={Boolean(removeAssetTarget)}
        title='Remove certificate asset?'
        description='This image will be removed from the selected certificate template.'
        confirmLabel='Confirm Remove'
        loading={Boolean(assetSaving)}
        onClose={() => {
          if (!assetSaving) setRemoveAssetTarget(null)
        }}
        onConfirm={async () => {
          if (!removeAssetTarget || assetSaving) return
          const target = removeAssetTarget
          await removeAsset(target)
          setRemoveAssetTarget(null)
        }}
        details={removeAssetTarget ? [
          { label: 'Template', value: String(template?.title || 'Certificate template') },
          { label: 'Asset', value: ASSET_LABELS[removeAssetTarget] }
        ] : []}
      />
    </Card>
  )
}
