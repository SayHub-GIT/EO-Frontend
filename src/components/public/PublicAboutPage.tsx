
'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

const values = [
  ['tabler-users-group', 'Kolaborasi', 'Membangun sinergi antara individu, komunitas, dan industri.'],
  ['tabler-heart', 'Keberlanjutan', 'Mendukung kegiatan yang berdampak positif bagi masyarakat dan lingkungan.'],
  ['tabler-bulb', 'Inovasi', 'Terus menghadirkan ide dan solusi baru dalam setiap acara.'],
  ['tabler-shield-check', 'Integritas', 'Menjaga kepercayaan melalui profesionalisme dan transparansi.']
]

const impacts = [
  ['tabler-calendar-event', '100+', 'Event Diselenggarakan', 'Dari berbagai kategori dan tema'],
  ['tabler-users-group', '500K+', 'Peserta', 'Tersebar di seluruh Indonesia'],
  ['tabler-building-community', '50+', 'Kota & Lokasi', 'Dari Sabang sampai Merauke'],
  ['tabler-star', '95%', 'Tingkat Kepuasan', 'Peserta terhadap penyelenggaraan event']
]

const PublicAboutPage = () => (
  <Box sx={{ bgcolor: 'background.default', color: 'text.primary' }}>
    <Box
      component='section'
      sx={{
        px: { xs: 2.5, sm: 3.5, lg: 4 },
        py: { xs: 5.5, md: 8 },
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1440,
          mx: 'auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(360px,.85fr) minmax(0,1.15fr)' },
          gap: { xs: 4.5, lg: 7 },
          alignItems: 'center'
        }}
      >
        <Box sx={{ maxWidth: 590 }}>
          <Typography
            sx={{
              color: '#00A7E1',
              fontSize: '0.72rem',
              fontWeight: 850,
              letterSpacing: '.08em'
            }}
          >
            ABOUT PERTAMINA EVENT
          </Typography>

          <Typography
            component='h1'
            sx={{
              mt: 1.8,
              maxWidth: 560,
              fontSize: { xs: '2.45rem', sm: '3.2rem', lg: '3.8rem' },
              lineHeight: 1.02,
              letterSpacing: '-.045em',
              fontWeight: 900
            }}
          >
            Lebih dari Sekadar Event, Ini Tentang Kebersamaan.
          </Typography>

          <Typography
            color='text.secondary'
            sx={{
              mt: 2,
              maxWidth: 560,
              fontSize: { xs: '0.96rem', md: '1.02rem' },
              lineHeight: 1.72
            }}
          >
            Pertamina Event hadir sebagai platform untuk menghubungkan orang, ide, dan kesempatan melalui berbagai acara yang inspiratif, edukatif, dan berdampak.
          </Typography>

          <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
            <Button
              component={Link}
              href='/home#upcoming-events'
              variant='contained'
              sx={{
                minHeight: 44,
                px: 2.5,
                bgcolor: '#07172B',
                color: '#fff',
                '&:hover': { bgcolor: '#0B2748' }
              }}
            >
              Jelajahi Event
            </Button>

            <Button
              component={Link}
              href='/home#event-categories'
              variant='text'
              endIcon={<i className='tabler-arrow-right' aria-hidden='true' />}
              sx={{ minHeight: 44, fontWeight: 800 }}
            >
              Lihat Kategori
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            minHeight: { xs: 290, sm: 390, lg: 470 },
            overflow: 'hidden',
            borderRadius: { xs: 2, md: 0 },
            bgcolor: 'action.hover'
          }}
        >
          <Box
            component='img'
            src='/EO Web.png'
            alt='Pertamina Event platform preview'
            sx={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top'
            }}
          />
        </Box>
      </Box>
    </Box>

    <Box
      component='section'
      sx={{
        px: { xs: 2.5, sm: 3.5, lg: 4 },
        py: { xs: 6, md: 8 },
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1440,
          mx: 'auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,.9fr) minmax(320px,.95fr) minmax(300px,.8fr)' },
          gap: { xs: 4, lg: 5.5 },
          alignItems: 'start'
        }}
      >
        <Box
          sx={{
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          <Box
            component='img'
            src='/EO web2.png'
            alt='Pertamina Event experience'
            sx={{
              display: 'block',
              width: '100%',
              aspectRatio: '4 / 3',
              objectFit: 'cover'
            }}
          />
        </Box>

        <Box>
          <Typography sx={{ color: '#00A7E1', fontSize: '0.7rem', fontWeight: 850, letterSpacing: '.08em' }}>
            OUR MISSION
          </Typography>
          <Typography
            component='h2'
            sx={{
              mt: 1.3,
              fontSize: { xs: '1.8rem', md: '2.35rem' },
              lineHeight: 1.08,
              fontWeight: 900
            }}
          >
            Menghadirkan Pengalaman Bermakna di Setiap Event
          </Typography>
          <Typography color='text.secondary' sx={{ mt: 1.5, fontSize: '0.94rem', lineHeight: 1.72 }}>
            Kami percaya bahwa setiap orang berhak mendapatkan kesempatan untuk belajar, berjejaring, dan bertumbuh. Melalui Pertamina Event, kami menghadirkan berbagai acara yang mempertemukan komunitas, mendukung inovasi, dan memperkuat kolaborasi untuk masa depan yang lebih baik.
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ color: '#00A7E1', fontSize: '0.7rem', fontWeight: 850, letterSpacing: '.08em' }}>
            OUR VALUES
          </Typography>

          <Box sx={{ mt: 1.6, display: 'grid', gap: 2.1 }}>
            {values.map(([icon, title, description]) => (
              <Box key={title} sx={{ display: 'grid', gridTemplateColumns: '42px minmax(0,1fr)', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: '#E9F9FC',
                    color: '#00A7E1'
                  }}
                >
                  <i className={icon} aria-hidden='true' />
                </Box>

                <Box>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 850 }}>{title}</Typography>
                  <Typography color='text.secondary' sx={{ mt: 0.25, fontSize: '0.78rem', lineHeight: 1.55 }}>
                    {description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>

    <Box
      component='section'
      sx={{
        px: { xs: 2.5, sm: 3.5, lg: 4 },
        py: { xs: 6, md: 8 },
        bgcolor: theme => theme.palette.mode === 'dark' ? '#0B1726' : '#F4F8FB',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 1440, mx: 'auto' }}>
        <Typography sx={{ color: '#00A7E1', fontSize: '0.7rem', fontWeight: 850, letterSpacing: '.08em' }}>
          OUR IMPACT
        </Typography>
        <Typography
          component='h2'
          sx={{
            mt: 1.2,
            fontSize: { xs: '1.8rem', md: '2.35rem' },
            lineHeight: 1.08,
            fontWeight: 900
          }}
        >
          Bersama, Kita Ciptakan Dampak Nyata
        </Typography>
        <Typography color='text.secondary' sx={{ mt: 1.2, maxWidth: 760, fontSize: '0.92rem', lineHeight: 1.65 }}>
          Dari skala lokal hingga nasional, setiap event yang kami selenggarakan membawa nilai tambah bagi peserta, komunitas, dan masyarakat luas.
        </Typography>

        <Box
          sx={{
            mt: 4,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))', xl: 'repeat(4,minmax(0,1fr))' },
            gap: 2
          }}
        >
          {impacts.map(([icon, value, label, note]) => (
            <Box
              key={label}
              sx={{
                p: { xs: 2.5, md: 3 },
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2
              }}
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 1.5,
                  bgcolor: '#EDF7FF',
                  color: '#0073C7'
                }}
              >
                <i className={icon} aria-hidden='true' />
              </Box>

              <Typography sx={{ mt: 2.4, fontSize: { xs: '2rem', md: '2.25rem' }, lineHeight: 1, fontWeight: 900 }}>
                {value}
              </Typography>
              <Typography sx={{ mt: 0.8, fontSize: '0.83rem', fontWeight: 850 }}>{label}</Typography>
              <Typography color='text.secondary' sx={{ mt: 0.35, fontSize: '0.72rem', lineHeight: 1.5 }}>
                {note}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>

    <Box
      component='section'
      sx={{
        px: { xs: 2.5, sm: 3.5, lg: 4 },
        py: { xs: 6, md: 7.5 },
        bgcolor: '#07172B',
        color: '#fff'
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1440,
          mx: 'auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1fr) auto' },
          alignItems: 'center',
          gap: 3
        }}
      >
        <Box sx={{ maxWidth: 730 }}>
          <Typography sx={{ color: '#45C7CC', fontSize: '0.7rem', fontWeight: 850, letterSpacing: '.08em' }}>
            LET&apos;S CONNECT
          </Typography>
          <Typography
            component='h2'
            sx={{ mt: 1.2, fontSize: { xs: '1.8rem', md: '2.45rem' }, lineHeight: 1.08, fontWeight: 900 }}
          >
            Jadi Bagian dari Pertamina Event
          </Typography>
          <Typography sx={{ mt: 1.2, maxWidth: 620, color: 'rgba(255,255,255,.68)', fontSize: '0.9rem', lineHeight: 1.65 }}>
            Temukan event yang relevan, ikuti program yang tersedia, dan dapatkan pengalaman bersama komunitas Pertamina Event.
          </Typography>
        </Box>

        <Button
          component={Link}
          href='/home#upcoming-events'
          variant='contained'
          sx={{
            justifySelf: { md: 'end' },
            minHeight: 44,
            px: 2.5,
            bgcolor: '#fff',
            color: '#07172B',
            fontWeight: 850,
            '&:hover': { bgcolor: '#F3F7FA' }
          }}
        >
          Ikuti Event
        </Button>
      </Box>
    </Box>
  </Box>
)

export default PublicAboutPage
