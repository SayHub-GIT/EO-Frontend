const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

const isLoopbackHost = (host: string) => loopbackHosts.has(host.toLowerCase())

const configuredApiBaseUrl = (() => {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim()

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_API_URL is required for production builds.')
    }

    return 'http://localhost:5174/api'
  }

  const normalized = configured.replace(/\/$/, '')

  if (process.env.NODE_ENV !== 'production') {
    return normalized
  }

  let url: URL

  try {
    url = new URL(normalized)
  } catch {
    throw new Error('NEXT_PUBLIC_API_URL must be an absolute URL in production.')
  }

  if (url.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_API_URL must use HTTPS in production.')
  }

  if (isLoopbackHost(url.hostname)) {
    throw new Error('NEXT_PUBLIC_API_URL cannot point to localhost in production.')
  }

  if (!url.pathname.endsWith('/api')) {
    throw new Error('NEXT_PUBLIC_API_URL must point to the backend /api base path.')
  }

  return normalized
})()

/**
 * Keep localhost for server-side Next.js requests, but when a development page
 * is opened from another device through the host machine's LAN address, route
 * browser API/SignalR traffic back to that same host instead of the device's
 * own localhost.
 */
export const getApiBaseUrl = () => {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
    return configuredApiBaseUrl
  }

  try {
    const configured = new URL(configuredApiBaseUrl)
    const pageHost = window.location.hostname

    if (isLoopbackHost(configured.hostname) && !isLoopbackHost(pageHost)) {
      configured.hostname = pageHost
      return configured.toString().replace(/\/$/, '')
    }
  } catch {
    // NEXT_PUBLIC_API_URL is expected to be absolute in this project.
  }

  return configuredApiBaseUrl
}

export const getApiOrigin = () => {
  const baseUrl = new URL(getApiBaseUrl())

  if (baseUrl.pathname.endsWith('/api')) {
    baseUrl.pathname = baseUrl.pathname.slice(0, -4) || '/'
  }

  return baseUrl.toString().replace(/\/$/, '')
}
