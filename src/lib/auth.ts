'use client'

import { getApiBaseUrl } from '@/lib/api-base-url'

const legacyStorageKey = 'eo-auth'
const adminSessionHintCookie = 'eo-admin-session'
const lastAdminPathKey = 'eo-last-admin-path'
const lastAdminPathCookie = 'eo-last-admin-path'
const sessionCookieMaxAgeSeconds = 60 * 60 * 24 * 30
const sessionRequestHeaders = { 'X-EO-Session': '1' }

let memorySession: AdminSession | null = null
let refreshPromise: Promise<AdminSession | null> | null = null

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

const purgeLegacyStoredCredential = () => {
  if (typeof window !== 'undefined') window.localStorage.removeItem(legacyStorageKey)
}

export function getStoredSession(): AdminSession | null {
  purgeLegacyStoredCredential()
  return memorySession
}

export function saveSession(session: AdminSession) {
  memorySession = session
  purgeLegacyStoredCredential()

  if (session.role?.toLowerCase() === 'admin') {
    writeCookie(adminSessionHintCookie, '1')
  } else {
    deleteCookie(adminSessionHintCookie)
  }
}

export function clearSession(options: { clearLastPath?: boolean } = {}) {
  memorySession = null
  purgeLegacyStoredCredential()
  deleteCookie(adminSessionHintCookie)
  if (options.clearLastPath) clearLastAdminPath()
}

const accessTokenRemainingMs = (session: AdminSession) => {
  const expiresAt = Date.parse(session.expiresAtUtc)
  return Number.isFinite(expiresAt) ? expiresAt - Date.now() : -1
}

const isAccessTokenUsable = (session: AdminSession) =>
  accessTokenRemainingMs(session) > 60_000

const isAccessTokenStillValid = (session: AdminSession) =>
  accessTokenRemainingMs(session) > 5_000

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

  if (!response.ok) throw new Error(await parseError(response, 'Unable to send verification code.'))
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

  if (!response.ok) throw new Error(await parseError(response, 'Unable to create your account.'))

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

  if (!response.ok) throw new Error(await parseError(response, 'Email atau password salah.'))

  const session = (await response.json()) as AdminSession
  saveSession(session)
  return session
}

const fetchRefresh = () =>
  fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: 'POST',
    headers: sessionRequestHeaders,
    credentials: 'include'
  })

const wait = (milliseconds: number) =>
  new Promise(resolve => setTimeout(resolve, milliseconds))

export async function refreshSession(): Promise<AdminSession | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    let response: Response

    try {
      response = await fetchRefresh()
    } catch {
      await wait(350)
      try {
        response = await fetchRefresh()
      } catch {
        return null
      }
    }

    if (response.status === 401 || response.status === 403) {
      // Another tab may have rotated the shared HttpOnly refresh cookie a
      // moment earlier. Retry once with the browser's latest cookie value.
      await wait(250)
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
    if (session.role?.toLowerCase() === 'admin') writeCookie(adminSessionHintCookie, '1')
    return session
  }

  const refreshed = await refreshSession()
  if (refreshed) return refreshed

  const fallback = getStoredSession()
  return fallback && isAccessTokenStillValid(fallback) ? fallback : null
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

  if (response.status === 401) {
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

  if (!response.ok) throw new Error(await parseError(response, 'Unable to change password.'))
  clearSession()
}

export async function logout() {
  try {
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: 'POST',
      headers: sessionRequestHeaders,
      credentials: 'include'
    })
  } finally {
    clearSession({ clearLastPath: true })
  }
}

export async function logoutAll() {
  try {
    await authFetch('/auth/logout-all', { method: 'POST' })
  } finally {
    clearSession({ clearLastPath: true })
  }
}
