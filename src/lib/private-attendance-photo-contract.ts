export const MAX_PRIVATE_ATTENDANCE_PHOTO_BYTES = 400 * 1024

const jpegError = () => new Error('Foto dari server tidak valid atau ukurannya terlalu besar.')

export async function readPrivateAttendanceJpeg(response: Response): Promise<Blob> {
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
  if (contentType !== 'image/jpeg') throw jpegError()

  const declaredLength = response.headers.get('content-length')
  if (declaredLength !== null) {
    const length = Number(declaredLength)
    if (!Number.isSafeInteger(length) || length < 4 || length > MAX_PRIVATE_ATTENDANCE_PHOTO_BYTES) {
      throw jpegError()
    }
  }

  if (!response.body) throw jpegError()

  const reader = response.body.getReader()
  const parts: Uint8Array[] = []
  let size = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!(value instanceof Uint8Array) || size + value.byteLength > MAX_PRIVATE_ATTENDANCE_PHOTO_BYTES) {
        throw jpegError()
      }
      size += value.byteLength
      parts.push(value)
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  } finally {
    reader.releaseLock()
  }

  if (size < 4) throw jpegError()

  const bytes = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.byteLength
  }

  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 ||
      bytes[size - 2] !== 0xff || bytes[size - 1] !== 0xd9) {
    throw jpegError()
  }

  return new Blob([bytes], { type: 'image/jpeg' })
}
