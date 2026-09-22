import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({
    commitSha:
      process.env.VERCEL_GIT_COMMIT_SHA ??
      process.env.RELEASE_COMMIT_SHA ??
      'unknown',
    environment:
      process.env.VERCEL_ENV ??
      process.env.NODE_ENV ??
      'unknown'
  })
}
