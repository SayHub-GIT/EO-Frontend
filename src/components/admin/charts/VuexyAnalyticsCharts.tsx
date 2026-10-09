'use client'

import { useEffect, useRef } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import type { DashboardTrendDay } from '@/lib/dashboard-analytics'

type ChartHandle = { destroy: () => void }

const shortDate = (day: string): string =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${day}T00:00:00Z`))

type RegistrationChartProps = {
  days: DashboardTrendDay[]
  mode: 'registrations' | 'internal' | 'external'
  period: 7 | 30 | 90
}

export function VuexyRegistrationChart({ days, mode, period }: RegistrationChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const theme = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context) return

    let disposed = false
    let chart: ChartHandle | undefined

    void import('chart.js/auto').then(({ default: ChartJS }) => {
      if (disposed) return

      const color = mode === 'external'
        ? theme.palette.info.main
        : mode === 'internal'
          ? theme.palette.success.main
          : theme.palette.primary.main

      const gradient = context.createLinearGradient(0, 0, 0, 250)
      gradient.addColorStop(0, alpha(color, theme.palette.mode === 'dark' ? 0.36 : 0.22))
      gradient.addColorStop(1, alpha(color, 0))

      chart = new ChartJS(context, {
        type: 'line',
        data: {
          labels: days.map(day => shortDate(day.date)),
          datasets: [{
            label: mode === 'registrations' ? 'Total pendaftaran' : mode === 'internal' ? 'Internal' : 'Eksternal',
            data: days.map(day => day[mode]),
            borderColor: color,
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            pointHoverBackgroundColor: color,
            pointHoverBorderColor: theme.palette.background.paper
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 220 },
          interaction: { mode: 'index', intersect: false },
          layout: { padding: { top: 12, right: 8 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: theme.palette.background.paper,
              titleColor: theme.palette.text.primary,
              bodyColor: theme.palette.text.secondary,
              borderColor: theme.palette.divider,
              borderWidth: 1,
              padding: 12,
              displayColors: false,
              callbacks: {
                label: item => `${item.dataset.label}: ${Number(item.parsed.y ?? 0).toLocaleString('id-ID')}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                color: theme.palette.text.secondary,
                maxTicksLimit: period === 90 ? 7 : 6,
                maxRotation: 0,
                font: { family: theme.typography.fontFamily, size: 11 }
              }
            },
            y: {
              beginAtZero: true,
              border: { display: false, dash: [4, 4] },
              grid: { color: alpha(theme.palette.divider, 0.65), drawTicks: false },
              ticks: {
                color: theme.palette.text.secondary,
                padding: 12,
                precision: 0,
                font: { family: theme.typography.fontFamily, size: 11 }
              }
            }
          }
        }
      })
    }).catch(() => {
      // Keep the empty state visible if the chart library cannot be loaded.
    })

    return () => {
      disposed = true
      chart?.destroy()
    }
  }, [days, mode, period, theme])

  return (
    <Box sx={{ position: 'relative', width: '100%', height: { xs: 220, sm: 250 }, mt: 2 }}>
      {days.length === 0 && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <Typography variant='body2' color='text.secondary'>Belum ada data pendaftaran pada periode ini.</Typography>
        </Box>
      )}
      <canvas
        ref={canvasRef}
        role='img'
        aria-label={`Grafik tren pendaftaran ${period} hari terakhir, kategori ${mode}`}
      />
    </Box>
  )
}

type DoughnutProps = {
  firstValue: number
  secondValue: number
  firstLabel: string
  secondLabel: string
  firstTone?: 'primary' | 'success'
  secondTone?: 'info' | 'muted'
  centerValue: string
  centerCaption?: string
  ariaLabel: string
  size?: number
}

export function VuexyDoughnutChart({
  firstValue,
  secondValue,
  firstLabel,
  secondLabel,
  firstTone = 'primary',
  secondTone = 'info',
  centerValue,
  centerCaption,
  ariaLabel,
  size = 150
}: DoughnutProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const theme = useTheme()

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    let disposed = false
    let chart: ChartHandle | undefined
    const empty = firstValue + secondValue === 0

    void import('chart.js/auto').then(({ default: ChartJS }) => {
      if (disposed) return

      chart = new ChartJS(context, {
        type: 'doughnut',
        data: {
          labels: empty ? ['Belum ada data'] : [firstLabel, secondLabel],
          datasets: [{
            data: empty ? [1] : [firstValue, secondValue],
            backgroundColor: empty
              ? [theme.palette.action.hover]
              : [theme.palette[firstTone].main, secondTone === 'muted' ? theme.palette.action.hover : theme.palette.info.main],
            borderWidth: 0,
            spacing: empty ? 0 : 2,
            hoverOffset: empty ? 0 : 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '78%',
          animation: { duration: 220 },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: !empty,
              backgroundColor: theme.palette.background.paper,
              titleColor: theme.palette.text.primary,
              bodyColor: theme.palette.text.secondary,
              borderColor: theme.palette.divider,
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: item => `${item.label}: ${Number(item.parsed).toLocaleString('id-ID')}`
              }
            }
          }
        }
      })
    }).catch(() => {
      // The data labels remain available when chart rendering is unavailable.
    })

    return () => {
      disposed = true
      chart?.destroy()
    }
  }, [firstValue, secondValue, firstLabel, secondLabel, firstTone, secondTone, theme])

  return (
    <Box role='img' aria-label={ariaLabel} sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <canvas ref={canvasRef} aria-hidden='true' />
      <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
        <Box sx={{ textAlign: 'center', px: 1 }}>
          <Typography variant='h5' fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{centerValue}</Typography>
          {centerCaption && <Typography variant='caption' color='text.secondary'>{centerCaption}</Typography>}
        </Box>
      </Box>
    </Box>
  )
}
