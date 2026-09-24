const serverAccessHeaders = () => {
  if (typeof window !== 'undefined') return null

  const headers: Record<string, string> = {}
  const clientId = process.env.CF_ACCESS_CLIENT_ID?.trim()
  const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET?.trim()
  const internalToken = process.env.EO_INTERNAL_API_TOKEN?.trim()

  if (clientId && clientSecret) {
    headers['CF-Access-Client-Id'] = clientId
    headers['CF-Access-Client-Secret'] = clientSecret
  }

  if (internalToken) {
    headers['X-EO-Internal-Token'] = internalToken
  }

  return Object.keys(headers).length > 0 ? headers : null
}

export const accessApiFetch = (
  input: RequestInfo | URL,
  init: RequestInit = {}
) => {
  const headers = new Headers(init.headers)
  const serviceHeaders = serverAccessHeaders()

  if (serviceHeaders) {
    for (const [name, value] of Object.entries(serviceHeaders)) {
      headers.set(name, value)
    }
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: typeof window === 'undefined' ? init.credentials : 'include'
  })
}
