import { parseError } from '@/lib/api'
import { authFetch } from '@/lib/auth'

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5174/api').replace(/\/$/, '')

export type ModularEventKind = 'Seminar' | 'Running' | 'Workshop' | 'Other'

export type EventModuleKey =
  | 'registration'
  | 'participants'
  | 'packages'
  | 'checkins'
  | 'reports'
  | 'race-categories'
  | 'race-pack'
  | 'quiz'
  | 'doorprize'
  | 'booths'
  | 'speakers'
  | 'sessions'
  | 'agenda'
  | 'certificates'

export type RegistrationFieldType = 'text' | 'textarea' | 'select' | 'date' | 'number'

export type RegistrationFieldDefinition = {
  key: string
  label: string
  type: RegistrationFieldType
  required: boolean
  options: string[]
}

export type EventWorkspaceItem = {
  id: string
  title: string
  active?: boolean
  packageId?: string | null
  distance?: string | number | null
  contents?: string | null
  pickupLocation?: string | null
  [key: string]: unknown
}

export type EventModuleData = Partial<Record<EventModuleKey, EventWorkspaceItem[]>>

export type EventExperienceConfig = {
  eventId?: string
  kind: ModularEventKind
  enabledModules: EventModuleKey[]
  registrationFields: RegistrationFieldDefinition[]
  moduleData: EventModuleData
}

export type EventModuleDefinition = {
  key: EventModuleKey
  label: string
  description: string
  icon: string
  core?: boolean
  recommendedFor?: ModularEventKind[]
}

export const EVENT_MODULE_DEFINITIONS: EventModuleDefinition[] = [
  { key: 'registration', label: 'Registration', description: 'Public or restricted participant registration and registration status.', icon: 'tabler-forms', core: true },
  { key: 'participants', label: 'Participants', description: 'Participant list, status, and participant operations.', icon: 'tabler-users', core: true },
  { key: 'packages', label: 'Registration Options', description: 'Free or paid registration options, quota, benefits, and payment flow.', icon: 'tabler-package', core: true },
  { key: 'checkins', label: 'Attendance', description: 'Participant check-in, check-out, and attendance operations.', icon: 'tabler-scan', core: true },
  { key: 'reports', label: 'Reports', description: 'Operational, participant, payment, and audit reporting.', icon: 'tabler-chart-bar', core: true },
  { key: 'race-categories', label: 'Categories / Tracks', description: 'Optional participant category, track, class, distance, or program grouping.', icon: 'tabler-category', recommendedFor: ['Running', 'Seminar', 'Workshop'] },
  { key: 'race-pack', label: 'Distribution', description: 'Items, kits, materials, merchandise, or benefits handed over to participants.', icon: 'tabler-shopping-bag', recommendedFor: ['Running', 'Workshop'] },
  { key: 'speakers', label: 'Speakers / Facilitators', description: 'Speaker, trainer, moderator, or facilitator profiles.', icon: 'tabler-microphone-2', recommendedFor: ['Seminar', 'Workshop'] },
  { key: 'sessions', label: 'Sessions', description: 'Sessions, rooms, capacity, and session-specific attendance.', icon: 'tabler-presentation', recommendedFor: ['Seminar', 'Workshop'] },
  { key: 'agenda', label: 'Agenda', description: 'Program rundown and scheduled activities.', icon: 'tabler-calendar-time', recommendedFor: ['Seminar', 'Workshop', 'Other'] },
  { key: 'quiz', label: 'Quiz', description: 'Realtime question rooms, participant answers, scores, leaderboard, and podium.', icon: 'tabler-help-hexagon', recommendedFor: ['Running', 'Seminar', 'Workshop'] },
  { key: 'doorprize', label: 'Prize Draw', description: 'Prize inventory, lucky draw, winners, claims, and audience presentation.', icon: 'tabler-gift', recommendedFor: ['Running', 'Seminar', 'Workshop', 'Other'] },
  { key: 'booths', label: 'Activity Points / Booths', description: 'Booths, activity points, sponsor areas, or participant engagement stations.', icon: 'tabler-building-store', recommendedFor: ['Running', 'Seminar', 'Workshop'] },
  { key: 'certificates', label: 'Certificates / Attendance Proof', description: 'Certificate templates, attendance proof, eligibility, and distribution.', icon: 'tabler-certificate', recommendedFor: ['Seminar', 'Workshop', 'Other'] }
]

export const CORE_EVENT_MODULES: EventModuleKey[] = EVENT_MODULE_DEFINITIONS
  .filter(module => module.core)
  .map(module => module.key)

export const defaultRegistrationFields = (kind: ModularEventKind): RegistrationFieldDefinition[] => {
  if (kind === 'Running') {
    return [
      { key: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true, options: [] },
      { key: 'gender', label: 'Gender', type: 'select', required: true, options: ['Male', 'Female'] },
      { key: 'jerseySize', label: 'Jersey Size', type: 'select', required: true, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { key: 'emergencyContact', label: 'Emergency Contact', type: 'text', required: true, options: [] },
      { key: 'runningCommunity', label: 'Running Community', type: 'text', required: false, options: [] }
    ]
  }

  if (kind === 'Seminar') {
    return [
      { key: 'attendeeType', label: 'Attendee Type', type: 'select', required: true, options: ['Student', 'Professional', 'General'] },
      { key: 'institution', label: 'Institution / Company', type: 'text', required: false, options: [] },
      { key: 'position', label: 'Position / Role', type: 'text', required: false, options: [] }
    ]
  }

  if (kind === 'Workshop') {
    return [
      { key: 'participantType', label: 'Participant Type', type: 'select', required: true, options: ['Student', 'Professional', 'Internal Staff', 'General'] },
      { key: 'institution', label: 'Institution / Company', type: 'text', required: false, options: [] },
      { key: 'position', label: 'Position / Role', type: 'text', required: false, options: [] },
      { key: 'experienceLevel', label: 'Experience Level', type: 'select', required: false, options: ['Beginner', 'Intermediate', 'Advanced'] },
      { key: 'specialNeeds', label: 'Special Requirements / Notes', type: 'textarea', required: false, options: [] }
    ]
  }

  return [
    { key: 'participantType', label: 'Participant Type', type: 'select', required: false, options: ['Internal', 'External', 'Guest'] },
    { key: 'organization', label: 'Organization / Unit', type: 'text', required: false, options: [] },
    { key: 'notes', label: 'Participant Notes', type: 'textarea', required: false, options: [] }
  ]
}

export const defaultEventModules = (kind: ModularEventKind): EventModuleKey[] => {
  const recommended = EVENT_MODULE_DEFINITIONS
    .filter(module => module.recommendedFor?.includes(kind))
    .map(module => module.key)

  return [...CORE_EVENT_MODULES, ...recommended]
}

export const createDefaultExperienceConfig = (kind: ModularEventKind): EventExperienceConfig => ({
  kind,
  enabledModules: defaultEventModules(kind),
  registrationFields: defaultRegistrationFields(kind),
  moduleData: {}
})

const ensureOk = async (response: Response, fallback: string) => {
  if (response.status === 403) throw new Error('You are not authorized to configure this event.')
  if (!response.ok) throw new Error(await parseError(response, fallback))
}

const normalizeExperience = (value: EventExperienceConfig): EventExperienceConfig => ({
  ...value,
  moduleData: value.moduleData ?? {}
})

export async function getAdminEventExperience(eventId: string): Promise<EventExperienceConfig> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/experience`, { cache: 'no-store' })
  await ensureOk(response, 'Unable to load event modules.')
  return normalizeExperience((await response.json()) as EventExperienceConfig)
}

export async function updateAdminEventExperience(
  eventId: string,
  config: Pick<EventExperienceConfig, 'enabledModules' | 'registrationFields'> & Partial<Pick<EventExperienceConfig, 'moduleData'>>
): Promise<EventExperienceConfig> {
  const response = await authFetch(`/admin/events/${encodeURIComponent(eventId)}/experience`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })

  await ensureOk(response, 'Unable to save event modules.')
  return normalizeExperience((await response.json()) as EventExperienceConfig)
}

export async function getPublicEventExperience(eventId: string): Promise<EventExperienceConfig> {
  const response = await fetch(`${apiUrl}/events/${encodeURIComponent(eventId)}/experience`, { cache: 'no-store' })
  if (!response.ok) throw new Error(await parseError(response, 'Unable to load event registration configuration.'))
  return normalizeExperience((await response.json()) as EventExperienceConfig)
}
