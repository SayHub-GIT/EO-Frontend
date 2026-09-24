'use client'

const storagePrefix = 'eo-profile-avatar:'
const avatarChangeEvent = 'eo-profile-avatar-change'
const maxSourceBytes = 8 * 1024 * 1024
const outputSize = 512
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

type AvatarChangeDetail = {
  userId: string
  avatarUrl: string | null
}

const storageKey = (userId: string) => `${storagePrefix}${userId.trim()}`

export function getProfileAvatar(userId: string | null | undefined): string | null {
  if (typeof window === 'undefined' || !userId?.trim()) return null

  try {
    return window.localStorage.getItem(storageKey(userId))
  } catch {
    return null
  }
}

const emitAvatarChange = (userId: string, avatarUrl: string | null) => {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent<AvatarChangeDetail>(avatarChangeEvent, {
      detail: { userId, avatarUrl }
    })
  )
}

export function setProfileAvatar(userId: string, avatarUrl: string) {
  if (typeof window === 'undefined' || !userId.trim()) return

  window.localStorage.setItem(storageKey(userId), avatarUrl)
  emitAvatarChange(userId, avatarUrl)
}

export function removeProfileAvatar(userId: string) {
  if (typeof window === 'undefined' || !userId.trim()) return

  window.localStorage.removeItem(storageKey(userId))
  emitAvatarChange(userId, null)
}

export function subscribeProfileAvatar(
  userId: string,
  listener: (avatarUrl: string | null) => void
) {
  if (typeof window === 'undefined' || !userId.trim()) return () => undefined

  const key = storageKey(userId)

  const onCustomChange = (event: Event) => {
    const detail = (event as CustomEvent<AvatarChangeDetail>).detail

    if (detail?.userId === userId) listener(detail.avatarUrl)
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === key) listener(event.newValue)
  }

  window.addEventListener(avatarChangeEvent, onCustomChange)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(avatarChangeEvent, onCustomChange)
    window.removeEventListener('storage', onStorage)
  }
}

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Unable to read this image.'))
    }

    image.src = url
  })

export async function createProfileAvatarDataUrl(file: File): Promise<string> {
  if (!allowedTypes.has(file.type)) {
    throw new Error('Please choose a JPG, PNG, or WebP image.')
  }

  if (file.size > maxSourceBytes) {
    throw new Error('Profile photo must be smaller than 8 MB.')
  }

  const image = await loadImage(file)
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)

  if (!sourceSize) throw new Error('Unable to read this image.')

  const targetSize = Math.min(outputSize, sourceSize)
  const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2)
  const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2)
  const canvas = document.createElement('canvas')

  canvas.width = targetSize
  canvas.height = targetSize

  const context = canvas.getContext('2d')

  if (!context) throw new Error('Unable to process this image.')

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    targetSize,
    targetSize
  )

  const avatarUrl = canvas.toDataURL('image/webp', 0.86)

  if (!avatarUrl || avatarUrl === 'data:,') {
    throw new Error('Unable to process this image.')
  }

  return avatarUrl
}
