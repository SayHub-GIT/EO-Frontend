import { isIP } from 'node:net'
import { pathToFileURL } from 'node:url'

const reservedHost = (host) => {
  const hostname = host.toLowerCase().replace(/\.$/, '')
  const forbiddenSuffixes = ['.invalid', '.test', '.example', '.localhost', '.local', '.internal']
  if (hostname === 'localhost' || hostname === 'example.com' || hostname.endsWith('.example.com')) return true
  if (forbiddenSuffixes.some(suffix => hostname.endsWith(suffix))) return true

  const ipVersion = isIP(hostname.replace(/^\[|\]$/g, ''))
  if (ipVersion === 6) {
    const plain = hostname.replace(/^\[|\]$/g, '')
    return plain === '::1' || plain === '::' || /^(fc|fd|fe8|fe9|fea|feb)/i.test(plain)
  }
  if (ipVersion === 4) {
    const octets = hostname.split('.').map(Number)
    return octets[0] === 0 || octets[0] === 10 || octets[0] === 127 ||
      (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168)
  }
  return false
}

const validatePublicUrl = (value, label, requiredPath, errors) => {
  if (!value?.trim()) {
    errors.push(`${label} harus diisi untuk deploy produksi.`)
    return
  }

  let url
  try {
    url = new URL(value.trim())
  } catch {
    errors.push(`${label} harus berupa URL HTTPS absolut yang valid.`)
    return
  }

  if (url.protocol !== 'https:' || !url.hostname) {
    errors.push(`${label} harus menggunakan HTTPS.`)
  }
  if (url.username || url.password || url.search || url.hash) {
    errors.push(`${label} tidak boleh mengandung credentials, query, atau fragment.`)
  }
  if (reservedHost(url.hostname)) {
    errors.push(`${label} tidak boleh menggunakan host lokal, privat, atau domain contoh.`)
  }
  if (url.pathname.replace(/\/+$/, '') !== requiredPath) {
    errors.push(requiredPath === '/api'
      ? `${label} harus menunjuk tepat ke path /api.`
      : `${label} harus menunjuk ke origin aplikasi tanpa path tambahan.`)
  }
}

export const validateReleaseConfig = (env) => {
  const errors = []

  validatePublicUrl(env.NEXT_PUBLIC_API_URL, 'NEXT_PUBLIC_API_URL', '/api', errors)
  validatePublicUrl(env.NEXT_PUBLIC_APP_URL, 'NEXT_PUBLIC_APP_URL', '', errors)

  const clientId = Boolean(env.CF_ACCESS_CLIENT_ID?.trim())
  const clientSecret = Boolean(env.CF_ACCESS_CLIENT_SECRET?.trim())
  if (clientId !== clientSecret) {
    errors.push('CF_ACCESS_CLIENT_ID dan CF_ACCESS_CLIENT_SECRET harus dikonfigurasi bersama.')
  }

  for (const key of Object.keys(env)) {
    if (/^NEXT_PUBLIC_.*(?:SECRET|PASSWORD|PRIVATE_KEY|ACCESS_TOKEN)$/i.test(key) && env[key]?.trim()) {
      errors.push(`${key} tidak boleh memuat kredensial privat di frontend.`)
    }
  }

  return errors
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = validateReleaseConfig(process.env)
  if (errors.length) {
    process.stderr.write(`Release preflight gagal:\n${errors.map(item => `- ${item}`).join('\n')}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write('Release preflight valid: URL publik dan pasangan kredensial terkonfigurasi.\n')
  }
}
