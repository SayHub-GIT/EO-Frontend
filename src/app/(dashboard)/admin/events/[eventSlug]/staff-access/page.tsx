import { redirect } from 'next/navigation'

/**
 * Legacy Super Admin staff-access URL. Staff assignment belongs only to
 * Admin Kecil and is now exposed from its event workspace (Assigned Staff).
 * Redirect old links to the single-purpose Event Admin Access editor.
 */
type LegacyStaffAccessProps = {
  params: Promise<{ eventSlug: string }>
  searchParams: Promise<{ adminKecilId?: string }>
}

export default async function LegacyStaffAccessPage({ params, searchParams }: LegacyStaffAccessProps) {
  const { eventSlug } = await params
  const { adminKecilId } = await searchParams
  const base = `/admin/events/${encodeURIComponent(eventSlug)}/admin-kecil-access`
  const candidate = adminKecilId ? `?userId=${encodeURIComponent(adminKecilId)}` : ''

  redirect(`${base}${candidate}`)
}
