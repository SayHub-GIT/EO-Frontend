'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import NextLink from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { getAdminEvent, getEventAttendanceMetrics, type AdminEvent, type EventAttendanceMetrics } from '@/lib/admin-events'
import { formatAttendanceUtc } from '@/lib/attendance-list'
import { getEventAttendanceRecords } from '@/lib/attendance-records'
import { type AttendanceRecord, type AttendanceRecordsPage } from '@/lib/attendance-records-contract'
import { buildAttendancePageQuery, parseAttendancePageFilters, toAttendanceRecordsFilters, type AttendancePageFilters } from '@/lib/attendance-records-url'
import { getEventPackages, type EventPackage } from '../registrations/services/registration.api'
import { usePermissionAccess } from '@/hooks/usePermissionAccess'

const attendanceLabel = (status: AttendanceRecord['attendanceStatus']): string =>
  status === 'REGISTERED' ? 'Terdaftar' : status === 'CHECK IN' ? 'Check-In' : 'Check-Out'

const statusTone = (status: AttendanceRecord['attendanceStatus']): 'success' | 'info' | 'warning' =>
  status === 'CHECK OUT' ? 'success' : status === 'CHECK IN' ? 'info' : 'warning'

const checkInMethodLabel = (method: AttendanceRecord['checkInMethod']): string => {
  if (method === 1 || String(method).toLowerCase() === 'qr') return 'QR'
  if (method === 2 || String(method).toLowerCase() === 'manual') return 'Manual'
  return 'Tidak tercatat'
}

const AttendanceRowInfo = ({ row }: { row: AttendanceRecord }) => (
  <Stack spacing={0.75}>
    <Typography variant='body2' fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{row.fullName}</Typography>
    <Typography variant='caption' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>{row.bookingCode}</Typography>
  </Stack>
)

const AttendanceListContent = () => {
  const params = useParams<{ eventSlug: string }>()
  const eventId = params.eventSlug
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryString = searchParams.toString()
  const filters = useMemo(() => parseAttendancePageFilters(new URLSearchParams(queryString)), [queryString])
  const [searchInput, setSearchInput] = useState(filters.search)
  const access = usePermissionAccess('attendance.read')
  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [metrics, setMetrics] = useState<EventAttendanceMetrics | null>(null)
  const [metricsError, setMetricsError] = useState('')
  const [listing, setListing] = useState<AttendanceRecordsPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [eventPackages, setEventPackages] = useState<EventPackage[]>([])
  const [packageError, setPackageError] = useState('')

  const changeFilters = (changes: Partial<AttendancePageFilters>, replace = false) => {
    const nextQuery = buildAttendancePageQuery({ ...filters, ...changes }).toString()
    if (nextQuery === queryString) return
    const nextUrl = `${pathname}?${nextQuery}`
    if (replace) router.replace(nextUrl, { scroll: false })
    else router.push(nextUrl, { scroll: false })
  }

  useEffect(() => setSearchInput(filters.search), [filters.search])

  useEffect(() => {
    const value = searchInput.trim().slice(0, 200)
    if (value === filters.search) return

    const delay = window.setTimeout(() => {
      const nextQuery = buildAttendancePageQuery({ ...filters, search: value, page: 1 }).toString()
      router.replace(`${pathname}?${nextQuery}`, { scroll: false })
    }, 350)

    return () => window.clearTimeout(delay)
  }, [searchInput, filters, pathname, router])

  useEffect(() => {
    if (!access.resolved || !access.allowed || !eventId) {
      setLoading(false)
      setEvent(null)
      setMetrics(null)
      setListing(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError('')
    setListing(null)
    setMetrics(null)
    setMetricsError('')

    void getEventAttendanceRecords(eventId, toAttendanceRecordsFilters(filters), controller.signal)
      .then(value => {
        if (controller.signal.aborted) return
        const lastPage = Math.max(1, Math.ceil(value.total / filters.pageSize))

        if (filters.page > lastPage) {
          const nextQuery = buildAttendancePageQuery({ ...filters, page: lastPage }).toString()
          router.replace(`${pathname}?${nextQuery}`, { scroll: false })
          return
        }

        setListing(value)
      })
      .catch(cause => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Daftar gagal dimuat.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })

    void getAdminEvent(eventId)
      .then(value => { if (!controller.signal.aborted) setEvent(value) })
      .catch(() => { if (!controller.signal.aborted) setEvent(null) })

    void getEventAttendanceMetrics(eventId)
      .then(value => { if (!controller.signal.aborted) setMetrics(value.eventId === eventId ? value : null) })
      .catch(() => { if (!controller.signal.aborted) setMetricsError('Statistik tidak dapat dimuat saat ini.') })

    return () => controller.abort()
  }, [eventId, access.resolved, access.allowed, filters, pathname, router, reload])

  useEffect(() => {
    if (!access.resolved || !access.allowed || !eventId) {
      setEventPackages([])
      setPackageError('')
      return
    }

    let active = true
    setEventPackages([])
    setPackageError('')

    void getEventPackages(eventId)
      .then(value => { if (active) setEventPackages(value) })
      .catch(() => {
        if (active) setPackageError('Pilihan paket tidak tersedia untuk izin akun ini. Filter lainnya tetap dapat digunakan.')
      })

    return () => { active = false }
  }, [eventId, access.resolved, access.allowed])

  const cards = [
    { label: 'Peserta aktif', value: metrics?.totalParticipants },
    { label: 'Sudah Check-In', value: metrics?.checkedIn },
    { label: 'Sudah Check-Out', value: metrics?.checkedOut },
    { label: 'Sedang di lokasi', value: metrics?.currentlyOnSite }
  ]

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Box>
          <Typography variant='h4' fontWeight={750}>List Attendance</Typography>
          <Typography color='text.secondary' sx={{ mt: 0.75, overflowWrap: 'anywhere' }}>
            {event?.name || 'Daftar kehadiran per event'}
          </Typography>
        </Box>
        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
          <Button variant='outlined' component={NextLink} href={`/admin/events/${encodeURIComponent(eventId)}/dashboard`}>
            Kembali ke Event
          </Button>
          <Button variant='contained' disabled={!access.allowed || loading}
            onClick={() => setReload(value => value + 1)}>
            Muat ulang
          </Button>
        </Stack>
      </Box>

      {access.resolved && !access.allowed ? (
        <Alert severity='warning'>Akun ini belum memiliki izin melihat data kehadiran event.</Alert>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 2 }}>
            {cards.map(card => (
              <Card key={card.label} variant='outlined'>
                <CardContent sx={{ display: 'grid', gap: 1, p: { xs: 2, sm: 2.5 } }}>
                  <Typography variant='body2' color='text.secondary'>{card.label}</Typography>
                  <Typography variant='h5' fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {card.value === undefined ? '—' : card.value.toLocaleString('id-ID')}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Card variant='outlined'>
            <CardContent sx={{ p: { xs: 2, md: 2.5 }, display: 'grid', gap: 2 }}>
              <Box>
                <Typography variant='subtitle1' fontWeight={700}>Cari dan urutkan peserta</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Pencarian dan filter diterapkan oleh server ke seluruh peserta event, bukan hanya halaman yang terlihat.
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2, minmax(0,1fr))', lg: '2fr 1fr 1fr 1fr' }, gap: 1.5 }}>
                <TextField size='small' fullWidth label='Nama, email, atau kode booking'
                  value={searchInput} onChange={e => setSearchInput(e.target.value)}
                  inputProps={{ maxLength: 200 }}
                />
                <TextField select size='small' fullWidth label='Jenis peserta' value={filters.participantType}
                  onChange={e => changeFilters({ participantType: e.target.value as AttendancePageFilters['participantType'], page: 1 })}>
                  <MenuItem value=''>Semua jenis</MenuItem>
                  <MenuItem value='Internal'>Internal</MenuItem>
                  <MenuItem value='External'>Eksternal</MenuItem>
                </TextField>
                <TextField select size='small' fullWidth label='Paket event' value={filters.eventPackageId}
                  disabled={Boolean(packageError) || eventPackages.length === 0}
                  onChange={e => changeFilters({ eventPackageId: e.target.value, page: 1 })}>
                  <MenuItem value=''>Semua paket</MenuItem>
                  {eventPackages.map(pkg => <MenuItem key={pkg.id} value={pkg.id.toLowerCase()}>{pkg.name}</MenuItem>)}
                  {filters.eventPackageId && !eventPackages.some(pkg => pkg.id.toLowerCase() === filters.eventPackageId) && (
                    <MenuItem value={filters.eventPackageId}>Paket dari tautan</MenuItem>
                  )}
                </TextField>
                <TextField select size='small' fullWidth label='Urutkan' value={`${filters.sort}:${filters.direction}`}
                  onChange={e => {
                    const value = e.target.value

                    const [sort, direction] = value.split(':') as [AttendancePageFilters['sort'], AttendancePageFilters['direction']]
                    changeFilters({ sort, direction, page: 1 })
                  }}>
                  <MenuItem value='registeredAt:desc'>Terbaru</MenuItem>
                  <MenuItem value='registeredAt:asc'>Terlama</MenuItem>
                  <MenuItem value='fullName:asc'>Nama A–Z</MenuItem>
                  <MenuItem value='fullName:desc'>Nama Z–A</MenuItem>
                  <MenuItem value='checkedInAt:desc'>Check-In terbaru</MenuItem>
                  <MenuItem value='checkedInAt:asc'>Check-In terlama</MenuItem>
                  <MenuItem value='checkedOutAt:desc'>Check-Out terbaru</MenuItem>
                  <MenuItem value='checkedOutAt:asc'>Check-Out terlama</MenuItem>
                </TextField>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2, minmax(0,1fr))' }, gap: 1.5 }}>
                <TextField select size='small' fullWidth label='Status kehadiran' value={filters.status}
                  onChange={e => changeFilters({ status: e.target.value as AttendancePageFilters['status'], page: 1 })}>
                  <MenuItem value=''>Semua status</MenuItem>
                  <MenuItem value='Registered'>Terdaftar</MenuItem>
                  <MenuItem value='CheckedIn'>Check-In</MenuItem>
                  <MenuItem value='CheckedOut'>Check-Out</MenuItem>
                </TextField>
                <TextField select size='small' fullWidth label='Metode Check-In' value={filters.method}
                  onChange={e => changeFilters({ method: e.target.value as AttendancePageFilters['method'], page: 1 })}>
                  <MenuItem value=''>Semua metode</MenuItem>
                  <MenuItem value='QR'>QR</MenuItem>
                  <MenuItem value='Manual'>Manual</MenuItem>
                </TextField>
              </Box>
              {packageError && <Typography variant='caption' color='text.secondary'>{packageError}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button size='small' variant='text' disabled={!searchInput && !filters.search && !filters.participantType && !filters.eventPackageId && !filters.status && !filters.method && filters.sort === 'registeredAt' && filters.direction === 'desc'}
                  onClick={() => { setSearchInput(''); changeFilters({ search: '', participantType: '', eventPackageId: '', status: '', method: '', sort: 'registeredAt', direction: 'desc', page: 1 }) }}>
                  Reset filter
                </Button>
              </Box>
            </CardContent>
          </Card>

          {metricsError && <Alert severity='info'>{metricsError}</Alert>}
          <Alert severity='info'>
            Daftar kehadiran dan statistik berasal dari server. Riwayat metode lama mungkin belum tercatat.
            Preview foto privat disediakan pada tahap berikutnya, bukan melalui tautan publik.
          </Alert>

          <Card variant='outlined'>
            {loading && <LinearProgress aria-label='Memuat daftar kehadiran' />}
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant='h6' fontWeight={700}>Peserta event</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                {listing ? `${listing.total.toLocaleString('id-ID')} peserta sesuai data server` : 'Memuat daftar peserta'}
              </Typography>
            </CardContent>

            {error ? (
              <Box sx={{ px: 3, pb: 3 }}>
                <Alert severity='error' action={<Button color='inherit' size='small' onClick={() => setReload(value => value + 1)}>Coba lagi</Button>}>
                  {error}
                </Alert>
              </Box>
            ) : loading ? (
              <Box sx={{ py: 6, textAlign: 'center' }} role='status'>
                <Typography color='text.secondary'>Memuat data peserta...</Typography>
              </Box>
            ) : listing?.items.length === 0 ? (
              <Box sx={{ py: 6, px: 3, textAlign: 'center' }} role='status'>
                <Typography fontWeight={600}>Belum ada peserta pada halaman ini</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>Coba periksa event atau muat ulang daftar.</Typography>
              </Box>
            ) : listing ? (
              <>
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  <TableContainer>
                    <Table aria-label='Daftar kehadiran peserta'>
                      <TableHead>
                        <TableRow>
                          <TableCell>Peserta / Booking</TableCell>
                          <TableCell>Paket</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Waktu Check-In</TableCell>
                          <TableCell>Waktu Check-Out</TableCell>
                          <TableCell>Metode</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {listing.items.map(row => (
                          <TableRow key={row.registrationId} hover>
                            <TableCell><AttendanceRowInfo row={row} /></TableCell>
                            <TableCell>{row.eventPackageName || 'Tanpa paket'}</TableCell>
                            <TableCell><Chip size='small' variant='tonal' color={statusTone(row.attendanceStatus)} label={attendanceLabel(row.attendanceStatus)} /></TableCell>
                            <TableCell>
                              <Typography variant='body2'>{formatAttendanceUtc(row.checkedInAtUtc)}</Typography>
                              {row.checkedInByName && <Typography variant='caption' color='text.secondary'>Oleh {row.checkedInByName}</Typography>}
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>{formatAttendanceUtc(row.checkedOutAtUtc)}</Typography>
                              {row.checkedOutByName && <Typography variant='caption' color='text.secondary'>Oleh {row.checkedOutByName}</Typography>}
                            </TableCell>
                            <TableCell>{checkInMethodLabel(row.checkInMethod)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
                <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' }, px: 2, pb: 2 }}>
                  {listing.items.map(row => (
                    <Box key={row.registrationId} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, display: 'grid', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <AttendanceRowInfo row={row} />
                        <Chip size='small' variant='tonal' color={statusTone(row.attendanceStatus)} label={attendanceLabel(row.attendanceStatus)} />
                      </Box>
                      <Typography variant='body2'>{row.eventPackageName || 'Tanpa paket'}</Typography>
                      <Box sx={{ display: 'grid', gap: 0.25 }}>
                        <Typography variant='caption' color='text.secondary'>Check-In</Typography>
                        <Typography variant='body2'>{formatAttendanceUtc(row.checkedInAtUtc)}</Typography>
                        {row.checkedInByName && <Typography variant='caption' color='text.secondary'>Oleh {row.checkedInByName}</Typography>}
                        <Typography variant='caption' color='text.secondary' sx={{ mt: 1 }}>Check-Out</Typography>
                        <Typography variant='body2'>{formatAttendanceUtc(row.checkedOutAtUtc)}</Typography>
                        {row.checkedOutByName && <Typography variant='caption' color='text.secondary'>Oleh {row.checkedOutByName}</Typography>}
                        <Typography variant='caption' color='text.secondary' sx={{ mt: 1 }}>Metode</Typography>
                        <Typography variant='body2'>{checkInMethodLabel(row.checkInMethod)}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </>
            ) : null}

            {listing && !error && (
              <TablePagination
                component='div'
                count={listing.total}
                page={filters.page - 1}
                onPageChange={(_, newPage) => changeFilters({ page: newPage + 1 })}
                rowsPerPage={filters.pageSize}
                rowsPerPageOptions={[10, 20, 50]}
                onRowsPerPageChange={event => {
                  changeFilters({ pageSize: Number(event.target.value) as AttendancePageFilters['pageSize'], page: 1 })
                }}
                labelRowsPerPage='Peserta per halaman'
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} dari ${count}`}
                sx={{ '.MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'flex-end', gap: 1, px: 2 } }}
              />
            )}
          </Card>
        </>
      )}
    </Box>
  )
}

const AttendanceListPage = () => (
  <Suspense fallback={<Box sx={{ p: 4 }} role='status'><Typography>Memuat halaman kehadiran...</Typography></Box>}>
    <AttendanceListContent />
  </Suspense>
)

export default AttendanceListPage
