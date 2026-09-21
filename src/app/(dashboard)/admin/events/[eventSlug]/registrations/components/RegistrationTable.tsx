'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import ConfirmActionDialog from '@/components/feedback/ConfirmActionDialog'

import type { Registration } from '../types'

type Props = {
  registrations: Registration[]
  loading?: boolean
  onCancel?: (registrationId: string) => Promise<void>
}

const RegistrationTable = ({ registrations, loading = false, onCancel }: Props) => {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Registration | null>(null)
  const actionLockRef = useRef(false)

  useEffect(() => setPage(0), [registrations])

  const paginatedRegistrations = useMemo(() => {
    const start = page * rowsPerPage
    return registrations.slice(start, start + rowsPerPage)
  }, [page, rowsPerPage, registrations])

  const getStatusColor = (status: Registration['status']) => {
    if (status === 'REGISTERED') return 'success'
    if (status === 'CHECKED_IN') return 'info'
    if (status === 'PENDING') return 'warning'
    if (status === 'CANCELLED') return 'error'
    return 'default'
  }

  return (
    <Card elevation={0}>
      <CardContent sx={{ p: 0 }}>
        <TableContainer>
          <Table sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell>Participant</TableCell>
                <TableCell>Organization</TableCell>
                <TableCell>Package</TableCell>
                <TableCell>NIP</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Booking Code</TableCell>
                <TableCell>Registered At</TableCell>
                <TableCell align='right'>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Box sx={{ py: 12, textAlign: 'center' }}>
                      <i className='tabler-loader-2 text-4xl animate-spin' />
                      <Typography variant='h6' sx={{ mt: 2 }}>Loading participants...</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : paginatedRegistrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Box sx={{ py: 12, textAlign: 'center' }}>
                      <i className='tabler-users-off text-4xl' />
                      <Typography variant='h6' sx={{ mt: 2 }}>No participants found</Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>Try changing your search or filters.</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRegistrations.map(registration => (
                  <TableRow hover key={registration.id}>
                    <TableCell>
                      <Typography variant='body2' fontWeight={600}>{registration.fullName}</Typography>
                      <Typography variant='caption' color='text.secondary'>{registration.email}</Typography>
                    </TableCell>
                    <TableCell><Typography variant='body2'>{registration.organization || '-'}</Typography></TableCell>
                    <TableCell><Typography variant='body2'>{registration.eventPackageName || '-'}</Typography></TableCell>
                    <TableCell><Typography variant='body2'>{registration.nip || registration.employeeNumber || '-'}</Typography></TableCell>
                    <TableCell>
                      <Chip size='small' variant='tonal' color={registration.participantType === 'INTERNAL' ? 'primary' : 'secondary'} label={registration.participantType} />
                    </TableCell>
                    <TableCell>
                      <Chip size='small' variant='tonal' color={getStatusColor(registration.status)} label={registration.status.replace('_', ' ')} />
                    </TableCell>
                    <TableCell><Typography variant='body2' fontWeight={500}>{registration.bookingCode}</Typography></TableCell>
                    <TableCell>
                      <Typography variant='body2'>
                        {new Date(registration.registeredAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Tooltip title={onCancel ? 'Cancel registration' : 'Archived event is read-only'}>
                        <span>
                          <IconButton
                            size='small'
                            aria-label='Cancel registration'
                            disabled={!onCancel || actionLoadingId === registration.id || registration.status === 'CANCELLED'}
                            onClick={() => {
                              if (!onCancel || registration.status === 'CANCELLED') return
                              setCancelTarget(registration)
                            }}
                          >
                            <i className='tabler-x' />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {!loading && (
          <TablePagination
            component='div'
            count={registrations.length}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={event => {
              setRowsPerPage(Number(event.target.value))
              setPage(0)
            }}
          />
        )}
      </CardContent>

      <ConfirmActionDialog
        open={Boolean(cancelTarget)}
        title='Cancel registration?'
        description='This registration will be moved to Cancelled status. The participant will no longer count as an active registration.'
        confirmLabel='Confirm Cancel'
        loading={Boolean(cancelTarget && actionLoadingId === cancelTarget.id)}
        onClose={() => {
          if (!actionLoadingId) setCancelTarget(null)
        }}
        onConfirm={async () => {
          if (!cancelTarget || !onCancel || actionLoadingId || actionLockRef.current) return

          actionLockRef.current = true

          try {
            setActionLoadingId(cancelTarget.id)
            await onCancel(cancelTarget.id)
            setCancelTarget(null)
          } finally {
            setActionLoadingId(null)
            actionLockRef.current = false
          }
        }}
        details={cancelTarget ? [
          { label: 'Participant', value: cancelTarget.fullName },
          { label: 'Email', value: cancelTarget.email || '-' },
          { label: 'Booking code', value: cancelTarget.bookingCode || '-' },
          { label: 'Current status', value: cancelTarget.status.replace('_', ' ') }
        ] : []}
        warning='Cancellation is an operational status change. Deleting a registration, when supported by the backend, must remain a separate confirmed action.'
      />
    </Card>
  )
}

export default RegistrationTable
