'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

import * as XLSX from 'xlsx'

import InternalImportPackageSelector from './InternalImportPackageSelector'
import type { EventPackage } from '../services/types/event-package'
import { getEventPackages } from '../services/event-package.service'
import { downloadInternalRegistrationTemplate, importInternalRegistrations } from '../services/registration.api'

type Props = {
  open: boolean
  onClose: () => void
  eventSlug: string
  onImported?: () => Promise<void> | void
}

type ImportRow = {
  rowNumber: number
  fullName: string
  email: string
  phone: string
  nip: string
  organization: string
  position: string
  errors: string[]
}

type ImportResult = {
  succeeded: number
  failed: number
  errors: string[]
  status: string
}

const REQUIRED_HEADERS = [
  'Nama Lengkap',
  'Email Perusahaan',
  'Nomor Telepon',
  'Nomor Pegawai',
  'Nama Perusahaan',
  'Posisi / Divisi'
]

const normalizeHeader = (value: unknown) =>
  String(value ?? '')
    .replace(/\uFEFF/g, '')
    .normalize('NFKC')
    .replace(/\u00A0/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')

const normalizeValue = (value: unknown) => String(value ?? '').trim()

const ImportExcelDialog = ({ open, onClose, eventSlug, onImported }: Props) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const importLockRef = useRef(false)

  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [packages, setPackages] = useState<EventPackage[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [error, setError] = useState('')
  const [isReading, setIsReading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [templateLoading, setTemplateLoading] = useState(false)

  const validRows = useMemo(() => rows.filter(row => row.errors.length === 0), [rows])

  const invalidRows = useMemo(() => rows.filter(row => row.errors.length > 0), [rows])

  const reset = () => {
    setFileName('')
    setFile(null)
    setRows([])
    setPackages([])
    setSelectedPackageId('')
    setPackagesLoading(false)
    setError('')
    setIsReading(false)
    setIsImporting(false)
    setConfirmOpen(false)
    setImportSuccess(false)
    setImportResult(null)
    setTemplateLoading(false)

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  useEffect(() => {
    if (!open) return

    const loadPackages = async () => {
      setPackagesLoading(true)
      setError('')

      try {
        setPackages(await getEventPackages(eventSlug))
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load event packages.')
      } finally {
        setPackagesLoading(false)
      }
    }

    loadPackages()
  }, [eventSlug, open])

  const handleClose = () => {
    if (isReading || isImporting) return

    reset()
    onClose()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    setError('')
    setRows([])
    setFile(file)
    setImportSuccess(false)
    setFileName(file.name)
    setIsReading(true)

    try {
      const extension = file.name.split('.').pop()?.toLowerCase()

      if (extension !== 'xlsx') {
        throw new Error('Gunakan template Excel resmi berformat .xlsx.')
      }

      const buffer = await file.arrayBuffer()

      const workbook = XLSX.read(buffer, {
        type: 'array'
      })

      const firstSheetName = workbook.SheetNames[0]

      if (!firstSheetName) {
        throw new Error('Excel tidak memiliki worksheet.')
      }

      const worksheet = workbook.Sheets[firstSheetName]

      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        defval: ''
      })

      if (rawRows.length < 2) {
        throw new Error('Excel harus memiliki header dan minimal satu data peserta.')
      }

      const rawHeaders = rawRows[0] ?? []

      const headerMap = new Map<string, number>()

      rawHeaders.forEach((header, index) => {
        headerMap.set(normalizeHeader(header), index)
      })

      const missingHeaders = REQUIRED_HEADERS.filter(header => !headerMap.has(normalizeHeader(header)))

      if (missingHeaders.length > 0) {
        throw new Error(`Kolom wajib tidak ditemukan: ${missingHeaders.join(', ')}`)
      }

      const requiredIndexes = REQUIRED_HEADERS.map(header => headerMap.get(normalizeHeader(header)) as number)

      const dataRows = rawRows
        .slice(1)
        .map((rawRow, index) => ({ rawRow: rawRow as unknown[], sourceIndex: index }))
        .filter(({ rawRow }) => requiredIndexes.some(columnIndex => normalizeValue(rawRow[columnIndex]) !== ''))

      if (dataRows.length === 0) {
        throw new Error('Excel tidak memiliki data peserta yang terisi.')
      }

      // Kirim workbook yang sudah dibersihkan agar range kosong Excel tidak ikut
      // diproses backend sebagai ribuan item import kosong.
      const sanitizedWorkbook = XLSX.utils.book_new()
      const sanitizedWorksheet = XLSX.utils.aoa_to_sheet([rawHeaders, ...dataRows.map(({ rawRow }) => rawRow)])

      XLSX.utils.book_append_sheet(sanitizedWorkbook, sanitizedWorksheet, firstSheetName)

      const sanitizedBuffer = XLSX.write(sanitizedWorkbook, {
        bookType: 'xlsx',
        type: 'array'
      })

      setFile(
        new File([sanitizedBuffer], file.name.replace(/\.(xlsx|xls)$/i, '.xlsx'), {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
      )

      const parsedRows: ImportRow[] = []

      dataRows.forEach(({ rawRow: row, sourceIndex }) => {
        const getValue = (header: string) => {
          const columnIndex = headerMap.get(normalizeHeader(header))

          return columnIndex === undefined ? '' : normalizeValue(row[columnIndex])
        }

        const fullName = getValue('Nama Lengkap')
        const email = getValue('Email Perusahaan')
        const phone = getValue('Nomor Telepon')
        const nip = getValue('Nomor Pegawai')
        const organization = getValue('Nama Perusahaan')
        const position = getValue('Posisi / Divisi')

        const errors: string[] = []

        if (!fullName) errors.push('Nama Lengkap kosong')
        if (!email) errors.push('Email Perusahaan kosong')
        if (!phone) errors.push('Nomor Telepon kosong')
        if (!nip) errors.push('Nomor Pegawai kosong')
        if (!organization) errors.push('Nama Perusahaan kosong')
        if (!position) errors.push('Posisi / Divisi kosong')

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push('Format email tidak valid')
        }

        parsedRows.push({
          rowNumber: sourceIndex + 2,
          fullName,
          email,
          phone,
          nip,
          organization,
          position,
          errors
        })
      })

      setRows(parsedRows)
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'File Excel gagal dibaca.')
      setFileName('')
      setRows([])
    } finally {
      setIsReading(false)
    }
  }

  const handleImport = () => {
    if (!file || !selectedPackageId || validRows.length === 0 || invalidRows.length > 0) return

    setConfirmOpen(true)
  }

  const confirmImport = async () => {
    if (!file || !selectedPackageId || validRows.length === 0 || invalidRows.length > 0 || isImporting || importLockRef.current) return

    importLockRef.current = true
    setConfirmOpen(false)
    setIsImporting(true)
    setError('')

    try {
      const response = await importInternalRegistrations(eventSlug, file, selectedPackageId)

      const responseRecord = response && typeof response === 'object' ? (response as Record<string, unknown>) : {}

      const responseData =
        responseRecord.data && typeof responseRecord.data === 'object'
          ? (responseRecord.data as Record<string, unknown>)
          : responseRecord

      const readCount = (keys: string[], fallback: number) => {
        const value = keys.map(key => responseData[key]).find(item => typeof item === 'number')

        return typeof value === 'number' ? value : fallback
      }

      const succeeded = readCount(
        ['succeeded', 'successCount', 'successfulCount', 'importedCount', 'SuccessCount'],
        0
      )

      const failed = readCount(
        ['failed', 'failedCount', 'failureCount', 'FailedCount'],
        rows.length
      )

      const rawErrors =
        responseData.errors ??
        responseData.Errors ??
        responseData.rowErrors ??
        responseData.RowErrors ??
        responseData.failedItems ??
        responseData.FailedItems

      const resultErrors = Array.isArray(rawErrors)
        ? rawErrors
            .map(item => {
              if (typeof item === 'string') return item

              if (item && typeof item === 'object') {
                const itemRecord = item as Record<string, unknown>
                const row = itemRecord.rowNumber ?? itemRecord.RowNumber
                const message = itemRecord.error ?? itemRecord.Error ?? itemRecord.message ?? itemRecord.Message ?? itemRecord.description ?? itemRecord.Description

                if (typeof message === 'string') return row ? `Row ${row}: ${message}` : message
              }

              return ''
            })
            .filter(Boolean)
        : []

      const confirmedSuccess = responseData.success === true || responseData.Success === true
      const status =
        typeof responseData.status === 'string'
          ? responseData.status
          : typeof responseData.Status === 'string'
            ? responseData.Status
            : confirmedSuccess ? 'COMPLETED' : 'FAILED'

      setImportResult({ succeeded, failed, errors: resultErrors, status })

      // No optimistic success: the entire batch must be confirmed by backend.
      if (!confirmedSuccess || succeeded !== rows.length || failed !== 0 || resultErrors.length > 0) {
        setError(
          `Import ditolak atau belum tersimpan. Backend mengonfirmasi ${succeeded} dari ${rows.length} peserta. ` +
          (resultErrors[0] ?? 'Periksa detail error pada file lalu coba lagi.')
        )
        return
      }

      await onImported?.()
      setImportSuccess(true)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import peserta gagal. Silakan coba lagi.')
    } finally {
      setIsImporting(false)
      importLockRef.current = false
    }
  }

  const handleTemplateDownload = async () => {
    try {
      setTemplateLoading(true)
      setError('')
      await downloadInternalRegistrationTemplate(eventSlug)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Template gagal diunduh.')
    } finally {
      setTemplateLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='lg'>
      <DialogTitle>
        <Box>
          <Typography variant='h5' fontWeight={700}>
            Import Internal Participants
          </Typography>

          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            Unduh template .xlsx resmi dari sistem. Pertahankan keenam nama kolom, isi data peserta mulai baris kedua, lalu pilih paket event sebelum impor.
          </Typography>
          <Button size='small' variant='outlined' sx={{ mt: 2 }}
            startIcon={<i className='tabler-download' />}
            disabled={templateLoading || isImporting}
            onClick={() => void handleTemplateDownload()}>
            {templateLoading ? 'Downloading...' : 'Download Template Excel'}
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 3, p: 2.5, borderRadius: 2, bgcolor: 'action.hover', display: 'grid', gap: 1.25 }}>
          <Typography fontWeight={750}>Format Excel yang diterima sistem</Typography>
          <Typography variant='body2' color='text.secondary'>
            Worksheet pertama: tepat enam kolom wajib berikut. Jangan mengganti nama header atau menambah baris judul sebelum header.
          </Typography>
          <Box component='ol' sx={{ m: 0, pl: 2.5, display: 'grid', gap: 0.4 }}>
            {REQUIRED_HEADERS.map(header => (
              <Typography component='li' variant='body2' key={header}>{header}</Typography>
            ))}
          </Box>
          <Typography variant='body2' color='text.secondary'>
            Contoh satu baris: Budi Contoh · budi@contoh.com · 081234567890 · PEG-001 · PT Contoh · Staf Acara.
            Ini hanya ilustrasi, bukan data untuk diimpor. Nomor telepon dan pegawai sebaiknya berformat Text di Excel agar angka nol awal tidak hilang.
          </Typography>
          <Alert severity='info'>
            Tombol Download Template Excel mengambil berkas langsung dari backend resmi, sehingga kolom yang diunduh mengikuti format yang dipakai sistem. Pastikan email unik dan seluruh sel wajib terisi.
          </Alert>
        </Box>
        {importSuccess ? (
          <Box
            sx={{
              py: 8,
              textAlign: 'center'
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                bgcolor: 'success.main',
                color: 'common.white'
              }}
            >
              <i className='tabler-check text-3xl' />
            </Box>

            <Typography variant='h5' fontWeight={700}>
              Import Successful
            </Typography>

            <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
              {importResult?.succeeded.toLocaleString() ?? validRows.length.toLocaleString()} participants imported
              successfully.
            </Typography>

            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              Import status: {importResult?.status ?? 'COMPLETED'}
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3, flexWrap: 'wrap' }}>
              <Chip label={`${importResult?.succeeded ?? validRows.length} succeeded`} color='success' size='small' />
              <Chip label={`${importResult?.failed ?? 0} failed`} color='error' size='small' />
              <Chip label='INTERNAL · REGISTERED' color='primary' size='small' />
            </Box>

            {!!importResult?.errors.length && (
              <Alert severity='warning' sx={{ mt: 4, textAlign: 'left' }}>
                <Typography variant='subtitle2' sx={{ mb: 1 }}>
                  Row errors reported by the import
                </Typography>
                {importResult.errors.map((message, index) => (
                  <Typography key={`${message}-${index}`} variant='body2'>
                    {message}
                  </Typography>
                ))}
              </Alert>
            )}
          </Box>
        ) : (
          <>
            {isImporting && (
              <Alert severity='info' sx={{ mb: 3 }}>
                Import sedang diproses. Jangan tutup dialog atau mengirim file lagi.
                <LinearProgress sx={{ mt: 2 }} />
              </Alert>
            )}

            <InternalImportPackageSelector
              packages={packages}
              value={selectedPackageId}
              loading={packagesLoading}
              onChange={setSelectedPackageId}
            />

            {/* Upload area */}
            {rows.length === 0 && !isReading && (
              <Box>
                <Box
                  onClick={() => inputRef.current?.click()}
                  sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    minHeight: 220,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'border-color .2s ease',
                    marginTop: '12px',
                    '&:hover': {
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  <Box>
                    <i className='tabler-file-spreadsheet text-5xl' />

                    <Typography variant='h6' fontWeight={600} sx={{ mt: 2 }}>
                      Upload Excel File
                    </Typography>

                    <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                      Click to browse official .xlsx file
                    </Typography>

                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 2 }}>
                      Required columns: Nama Lengkap, Email Perusahaan, Nomor Telepon, Nomor Pegawai, Nama Perusahaan,
                      Posisi / Divisi
                    </Typography>
                  </Box>
                </Box>

                <input ref={inputRef} hidden type='file' accept='.xlsx' onChange={handleFileChange} />
              </Box>
            )}

            {isReading && (
              <Box sx={{ py: 8 }}>
                <Typography variant='body1' textAlign='center' fontWeight={600} sx={{ mb: 3 }}>
                  Reading Excel file...
                </Typography>

                <LinearProgress />
              </Box>
            )}

            {error && (
              <Alert severity='error' sx={{ mt: rows.length > 0 ? 0 : 4 }}>
                {error}
                {!!importResult?.errors.length && (
                  <Box sx={{ mt: 1 }}>
                    {importResult.errors.slice(0, 20).map((message, index) => (
                      <Typography key={index} variant='body2'>{message}</Typography>
                    ))}
                  </Box>
                )}
              </Alert>
            )}

            {/* Preview */}
            {rows.length > 0 && !isReading && (
              <Box>
                <Alert severity={invalidRows.length === 0 ? 'success' : 'error'} sx={{ mb: 3 }}>
                  {invalidRows.length > 0
                    ? `Validasi gagal: ${invalidRows.length} row harus diperbaiki. Tidak ada peserta yang akan diimport.`
                    : `Validasi awal selesai: ${validRows.length} row siap dikirim ke Backend untuk pemeriksaan akhir.`}
                </Alert>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: {
                      xs: 'flex-start',
                      md: 'center'
                    },
                    justifyContent: 'space-between',
                    flexDirection: {
                      xs: 'column',
                      md: 'row'
                    },
                    gap: 2,
                    mb: 4
                  }}
                >
                  <Box>
                    <Typography variant='h6' fontWeight={600}>
                      Import Preview
                    </Typography>

                    <Typography variant='body2' color='text.secondary'>
                      {fileName}
                    </Typography>
                  </Box>

                  <Box className='flex flex-wrap gap-2'>
                    <Chip color='success' variant='tonal' label={`${validRows.length} Valid`} />

                    <Chip color='error' variant='tonal' label={`${invalidRows.length} Invalid`} />

                    <Chip color='primary' variant='tonal' label={`${rows.length} Total`} />
                  </Box>
                </Box>

                {invalidRows.length > 0 && (
                  <Alert severity='warning' sx={{ mb: 4 }}>
                    {invalidRows.length} row memiliki kesalahan. Perbaiki semua baris sebelum import; Backend menolak batch yang tidak valid.
                  </Alert>
                )}

                <TableContainer component={Paper} variant='outlined' sx={{ maxHeight: 420 }}>
                  <Table stickyHeader size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Nama Lengkap</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>No. Pegawai</TableCell>
                        <TableCell>Perusahaan</TableCell>
                        <TableCell>Posisi / Divisi</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {rows.map(row => (
                        <TableRow key={row.rowNumber} hover>
                          <TableCell>{row.rowNumber}</TableCell>

                          <TableCell>
                            <Typography variant='body2' fontWeight={600}>
                              {row.fullName || '-'}
                            </Typography>
                          </TableCell>

                          <TableCell>{row.email || '-'}</TableCell>

                          <TableCell>{row.nip || '-'}</TableCell>

                          <TableCell>{row.organization || '-'}</TableCell>

                          <TableCell>{row.position || '-'}</TableCell>

                          <TableCell>
                            {row.errors.length === 0 ? (
                              <Chip size='small' color='success' variant='tonal' label='Valid' />
                            ) : (
                              <Box>
                                <Chip size='small' color='error' variant='tonal' label='Invalid' />

                                <Typography
                                  variant='caption'
                                  color='error'
                                  sx={{
                                    display: 'block',
                                    mt: 1
                                  }}
                                >
                                  {row.errors.join(', ')}
                                </Typography>
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant='outlined' onClick={handleClose} disabled={isReading || isImporting} sx={{ borderRadius: 0 }}>
          {importSuccess ? 'Close' : 'Cancel'}
        </Button>

        {!importSuccess && rows.length > 0 && (
          <Button
            variant='contained'
            onClick={handleImport}
            disabled={isReading || isImporting || invalidRows.length > 0 || validRows.length === 0 || !selectedPackageId || packagesLoading}
            startIcon={
              isImporting ? <i className='tabler-loader-2 animate-spin' /> : <i className='tabler-file-import' />
            }
            sx={{ borderRadius: 0 }}
          >
            {isImporting ? 'Importing...' : `Import ${validRows.length} Participants`}
          </Button>
        )}
      </DialogActions>

      <Dialog open={confirmOpen} onClose={() => !isImporting && setConfirmOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Konfirmasi import</DialogTitle>
        <DialogContent>
          <Typography variant='body2'>
            Import {validRows.length} peserta valid ke package yang dipilih? Semua peserta akan dikirim sebagai INTERNAL
            dengan status REGISTERED.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={isImporting}>
            Batal
          </Button>
          <Button variant='contained' onClick={confirmImport} disabled={isImporting}>
            Konfirmasi Import
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}

export default ImportExcelDialog
