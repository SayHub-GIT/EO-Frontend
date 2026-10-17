'use client'

import IconButton from '@mui/material/IconButton'

import useVerticalNav from '@menu/hooks/useVerticalNav'
import useHorizontalNav from '@menu/hooks/useHorizontalNav'

const NavToggle = () => {
  const { toggleVerticalNav, isToggled } = useVerticalNav()
  const { isBreakpointReached } = useHorizontalNav()

  if (!isBreakpointReached) return null

  return (
    <IconButton
      edge='start'
      color='inherit'
      aria-label={isToggled ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
      aria-expanded={Boolean(isToggled)}
      onClick={() => toggleVerticalNav()}
      sx={{ minWidth: 44, minHeight: 44 }}
    >
      <i className='tabler-menu-2' aria-hidden='true' />
    </IconButton>
  )
}

export default NavToggle
