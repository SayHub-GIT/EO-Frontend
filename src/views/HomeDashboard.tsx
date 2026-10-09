'use client'

import Link from 'next/link'
import AdminAnalyticsDashboard from '@/components/admin/AdminAnalyticsDashboard'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { keyframes } from '@mui/system'

type Props = {
  publicView?: boolean
}

const publicCategories = [
  {
    label: 'Running',
    description: 'Race, fun run, and active community events.',
    icon: 'tabler-run',
    href: '/events/category/running'
  },
  {
    label: 'Seminar',
    description: 'Talks, learning sessions, and knowledge-sharing events.',
    icon: 'tabler-microphone',
    href: '/events/category/seminar'
  },
  {
    label: 'Workshop',
    description: 'Hands-on sessions designed for practical learning.',
    icon: 'tabler-tool',
    href: '/events/category/workshop'
  },
  {
    label: 'Other',
    description: 'Discover other Pertamina events and special programs.',
    icon: 'tabler-calendar-event',
    href: '/events/category/other'
  }
]

const websiteHighlights = [
  ['tabler-category', 'Discover events by category'],
  ['tabler-ticket', 'Choose a package and register online'],
  ['tabler-mail-check', 'Receive confirmation and ticket by email']
]

const partnerPlaceholders = Array.from({ length: 6 }, (_, index) => `Partner ${index + 1}`)

const marqueeRight = keyframes`
  from {
    transform: translateX(-50%);
  }
  to {
    transform: translateX(0);
  }
`

const PublicEventHome = () => (
  <Box sx={{ color: 'text.primary' }}>
    <Box
      component='section'
      sx={theme => ({
        position: 'relative',
        overflow: 'hidden',
        minHeight: { xs: '100dvh', sm: '82dvh', md: '100dvh' },
        display: 'grid',
        placeItems: 'center',
        px: { xs: 2, sm: 3 },
        pt: { xs: 14, sm: 15, md: 17 },
        pb: { xs: 10, sm: 11, md: 13 },
        backgroundImage: `linear-gradient(${alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.12 : 0.06)}, ${alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.12 : 0.06)}), url('${theme.palette.mode === 'dark' ? '/dark bet.png' : '/terang4.png'}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        transition: theme.transitions.create(['background-color', 'color'], {
          duration: theme.transitions.duration.shorter
        })
      })}
    >
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 960,
          mx: 'auto',
          textAlign: 'center'
        }}
      >
        <Chip label='Pertamina Event' color='primary' variant='tonal' />

        <Typography
          component='h1'
          sx={{
            mt: { xs: 2.5, sm: 3 },
            color: 'text.primary',
            fontWeight: 800,
            fontSize: { xs: '2.4rem', sm: '3.4rem', md: '4.45rem', lg: '4.9rem' },
            lineHeight: { xs: 1.08, sm: 1.05 },
            letterSpacing: { xs: '-0.025em', md: '-0.04em' },
            textWrap: 'balance'
          }}
        >
          Welcome to Pertamina Event!
        </Typography>

        <Typography
          color='text.secondary'
          sx={{
            mt: { xs: 2, sm: 2.5, md: 3 },
            mx: 'auto',
            maxWidth: 720,
            fontWeight: 400,
            fontSize: { xs: '0.98rem', sm: '1.075rem', md: '1.16rem' },
            lineHeight: { xs: 1.65, md: 1.75 },
            px: { xs: 1, sm: 0 },
            textWrap: 'balance'
          }}
        >
          Discover experiences, learn something new, meet communities, and take part in events created for you.
        </Typography>

        <Box sx={{ mt: { xs: 4, sm: 4.5, md: 5 }, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: { xs: 1.5, sm: 2 } }}>
          <Button
            component={Link}
            href='/events/category/seminar'
            size='large'
            variant='contained'
            endIcon={<i className='tabler-arrow-right' />}
            sx={{ minWidth: { xs: 'min(100%, 210px)', sm: 200 } }}
          >
            Explore Events
          </Button>
          <Button
            component={Link}
            href='/about'
            size='large'
            variant='outlined'
            sx={{ minWidth: { xs: 'min(100%, 210px)', sm: 220 }, bgcolor: 'background.papers' }}
          >
            About Pertamina Event
          </Button>
        </Box>

        <Box
          sx={{
            mt: { xs: 5, sm: 6, md: 7 },
            display: 'flex',
            justifyContent: 'center',
            gap: { xs: 2, sm: 3.5, md: 7 },
            flexWrap: 'wrap',
            color: 'text.secondary'
          }}
        >
          {[
            ['tabler-calendar-event', 'Curated events'],
            ['tabler-ticket', 'Easy registration'],
            ['tabler-mail-check', 'Ticket delivered by email']
          ].map(([icon, label]) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className={icon} />
              <Typography
                color='inherit'
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem', md: '0.93rem' }, lineHeight: 1.4 }}
              >
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>

<Box
  component='section'
  sx={theme => ({
    position: 'relative',
    overflow: 'hidden',

    minHeight: { xs: '9 dvh', md: '100dvh' },

    display: 'flex',
    alignItems: 'center',

    px: { xs: 2, sm: 3 },
    py: { xs: 10, sm: 12, md: 14 },

    backgroundImage: `url('${
      theme.palette.mode === 'dark'
        ? '/home-intro-dark.webp'
        : '/cahaya5.png'
    }')`,

    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  })}
>
  <Box
    sx={{
      position: 'relative',
      zIndex: 1,

      width: '100%',
      maxWidth: 1180,
      mx: 'auto',

      display: 'grid',

      gridTemplateColumns: {
        xs: '1fr',
        md: 'minmax(0, 1.05fr) minmax(0, .95fr)'
      },

      gap: {
        xs: 5,
        md: 8,
        lg: 10
      },

      alignItems: 'center'
    }}
  >
    {/* LEFT */}
    <Box
      sx={{
        position: 'relative',

        minHeight: {
          xs: 300,
          sm: 390,
          md: 470
        },

        display: 'grid',
        placeItems: 'center'
      }}
    >
      <Box
        sx={{
          textAlign: 'center',
          px: 3
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,

            mx: 'auto',
            mb: 2,

            borderRadius: '50%',

            display: 'grid',
            placeItems: 'center',

            color: 'primary.main'
          }}
        >
          <i className='tabler-photo text-3xl' />
        </Box>

        <Typography
          color='text.primary'
          fontWeight={700}
          sx={{
            fontSize: {
              xs: '1.05rem',
              md: '1.15rem'
            }
          }}
        >
          Event photo placeholder
        </Typography>

        <Typography
          color='text.secondary'
          sx={{
            mt: 0.75,

            fontSize: {
              xs: '0.88rem',
              md: '0.94rem'
            }
          }}
        >
          Replace this area with the homepage photo later.
        </Typography>
      </Box>
    </Box>

    {/* RIGHT */}
    <Box
      sx={{
        position: 'relative',

        p: {
          xs: 1,
          sm: 2,
          md: 3
        }
      }}
    >
      <Box
        component='img'
        src='/EO%20Navbar.png'
        alt='Pertamina Event'
        sx={{
          width: 'auto',

          height: {
            xs: 54,
            sm: 62,
            md: 72
          },

          maxWidth: '100%',
          objectFit: 'contain'
        }}
      />

      <Typography
        component='h2'
        sx={theme => ({
          mt: {
            xs: 3,
            md: 4
          },

          fontWeight: 800,

          color:
            theme.palette.mode === 'dark'
              ? '#fff'
              : theme.palette.text.primary,

          fontSize: {
            xs: '2rem',
            sm: '2.35rem',
            md: '2.75rem'
          },

          lineHeight: 1.12,
          letterSpacing: '-0.025em',
          textWrap: 'balance',

          textShadow:
            theme.palette.mode === 'dark'
              ? '0 3px 18px rgba(0,0,0,.65)'
              : '0 2px 14px rgba(255,255,255,.8)'
        })}
      >
        One place for every Pertamina event experience.
      </Typography>

      <Typography
        sx={theme => ({
          mt: 2.25,

          fontSize: {
            xs: '0.98rem',
            md: '1.06rem'
          },

          lineHeight: 1.8,
          maxWidth: 600,

          color:
            theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,.82)'
              : theme.palette.text.secondary,

          textShadow:
            theme.palette.mode === 'dark'
              ? '0 2px 12px rgba(0,0,0,.6)'
              : '0 2px 10px rgba(255,255,255,.8)'
        })}
      >
        Pertamina Event brings event discovery, registration,
        package selection, and participant information together
        in one public platform. Find the experience that fits you,
        register in a few steps, and keep every important event
        detail in one place.
      </Typography>

      <Box
        sx={{
          mt: 3.5,
          display: 'grid',
          gap: 1.75
        }}
      >
        {websiteHighlights.map(([icon, label]) => (
          <Box
            key={label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5
            }}
          >
            <Box
              sx={{
                width: 38,
                height: 38,
                flexShrink: 0,

                display: 'grid',
                placeItems: 'center',

                color: 'primary.main'
              }}
            >
              <i className={icon} />
            </Box>

            <Typography
              sx={theme => ({
                fontWeight: 600,

                fontSize: {
                  xs: '0.9rem',
                  md: '0.96rem'
                },

                color:
                  theme.palette.mode === 'dark'
                    ? '#fff'
                    : theme.palette.text.primary,

                textShadow:
                  theme.palette.mode === 'dark'
                    ? '0 2px 10px rgba(0,0,0,.6)'
                    : '0 2px 8px rgba(255,255,255,.8)'
              })}
            >
              {label}
            </Typography>
          </Box>
        ))}
      </Box>

      <Button
        component={Link}
        href='/about'
        variant='outlined'
        endIcon={<i className='tabler-arrow-right' />}
        sx={theme => ({
          mt: 4,

          color:
            theme.palette.mode === 'dark'
              ? '#fff'
              : theme.palette.primary.main,

          borderColor:
            theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,.65)'
              : theme.palette.primary.main,

          bgcolor: 'transparent',

          '&:hover': {
            bgcolor:
              theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,.08)'
                : 'rgba(255,255,255,.12)'
          }
        })}
      >
        Learn more
      </Button>
    </Box>
  </Box>
</Box>

    <Box
      id='event-categories'
      component='section'
      sx={theme => ({
        position: 'relative',
        overflow: 'hidden',
        px: { xs: 2, sm: 3 },
        py: { xs: 8, sm: 9, md: 11 },
        backgroundImage: `linear-gradient(${alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.08 : 0.04)}, ${alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.08 : 0.04)}), url('${theme.palette.mode === 'dark' ? '/gelap.png' : '/cahaya.png'}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      })}
    >
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 1180, mx: 'auto' }}>
        <Box sx={{ textAlign: 'center', mb: { xs: 4, sm: 5, md: 6 } }}>
          <Typography
            component='h2'
            sx={{
              color: 'text.primary',
              fontWeight: 700,
              fontSize: { xs: '2rem', sm: '2.4rem', md: '2.75rem' },
              lineHeight: 1.15,
              textWrap: 'balance'
            }}
          >
            Explore by category
          </Typography>
          <Typography
            color='text.secondary'
            sx={{
              mt: 1.5,
              mx: 'auto',
              maxWidth: 720,
              fontSize: { xs: '0.95rem', sm: '1rem', md: '1.06rem' },
              lineHeight: 1.7,
              px: { xs: 1, sm: 0 }
            }}
          >
            Published events live inside the category selected by the event organizer.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 2, sm: 2.5, md: 3 } }}>
          {publicCategories.map(category => (
            <Card
              key={category.href}
              sx={theme => ({
                height: '100%',
                bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.9 : 0.92),
                border: '1px solid',
                borderColor: 'divider',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: theme.shadows[4],
                transition: theme.transitions.create(['transform', 'box-shadow', 'background-color'], {
                  duration: theme.transitions.duration.shorter
                }),
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8]
                }
              })}
            >
              <CardContent
                sx={{
                  height: '100%',
                  p: { xs: 2.75, sm: 3.25, md: 3.5 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start'
                }}
              >
                <Box
                  sx={{
                    width: { xs: 48, md: 52 },
                    height: { xs: 48, md: 52 },
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'primary.main'
                  }}
                >
                  <i className={`${category.icon} text-2xl`} />
                </Box>

                <Typography
                  color='text.primary'
                  sx={{ mt: 2.5, fontWeight: 700, fontSize: { xs: '1.15rem', sm: '1.22rem', md: '1.28rem' } }}
                >
                  {category.label}
                </Typography>

                <Typography
                  color='text.secondary'
                  sx={{
                    mt: 1,
                    mb: 3,
                    fontSize: { xs: '0.88rem', sm: '0.91rem', md: '0.94rem' },
                    lineHeight: 1.7
                  }}
                >
                  {category.description}
                </Typography>

                <Button
                  component={Link}
                  href={category.href}
                  variant='text'
                  endIcon={<i className='tabler-arrow-right' />}
                  sx={{ mt: 'auto', px: 0 }}
                >
                  View {category.label}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    </Box>

 <Box
  component='section'
  aria-label='Event partners'
  sx={theme => ({
    position: 'relative',
    overflow: 'hidden',

    minHeight: {
      xs: '80dvh',
      md: '90dvh'
    },

    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',

    py: {
      xs: 9,
      sm: 11,
      md: 13
    },

    backgroundImage: `url('${
      theme.palette.mode === 'dark'
        ? '/home-partners-dark.webp'
        : '/circle.png'
    }')`,

    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  })}
>
  {/* TITLE */}
  <Box
    sx={{
      position: 'relative',
      zIndex: 1,

      width: '100%',
      maxWidth: 1180,

      mx: 'auto',
      mb: {
        xs: 5,
        md: 7
      },

      px: {
        xs: 2,
        sm: 3
      },

      textAlign: 'center'
    }}
  >
    <Chip
      label='Presented by'
      color='primary'
      variant='tonal'
    />

    <Typography
      component='h2'
      sx={theme => ({
        mt: 2,

        fontWeight: 800,

        fontSize: {
          xs: '2rem',
          sm: '2.4rem',
          md: '2.8rem'
        },

        lineHeight: 1.15,

        color:
          theme.palette.mode === 'dark'
            ? '#fff'
            : theme.palette.text.primary,

        textShadow:
          theme.palette.mode === 'dark'
            ? '0 3px 18px rgba(0,0,0,.65)'
            : '0 2px 14px rgba(255,255,255,.9)'
      })}
    >
      Partners & ecosystem
    </Typography>

    <Typography
      sx={theme => ({
        mt: 1.5,

        mx: 'auto',
        maxWidth: 650,

        fontSize: {
          xs: '0.95rem',
          md: '1.05rem'
        },

        lineHeight: 1.7,

        color:
          theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,.82)'
            : theme.palette.text.secondary,

        textShadow:
          theme.palette.mode === 'dark'
            ? '0 2px 12px rgba(0,0,0,.6)'
            : '0 2px 10px rgba(255,255,255,.9)'
      })}
    >
      Together with our partners, we create meaningful event
      experiences and connect communities across the Pertamina
      ecosystem.
    </Typography>
  </Box>

  {/* PARTNER LOGOS MARQUEE */}
  <Box
    sx={{
      position: 'relative',
      zIndex: 1,

      overflow: 'hidden',

      width: '100%',

      py: 2,

      maskImage:
        'linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)',

      WebkitMaskImage:
        'linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)'
    }}
  >
    <Box
      sx={{
        display: 'flex',

        width: 'max-content',

        animation: `${marqueeRight} 28s linear infinite`,

        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none'
        },

        '&:hover': {
          animationPlayState: 'paused'
        }
      }}
    >
      {[0, 1].map(group => (
        <Box
          key={group}
          sx={{
            display: 'flex',

            gap: {
              xs: 2,
              md: 3
            },

            pr: {
              xs: 2,
              md: 3
            }
          }}
        >
          {partnerPlaceholders.map((partner, index) => (
            <Paper
              key={`${group}-${partner}`}
              elevation={0}
              sx={theme => ({
                width: {
                  xs: 155,
                  sm: 180,
                  md: 210
                },

                height: {
                  xs: 90,
                  sm: 104,
                  md: 116
                },

                flexShrink: 0,

                borderRadius: 3,

                display: 'grid',
                placeItems: 'center',

                /*
                 * Transparan supaya gambar background
                 * tetap kelihatan.
                 */
                bgcolor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(5, 18, 45, .25)'
                    : 'rgba(255,255,255,.20)',

                border: '1px solid',

                borderColor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,.25)'
                    : 'rgba(30,80,130,.18)',

                boxShadow: 'none'
              })}
            >
              <Box
                sx={theme => ({
                  textAlign: 'center',

                  color:
                    theme.palette.mode === 'dark'
                      ? '#fff'
                      : theme.palette.text.primary
                })}
              >
                <i
                  className={`${
                    index % 2 === 0
                      ? 'tabler-building'
                      : 'tabler-brand-appgallery'
                  } text-2xl`}
                />

                <Typography
                  sx={theme => ({
                    mt: 0.75,

                    fontWeight: 600,

                    fontSize: {
                      xs: '0.78rem',
                      md: '0.85rem'
                    },

                    color:
                      theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,.85)'
                        : theme.palette.text.primary
                  })}
                >
                  Partner Logo
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      ))}
    </Box>
  </Box>
</Box>
  </Box>
)

const HomeDashboard = ({ publicView = false }: Props) =>
  publicView ? <PublicEventHome /> : <AdminAnalyticsDashboard />

export default HomeDashboard
