'use client'

import type { CSSProperties } from 'react'

import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'

const CompactBrandMark = () => (
  <svg
    viewBox='0 0 76 76'
    width='42'
    height='42'
    role='img'
    aria-label='PTC Event Organizer'
    style={{ display: 'block' }}

  >
    <defs>
      <linearGradient id='ptc-blue' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stopColor='#0b4f8a' />
        <stop offset='100%' stopColor='#0b78b8' />
      </linearGradient>
      <linearGradient id='ptc-teal' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stopColor='#16a7a3' />
        <stop offset='100%' stopColor='#00c1b5' />
      </linearGradient>
    </defs>

    <path
      d='M8 58 15 19c1.2-6.8 5.1-10.2 11.8-10.2h19.8c8.4 0 13.9 4.7 12.2 12.1-1.6 7.1-6.8 11.7-14.8 11.7H29.7l-2.3 12.1h13.8c4.7 0 8.4-1.2 11.7-3.6-4.9 8.7-12.7 13.1-23.3 13.1H20l-.7 3.8c-.5 2.8-2.1 4.2-4.9 4.2H9.2c-1.3 0-1.6-.7-1.2-2.2Z'
      fill='url(#ptc-blue)'
    />
    <path
      d='M28.6 45.8c2.3-5.2 6.6-8.2 12.7-8.2h24.3c2.4 0 3.4 1 2.9 2.9l-.5 2.2c-.7 3-2.6 4.5-5.7 4.5H45.2c-3.4 0-5.7 1.4-6.8 4.1h23.2c2.3 0 3.2 1.1 2.8 3.1l-.3 1.5c-.6 2.8-2.5 4.2-5.5 4.2H37.7c-4.6 0-7.8-1.5-9.5-4.5-1.7-3-1.6-6.2.4-9.8Z'
      fill='url(#ptc-teal)'
    />
    <path d='M56.8 9.8 60 20l-6.5-7.2Z' fill='#f7b52c' />
    <path d='M64.1 8.5 64 20.4l4.7-11.2Z' fill='#14b8ad' />
    <path d='M69.4 15.6 64.8 23l8.8-4.1Z' fill='#ff4b55' />
    <circle cx='69.2' cy='27.8' r='2.4' fill='#18aaa5' />
    <circle cx='64.4' cy='31.8' r='1.6' fill='#ff4b55' />
  </svg>
)

const Logo = (_props: { color?: CSSProperties['color'] }) => {
  void _props

  const { isHovered, isBreakpointReached } = useVerticalNav()
  const { settings } = useSettings()

  const compact = settings.layout === 'collapsed' && !isHovered && !isBreakpointReached

  return (
    <div className='flex items-center'>
      {compact ? (
        <CompactBrandMark />
      ) : (
        <img src='/EO Navbar.png' alt='PTC Event Organizer' className='h-8 w-auto object-contain' />
      )}
    </div>
  )
}

export default Logo
