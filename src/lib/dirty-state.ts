export const createDirtySnapshot = (value: unknown) =>
  JSON.stringify(value, (_key, candidate) => {
    if (typeof File !== 'undefined' && candidate instanceof File) {
      return {
        __type: 'File',
        name: candidate.name,
        size: candidate.size,
        type: candidate.type,
        lastModified: candidate.lastModified
      }
    }

    return candidate
  })
