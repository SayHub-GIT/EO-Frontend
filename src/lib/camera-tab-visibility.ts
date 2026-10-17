export type CameraVisibilityTarget = Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>

export function onCameraTabHidden(target: CameraVisibilityTarget, stop: () => void): () => void {
  const onVisibilityChange = () => {
    if (target.visibilityState === 'hidden') stop()
  }

  target.addEventListener('visibilitychange', onVisibilityChange)
  if (target.visibilityState === 'hidden') onVisibilityChange()

  return () => target.removeEventListener('visibilitychange', onVisibilityChange)
}
