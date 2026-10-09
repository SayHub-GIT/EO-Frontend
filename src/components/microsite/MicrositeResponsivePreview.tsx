'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import Box from '@mui/material/Box'
import { ThemeProvider, useTheme } from '@mui/material/styles'

import MicrositeDocumentPreview from '@/components/microsite/MicrositeDocumentPreview'
import type { MicrositeDocument } from '@/lib/admin-microsites'

type Props = {
  document: MicrositeDocument
  dataBindings: Record<string, unknown>
  templateKey: string
  eventSlug?: string
  height?: string | number
  activeSectionId?: string
  onSelectSection: (sectionId: string) => void
}

const MicrositeResponsivePreview = (props: Props) => {
  const theme = useTheme()
  const [frameDocument, setFrameDocument] = useState<Document | null>(null)
  const [cache, setCache] = useState<ReturnType<typeof createCache> | null>(null)

  useEffect(() => {
    const target = frameDocument
    if (!target) return

    const stylesheetNodes = Array.from(window.document.querySelectorAll('link[rel="stylesheet"], style:not([data-emotion])'))
      .map(node => node.cloneNode(true))
    const baseStyle = target.createElement('style')
    baseStyle.textContent = 'html,body{margin:0;min-width:0;}body{overflow-wrap:anywhere;}*{box-sizing:border-box;}'
    target.head.append(...stylesheetNodes, baseStyle)

    setCache(createCache({ key: 'microsite-frame', container: target.head, prepend: true }))

    return () => {
      stylesheetNodes.forEach(node => node.parentNode?.removeChild(node))
      baseStyle.remove()
    }
  }, [frameDocument])

  return (
    <>
      <Box
        component='iframe'
        title='Pratinjau responsif MicroSite'
        srcDoc='<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body></body></html>'
        onLoad={event => setFrameDocument(event.currentTarget.contentDocument)}
        sx={{ display: 'block', width: '100%', height: props.height ?? '72vh', border: 0, bgcolor: props.document.theme.backgroundColor }}
      />
      {frameDocument && cache && createPortal(
        <CacheProvider value={cache}>
          <ThemeProvider theme={theme}>
            <MicrositeDocumentPreview {...props} />
          </ThemeProvider>
        </CacheProvider>,
        frameDocument.body
      )}
    </>
  )
}

export default MicrositeResponsivePreview
