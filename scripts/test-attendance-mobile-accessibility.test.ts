import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  attendancePaginationActionLabel,
  attendancePhotoActionLabel
} from '../src/lib/attendance-accessibility'

const attendancePage = () => readFileSync('src/app/(dashboard)/admin/events/[eventSlug]/attendance/page.tsx', 'utf8')
const photoDialog = () => readFileSync('src/components/attendance/PrivateAttendancePhotoDialog.tsx', 'utf8')

test('pagination buttons announce destination, not only an unlabeled arrow', () => {
  assert.equal(attendancePaginationActionLabel('first'), 'Ke halaman pertama')
  assert.equal(attendancePaginationActionLabel('last'), 'Ke halaman terakhir')
  assert.equal(attendancePaginationActionLabel('next'), 'Ke halaman berikutnya')
  assert.equal(attendancePaginationActionLabel('previous'), 'Ke halaman sebelumnya')
})

test('photo actions identify the person for keyboard and screen reader users', () => {
  assert.equal(attendancePhotoActionLabel(' Budi Santoso '), 'Lihat foto Check-In Budi Santoso')
  assert.equal(attendancePhotoActionLabel(''), 'Lihat foto Check-In peserta')
})

test('attendance statistics use a single column at narrow phone widths', () => {
  const page = attendancePage()
  assert.match(page, /gridTemplateColumns: \{ xs: 'minmax\(0, 1fr\)', sm: 'repeat\(2, minmax\(0, 1fr\)\)', lg: 'repeat\(4, minmax\(0, 1fr\)\)' \}/)
  assert.match(page, /<Card key=\{card\.label\} variant='outlined' sx=\{\{ minWidth: 0 \}\}>/)
})

test('mobile attendance records use named articles rather than unlabeled divs', () => {
  const page = attendancePage()
  assert.match(page, /<Stack component='section' aria-label='Daftar kehadiran ringkas'/)
  assert.match(page, /<Box component='article' aria-label=\{\x60Kehadiran \$\{row\.fullName\}\x60\}/)
  assert.match(page, /overflowWrap: 'anywhere'/)
  assert.match(page, /role='status' aria-live='polite'/)
})

test('desktop and mobile photo controls announce names and have adequate touch targets', () => {
  const page = attendancePage()
  assert.equal(page.split('aria-label={attendancePhotoActionLabel(row.fullName)}').length - 1, 2)
  assert.equal(page.split('Foto belum tersedia').length - 1, 2)
  assert.equal(page.split('row.checkedInAtUtc ? (').length - 1, 2)
  assert.equal(page.split('minHeight: 44').length - 1, 2)
  assert.match(page, /usePermissionAccess\('attendance\.read'\)/)
  assert.match(page, /photoTarget\.eventId\.toLowerCase\(\) === eventId\.toLowerCase\(\) && access\.allowed/)
})

test('attendance pagination wraps on small screens with accessible actions', () => {
  const page = attendancePage()
  assert.match(page, /getItemAriaLabel=\{attendancePaginationActionLabel\}/)
  assert.match(page, /flexWrap: 'wrap', justifyContent: \{ xs: 'center', sm: 'flex-end' \}/)
  assert.match(page, /'\.MuiTablePagination-spacer': \{ display: \{ xs: 'none', sm: 'block' \} \}/)
  assert.match(page, /labelRowsPerPage='Peserta per halaman'/)
  assert.match(page, /onPageChange=\{\(_, newPage\) => changeFilters\(\{ page: newPage \+ 1 \}\)\}/)
})

test('private photo dialog has participant context, announced errors and accessible actions', () => {
  const dialog = photoDialog()
  assert.match(dialog, /aria-labelledby='attendance-photo-title' aria-describedby='attendance-photo-description'/)
  assert.match(dialog, /id='attendance-photo-description'/)
  assert.match(dialog, /role='status' aria-live='polite'/)
  assert.match(dialog, /role='alert'/)
  assert.equal(dialog.split('minHeight: 44').length - 1, 2)
  assert.match(dialog, /URL\.revokeObjectURL\(objectUrl\)/)
  assert.match(dialog, /controller\.abort\(\)/)
  assert.doesNotMatch(dialog, /localStorage|sessionStorage|window\.open\(/)
})
