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
  { key: 'registration', label: 'Registration', description: 'Public participant registration and registration status.', icon: 'tabler-forms', core: true },
  { key: 'participants', label: 'Participants', description: 'Participant list, status, and participant operations.', icon: 'tabler-users', core: true },
  { key: 'packages', label: 'Packages', description: 'Free or paid packages, quota, benefits, and Midtrans flow.', icon: 'tabler-package', core: true },
  { key: 'checkins', label: 'Check-ins', description: 'QR gate check-in while the event is running.', icon: 'tabler-scan', core: true },
  { key: 'reports', label: 'Reports', description: 'Operational and participant reporting.', icon: 'tabler-chart-bar', core: true },
  { key: 'race-categories', label: 'Race Categories', description: 'Running distance/category setup such as 5K or 10K.', icon: 'tabler-run', recommendedFor: ['Running'] },
  { key: 'race-pack', label: 'Race Pack', description: 'Race pack pickup schedule, distribution, and collection status.', icon: 'tabler-shopping-bag', recommendedFor: ['Running'] },
  { key: 'speakers', label: 'Speakers', description: 'Speaker profiles and seminar lineup.', icon: 'tabler-microphone-2', recommendedFor: ['Seminar'] },
  { key: 'sessions', label: 'Sessions', description: 'Seminar sessions, room, capacity, and attendance.', icon: 'tabler-presentation', recommendedFor: ['Seminar'] },
  { key: 'agenda', label: 'Agenda', description: 'Event rundown and scheduled activities.', icon: 'tabler-calendar-time', recommendedFor: ['Seminar'] },
  { key: 'quiz', label: 'Quiz', description: 'Reserved for the separate quiz implementation.', icon: 'tabler-help-hexagon', recommendedFor: ['Running', 'Seminar'] },
  { key: 'doorprize', label: 'Doorprize', description: 'Prize inventory, draw schedule, winners, and claim notes.', icon: 'tabler-gift', recommendedFor: ['Running', 'Seminar'] },
  { key: 'booths', label: 'Booths', description: 'Booth/activity points and participant engagement.', icon: 'tabler-building-store', recommendedFor: ['Running', 'Seminar'] },
  { key: 'certificates', label: 'Certificates', description: 'Certificate templates, eligibility, and distribution notes.', icon: 'tabler-certificate', recommendedFor: ['Seminar'] }
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

  return []
}

export const defaultEventModules = (kind: ModularEventKind): EventModuleKey[] => {
  const recommended = EVENT_MODULE_DEFINITIONS
    .filter(module => module.key !== 'quiz' && module.recommendedFor?.includes(kind))
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
