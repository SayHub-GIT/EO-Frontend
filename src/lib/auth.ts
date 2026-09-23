'use client'

import { getApiBaseUrl } from '@/lib/api-base-url'
const storageKey = 'eo-auth'
const adminSessionHintCookie = 'eo-admin-session'
const lastAdminPathKey = 'eo-last-admin-path'
const lastAdminPathCookie = 'eo-last-admin-path'
const sessionCookieMaxAgeSeconds = 60 * 60 * 24 * 30

export type AdminSession = {
  accessToken: string
  expiresAtUtc: string
  userId: string
  fullName: string
  email: string
  role: string
}

const parseError = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => null)

  return body?.detail ?? body?.message ?? body?.title ?? fallback
}

const writeCookie = (name: string, value: string, maxAge = sessionCookieMaxAgeSeconds) => {
  if (typeof document === 'undefined') return

  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''

  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
}

const deleteCookie = (name: string) => writeCookie(name, '', 0)

export const isSafeAdminPath = (path: string | null | undefined): path is string => {
  if (!path) return false

  const value = path.trim()

  if (!value.startsWith('/admin')) return false
  if (value.startsWith('//')) return false

  return value === '/admin' || value.startsWith('/admin/') || value.startsWith('/admin?')
}

export function rememberAdminPath(path: string) {
  if (typeof window === 'undefined' || !isSafeAdminPath(path)) return

  window.localStorage.setItem(lastAdminPathKey, path)
  writeCookie(lastAdminPathCookie, path)
}

export function getLastAdminPath(): string | null {
  if (typeof window === 'undefined') return null

  const value = window.localStorage.getItem(lastAdminPathKey)

  return isSafeAdminPath(value) ? value : null
}

export function clearLastAdminPath() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(lastAdminPathKey)
  deleteCookie(lastAdminPathCookie)
}

export function getSafeAdminReturnTo(searchParams?: URLSearchParams | null): string | null {
  if (!searchParams) return null

  const value = searchParams.get('returnTo')

  return isSafeAdminPath(value) ? value : null
}

export function getStoredSession(): AdminSession | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(storageKey)

  if (!raw) return null

  try {
    const session = JSON.parse(raw) as AdminSession

    if (!session.accessToken || !session.userId || !session.role) return null

    return session
  } catch {
    return null
  }
}

export function saveSession(session: AdminSession) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(storageKey, JSON.stringify(session))

  if (session.role?.toLowerCase() === 'admin') {
    writeCookie(adminSessionHintCookie, '1')
  } else {
    deleteCookie(adminSessionHintCookie)
  }
}

export function clearSession(options: { clearLastPath?: boolean } = {}) {
  if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey)

  deleteCookie(adminSessionHintCookie)

  if (options.clearLastPath) clearLastAdminPath()
}

const isAccessTokenUsable = (session: AdminSession) => {
  const expiresAt = Date.parse(session.expiresAtUtc)

  return Number.isFinite(expiresAt) && expiresAt - Date.now() > 60_000
}

export async function startParticipantSignup(
  fullName: string,
  email: string
): Promise<{ email: string; expiresInSeconds: number }> {
  const response = await fetch(`${getApiBaseUrl()}/auth/signup/verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ fullName, email })
  })

  if (!response.ok) {
    throw new Error(await parseError(response, 'Unable to send verification code.'))
  }

  return response.json()
}

export async function completeParticipantSignup(
  fullName: string,
  email: string,
  verificationCode: string,
  password: string
): Promise<AdminSession> {
  const response = await fetch(`${getApiBaseUrl()}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ fullName, email, verificationCode, password })
  })

  if (!response.ok) {
    throw new Error(await parseError(response, 'Unable to create your account.'))
  }

  const session = (await response.json()) as AdminSession
  saveSession(session)
  return session
}

export async function login(email: string, password: string): Promise<AdminSession> {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    throw new Error(await parseError(response, 'Email atau password salah.'))
  }

  const session = (await response.json()) as AdminSession

  saveSession(session)

  return session
}

let refreshPromise: Promise<AdminSession | null> | null = null

const fetchRefresh = () =>
  fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: 'POST',
    credentials: 'include'
  })

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds))

export async function refreshSession(): Promise<AdminSession | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    let response: Response

    try {
      response = await fetchRefresh()
    } catch {
      // A brief local/network interruption should not immediately destroy a
      // still-valid refresh session. Retry once before giving up this restore.
      await wait(350)

      try {
        response = await fetchRefresh()
      } catch {
        return null
      }
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) clearSession()

      return null
    }

    const session = (await response.json()) as AdminSession

    saveSession(session)
    return session
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

export async function restoreSession(): Promise<AdminSession | null> {
  const session = getStoredSession()

  if (session && isAccessTokenUsable(session)) {
    // Backfill the routing hint for sessions created before this middleware
    // existed. This cookie contains no credential or authorization data.
    if (session.role?.toLowerCase() === 'admin') writeCookie(adminSessionHintCookie, '1')

    return session
  }

  return refreshSession()
}

const buildHeaders = (headers: HeadersInit | undefined, accessToken: string) => {
  const result = new Headers(headers)

  result.set('Authorization', `Bearer ${accessToken}`)

  return result
}

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let session = await restoreSession()

  if (!session) throw new Error('Your session has expired. Please login again.')

  const request = () =>
    fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      credentials: 'include',
      headers: buildHeaders(init.headers, session!.accessToken)
    })

  let response = await request()

  if (response.status !== 401) return response

  session = await refreshSession()

  if (!session) throw new Error('Your session has expired. Please login again.')

  response = await request()

  if (response.status === 401 || response.status === 403) {
    clearSession()
    throw new Error('Your session has expired. Please login again.')
  }

  return response
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  const response = await authFetch('/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  })

  if (!response.ok) {
    throw new Error(await parseError(response, 'Unable to change password.'))
  }

  clearSession()
}

export async function logout() {
  try {
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    })
  } finally {
    clearSession({ clearLastPath: true })
  }
}
