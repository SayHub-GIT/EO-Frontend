import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const verticalToggle = () => readFileSync('src/components/layout/vertical/NavToggle.tsx', 'utf8')
const horizontalToggle = () => readFileSync('src/components/layout/horizontal/NavToggle.tsx', 'utf8')
const users = () => readFileSync('src/app/(dashboard)/admin/users/page.tsx', 'utf8')
const roles = () => readFileSync('src/app/(dashboard)/admin/roles/page.tsx', 'utf8')

test('vertical mobile menu button is keyboard-operable and state labeled', () => {
  const source = verticalToggle()
  assert.match(source, /import IconButton from '@mui\/material\/IconButton'/)
  assert.match(source, /<IconButton/)
  assert.match(source, /aria-label=\{isToggled \? 'Tutup menu navigasi' : 'Buka menu navigasi'\}/)
  assert.match(source, /aria-expanded=\{Boolean\(isToggled\)\}/)
  assert.match(source, /onClick=\{\(\) => toggleVerticalNav\(\)\}/)
  assert.match(source, /if \(!isBreakpointReached\) return null/)
  assert.match(source, /minWidth: 44, minHeight: 44/)
  assert.match(source, /aria-hidden='true'/)
  assert.doesNotMatch(source, /<i[^>]*onClick/)
})

test('horizontal mobile menu uses the same accessible toggle and breakpoint', () => {
  const source = horizontalToggle()
  assert.match(source, /import IconButton from '@mui\/material\/IconButton'/)
  assert.match(source, /useHorizontalNav\(\)/)
  assert.match(source, /<IconButton/)
  assert.match(source, /aria-expanded=\{Boolean\(isToggled\)\}/)
  assert.match(source, /aria-label=\{isToggled \? 'Tutup menu navigasi' : 'Buka menu navigasi'\}/)
  assert.match(source, /onClick=\{\(\) => toggleVerticalNav\(\)\}/)
  assert.doesNotMatch(source, /<i[^>]*onClick/)
})

test('Users horizontal table region can be focused and scrolled with a keyboard', () => {
  const source = users()
  assert.match(source, /role='region' aria-label='Tabel pengguna, dapat digulir horizontal' tabIndex=\{0\}/)
  assert.match(source, /overflowX: 'auto'/)
  assert.match(source, /&:focus-visible/)
  assert.match(source, /component='table' aria-label='Daftar pengguna sistem'/)
})

test('Users table has column headers and a row header per account', () => {
  const source = users()
  assert.match(source, /component='th' scope='col'/)
  assert.match(source, /component='th' scope='row'/)
  assert.match(source, /overflowWrap: 'anywhere'/)
})

test('Users actions identify their target without relaxing RBAC restrictions', () => {
  const source = users()
  assert.match(source, /aria-label=\{\x60Edit akun \$\{user\.fullName\}\x60\}/)
  assert.match(source, /aria-label=\{\x60Hapus akun \$\{user\.fullName\}\x60\}/)
  assert.match(source, /disabled=\{!updateAccess\.allowed\}/)
  assert.match(source, /disabled=\{!deleteAccess\.allowed \|\| user\.id === currentSession\?\.userId\}/)
  assert.match(source, /minHeight: 44/)
})

test('Users mobile filters wrap without enforcing a 180px minimum per field', () => {
  const source = users()
  assert.match(source, /width: \{ xs: '100%', sm: 220 \}/)
  assert.match(source, /minWidth: \{ xs: 0, sm: 180 \}/)
  assert.match(source, /aria-labelledby='user-form-dialog-title'/)
  assert.match(source, /DialogTitle id='user-form-dialog-title'/)
})

test('Roles event selectors and role cards tolerate narrow viewports and long names', () => {
  const source = roles()
  assert.equal(source.split("minWidth: { xs: 0, sm: 210 }").length - 1, 2)
  assert.match(source, /<Card key=\{role\.id\} variant='outlined' sx=\{\{ minWidth: 0 \}\}>/)
  assert.match(source, /overflowWrap: 'anywhere'/)
  assert.match(source, /flexWrap: 'wrap', minWidth: 0/)
})

test('Roles actions are individually announced and permission-gated', () => {
  const source = roles()
  assert.match(source, /aria-label=\{\x60\$\{role\.isSystem \? 'Lihat izin' : 'Edit role'\} \$\{role\.name\}\x60\}/)
  assert.match(source, /aria-label=\{\x60Hapus role \$\{role\.name\}\x60\}/)
  assert.match(source, /disabled=\{!role\.isSystem && !manageAccess\.allowed\}/)
  assert.match(source, /disabled=\{!manageAccess\.allowed\}/)
  assert.match(source, /aria-labelledby='role-form-dialog-title'/)
  assert.match(source, /DialogTitle id='role-form-dialog-title'/)
})
