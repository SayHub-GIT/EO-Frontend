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
