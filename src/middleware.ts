import { NextResponse, type NextRequest } from 'next/server'

const adminSessionHintCookie = 'eo-admin-session'
const lastAdminPathCookie = 'eo-last-admin-path'

const isSafeAdminPath = (path: string | null | undefined): path is string => {
  if (!path) return false

  const value = path.trim()

  if (!value.startsWith('/admin') || value.startsWith('//')) return false

  return value === '/admin' || value.startsWith('/admin/') || value.startsWith('/admin?')
}

const decodeCookiePath = (value: string | undefined) => {
  if (!value) return null

  try {
    const decoded = decodeURIComponent(value)

    return isSafeAdminPath(decoded) ? decoded : null
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const hasAdminHint = request.cookies.get(adminSessionHintCookie)?.value === '1'

  if (pathname.startsWith('/admin')) {
    if (hasAdminHint) return NextResponse.next()

    const loginUrl = request.nextUrl.clone()
    const returnTo = `${pathname}${request.nextUrl.search}`

    loginUrl.pathname = '/login'
    loginUrl.search = ''
    loginUrl.searchParams.set('returnTo', returnTo)

    return NextResponse.redirect(loginUrl)
  }

  if (pathname === '/login' && hasAdminHint && searchParams.get('authCheck') !== '1') {
    const requestedReturnTo = searchParams.get('returnTo')
    const lastAdminPath = decodeCookiePath(request.cookies.get(lastAdminPathCookie)?.value)
    const target = isSafeAdminPath(requestedReturnTo) ? requestedReturnTo : lastAdminPath ?? '/admin/home'
    const targetUrl = new URL(target, request.nextUrl.origin)
    const adminUrl = request.nextUrl.clone()

    adminUrl.pathname = targetUrl.pathname
    adminUrl.search = targetUrl.search

    return NextResponse.redirect(adminUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/login']
}
