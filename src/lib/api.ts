export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data?: T
  error?: { code: string; message: string }
  requestId: string
}

export interface AuthUser {
  userId: string
  username: string
  role: 'admin' | 'teacher' | 'student' | string
}

export interface AuthData {
  user: AuthUser
  expiresAt: string
}

export interface HealthData {
  service: string
  api: string
  status: 'ok' | 'setup_required' | 'unavailable' | string
  database: {
    configured: boolean
    accessible: boolean
    spreadsheetName?: string
    sheetCount?: number
    message?: string
  }
  timezone: string
  checkedAt: string
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export async function apiRequest<T>(
  action: string,
  data: Record<string, unknown> = {},
): Promise<ApiEnvelope<T>> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data }),
  })

  let payload: ApiEnvelope<T>
  try {
    payload = (await response.json()) as ApiEnvelope<T>
  } catch {
    throw new Error(`Respons API tidak valid (HTTP ${response.status}).`)
  }
  if (!response.ok && payload.success) throw new Error('Respons API tidak konsisten.')
  return payload
}

export async function checkBackendHealth(): Promise<ApiEnvelope<HealthData>> {
  return apiRequest<HealthData>('health.check')
}

export async function authLogin(username: string, password: string) {
  return apiRequest<AuthData>('auth.login', { username, password })
}

export async function authMe() {
  return apiRequest<AuthData>('auth.me')
}

export async function authLogout() {
  return apiRequest<{ loggedOut: boolean }>('auth.logout')
}
