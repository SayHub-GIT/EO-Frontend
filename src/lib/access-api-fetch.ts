const serverAccessHeaders = () => {
  if (typeof window !== 'undefined') return null

  const clientId = process.env.CF_ACCESS_CLIENT_ID?.trim()
  const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) return null

  return {
    'CF-Access-Client-Id': clientId,
    'CF-Access-Client-Secret': clientSecret
  }
}

/**
 * Fetch helper for a Cloudflare Access protected backend.
 *
 * Browser requests include the Access application cookie.
 * Server-side Next/Worker requests authenticate with a Cloudflare Access
 * Service Token stored only in Worker secrets.
 */
export const accessApiFetch = (
  input: RequestInfo | URL,
  init: RequestInit = {}
) => {
  const headers = new Headers(init.headers)
  const serviceHeaders = serverAccessHeaders()

  if (serviceHeaders) {
    headers.set('CF-Access-Client-Id', serviceHeaders['CF-Access-Client-Id'])
    headers.set('CF-Access-Client-Secret', serviceHeaders['CF-Access-Client-Secret'])
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: typeof window === 'undefined' ? init.credentials : 'include'
  })
}
