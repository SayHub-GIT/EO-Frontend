export async function sendWithUnauthorizedReplayPolicy(
  request: () => Promise<Response>,
  refreshSession: () => Promise<void>,
  retryOn401: boolean
): Promise<Response> {
  const response = await request()
  if (response.status !== 401 || !retryOn401) return response

  await refreshSession()
  return request()
}
