'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { usePathname } from 'next/navigation'

import LinearProgress from '@mui/material/LinearProgress'

const DEFAULT_WARNING =
  'You have unsaved changes. If you leave this page, those changes may be lost.'

type UnsavedChangesContextValue = {
  hasUnsavedChanges: boolean
  registerDirtyState: (id: string, dirty: boolean) => void
  confirmDiscardChanges: (message?: string) => boolean
  beginNavigation: () => void
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null)

const isPlainLeftClick = (event: MouseEvent) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey

const UnsavedChangesProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set())
  const [navigating, setNavigating] = useState(false)
  const hasUnsavedChanges = dirtyIds.size > 0

  const registerDirtyState = useCallback((id: string, dirty: boolean) => {
    setDirtyIds(previous => {
      const next = new Set(previous)

      if (dirty) next.add(id)
      else next.delete(id)

      if (next.size === previous.size && [...next].every(value => previous.has(value))) {
        return previous
      }

      return next
    })
  }, [])

  const confirmDiscardChanges = useCallback((message = DEFAULT_WARNING) => {
    if (!hasUnsavedChanges) return true
    return window.confirm(message)
  }, [hasUnsavedChanges])

  const beginNavigation = useCallback(() => {
    setNavigating(true)
  }, [])

  useEffect(() => {
    setNavigating(false)
  }, [pathname])

  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || !isPlainLeftClick(event)) return

      const element = event.target instanceof Element ? event.target : null
      const anchor = element?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return

      let destination: URL

      try {
        destination = new URL(anchor.href, window.location.href)
      } catch {
        return
      }

      if (destination.origin !== window.location.origin) return

      const current = new URL(window.location.href)
      const sameDocument =
        destination.pathname === current.pathname &&
        destination.search === current.search

      if (sameDocument && destination.hash !== current.hash) return
      if (destination.href === current.href) return

      if (hasUnsavedChanges && !window.confirm(DEFAULT_WARNING)) {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      setNavigating(true)
    }

    document.addEventListener('click', handleDocumentClick, true)
    return () => document.removeEventListener('click', handleDocumentClick, true)
  }, [hasUnsavedChanges])

  const value = useMemo<UnsavedChangesContextValue>(() => ({
    hasUnsavedChanges,
    registerDirtyState,
    confirmDiscardChanges,
    beginNavigation
  }), [beginNavigation, confirmDiscardChanges, hasUnsavedChanges, registerDirtyState])

  return (
    <UnsavedChangesContext.Provider value={value}>
      {navigating && (
        <LinearProgress
          aria-label='Loading next page'
          sx={{
            position: 'fixed',
            inset: '0 0 auto 0',
            zIndex: theme => theme.zIndex.modal + 10,
            height: 3,
            pointerEvents: 'none'
          }}
        />
      )}
      {children}
    </UnsavedChangesContext.Provider>
  )
}

export const useUnsavedChanges = (dirty: boolean) => {
  const context = useContext(UnsavedChangesContext)
  const id = useId()

  if (!context) {
    throw new Error('useUnsavedChanges must be used inside UnsavedChangesProvider.')
  }

  const { registerDirtyState } = context

  useEffect(() => {
    registerDirtyState(id, dirty)
    return () => registerDirtyState(id, false)
  }, [dirty, id, registerDirtyState])

  return {
    hasUnsavedChanges: context.hasUnsavedChanges,
    confirmDiscardChanges: context.confirmDiscardChanges,
    beginNavigation: context.beginNavigation
  }
}

export default UnsavedChangesProvider
