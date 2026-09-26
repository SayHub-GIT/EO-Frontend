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
  roles: string[]
  permissions: string[]
  canAccessAdmin: boolean
}

export type SignupVerification = {
  challengeId: string
  email: string
  expiresInSeconds: number
}


export type AuthDeviceSession = {
  sessionId: string
  isCurrent: boolean
  isPersistent: boolean
  status: 'Active' | 'Revoked' | 'Expired' | string
  ipAddress: string | null
  userAgent: string | null
  createdAtUtc: string
  lastUsedAtUtc: string | null
  expiresAtUtc: string
  revokedAtUtc: string | null
}

const normalizeSession = (value: Partial<AdminSession> & Pick<AdminSession, 'accessToken' | 'expiresAtUtc' | 'userId' | 'fullName' | 'email' | 'role'>): AdminSession => {
  const role = value.role ?? ''
  const legacyAdmin = role.toLowerCase() === 'admin'
  const legacyStaff = role.toLowerCase() === 'staff'

  return {
    accessToken: value.accessToken,
    expiresAtUtc: value.expiresAtUtc,
    userId: value.userId,
    fullName: value.fullName,
    email: value.email,
    role,
    roles: Array.isArray(value.roles) && value.roles.length ? value.roles : [role].filter(Boolean),
    permissions: Array.isArray(value.permissions) ? value.permissions : [],
    canAccessAdmin: typeof value.canAccessAdmin === 'boolean' ? value.canAccessAdmin : legacyAdmin || legacyStaff
  }
}

const parseError = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => null)

  if (body && typeof body === 'object' && body.errors && typeof body.errors === 'object') {
    const fieldErrors = Object.values(body.errors as Record<string, unknown>)
      .flatMap(value => Array.isArray(value) ? value : [])
      .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))

    if (fieldErrors.length) return fieldErrors.join(' ')
  }

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

export const hasPermission = (session: AdminSession | null | undefined, permission: string) =>
  Boolean(session?.permissions?.includes(permission) || session?.roles?.some(role => role.toLowerCase() === 'admin'))

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

export function saveSession(sessionValue: AdminSession) {
  const session = normalizeSession(sessionValue)
  memorySession = session
  purgeLegacyStoredCredential()

  if (session.canAccessAdmin) writeCookie(adminSessionHintCookie, '1')
  else deleteCookie(adminSessionHintCookie)
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

const isAccessTokenUsable = (session: AdminSession) => accessTokenRemainingMs(session) > 60_000
const isAccessTokenStillValid = (session: AdminSession) => accessTokenRemainingMs(session) > 5_000

export async function startParticipantSignup(
  fullName: string,
  email: string
): Promise<SignupVerification> {
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
  verificationChallengeId: string,
  verificationCode: string,
  password: string,
  rememberMe = true
): Promise<AdminSession> {
  const response = await fetch(`${getApiBaseUrl()}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ fullName, email, verificationChallengeId, verificationCode, password, rememberMe })
  })

  if (!response.ok) throw new Error(await parseError(response, 'Unable to create your account.'))

  const session = normalizeSession((await response.json()) as AdminSession)
  saveSession(session)
  return session
}

export async function login(email: string, password: string, rememberMe = true): Promise<AdminSession> {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, rememberMe })
  })

  if (!response.ok) throw new Error(await parseError(response, 'Email atau password salah.'))

  const session = normalizeSession((await response.json()) as AdminSession)
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
      try { response = await fetchRefresh() } catch { return null }
    }

    if (response.status === 401 || response.status === 403) {
      await wait(250)
      try { response = await fetchRefresh() } catch { return null }
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) clearSession()
      return null
    }

    const session = normalizeSession((await response.json()) as AdminSession)
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
    if (session.canAccessAdmin) writeCookie(adminSessionHintCookie, '1')
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

export async function changePassword(currentPassword: string, newPassword: string) {
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

export async function listAuthSessions(): Promise<AuthDeviceSession[]> {
  const response = await authFetch('/auth/sessions', { cache: 'no-store' })

  if (!response.ok) throw new Error(await parseError(response, 'Unable to load active sessions.'))
  return response.json()
}

export async function revokeAuthSession(sessionId: string): Promise<void> {
  const response = await authFetch(`/auth/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE'
  })

  if (!response.ok) throw new Error(await parseError(response, 'Unable to revoke this session.'))
}

export async function logoutOtherSessions(): Promise<void> {
  const response = await authFetch('/auth/logout-others', { method: 'POST' })

  if (!response.ok) throw new Error(await parseError(response, 'Unable to sign out other devices.'))
}

export async function logoutAll() {
  try {
    await authFetch('/auth/logout-all', { method: 'POST' })
  } finally {
    clearSession({ clearLastPath: true })
  }
}
