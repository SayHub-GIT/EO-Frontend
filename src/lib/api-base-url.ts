const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5174/api').replace(/\/$/, '')

const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

const isLoopbackHost = (host: string) => loopbackHosts.has(host.toLowerCase())

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
