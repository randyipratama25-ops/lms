import type { VercelRequest, VercelResponse } from '@vercel/node'

const MAX_BODY_BYTES = 250_000
const ACTION_PATTERN = /^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)+$/
const SESSION_COOKIE = 'lms_session'
const SESSION_TTL_SECONDS = 7200

type ApiPayload = Record<string, unknown> & {
  success?: boolean
  data?: Record<string, unknown>
  error?: { code?: string; message?: string }
}

function sendJson(res: VercelResponse, status: number, body: Record<string, unknown>) {
  res.status(status)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  return res.json(body)
}

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const item of (header || '').split(';')) {
    const separator = item.indexOf('=')
    if (separator < 1) continue
    const key = item.slice(0, separator).trim()
    const value = item.slice(separator + 1).trim()
    try { cookies[key] = decodeURIComponent(value) } catch { /* ignore malformed cookie */ }
  }
  return cookies
}

function setSessionCookie(res: VercelResponse, token: string) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`)
}

function clearSessionCookie(res: VercelResponse) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = crypto.randomUUID()

  if (req.method === 'GET') {
    return sendJson(res, 200, {
      success: true,
      message: 'LMS Vercel API proxy aktif',
      data: { service: 'lms-sekolah-madrasah', proxy: 'ok', backendConfigured: Boolean(process.env.LMS_GAS_WEB_APP_URL && process.env.LMS_API_SHARED_SECRET) },
      requestId,
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return sendJson(res, 405, {
      success: false, message: 'Method tidak didukung.',
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Gunakan GET atau POST.' },
      requestId,
    })
  }

  const endpoint = process.env.LMS_GAS_WEB_APP_URL
  const secret = process.env.LMS_API_SHARED_SECRET
  if (!endpoint || !secret) {
    return sendJson(res, 503, {
      success: false, message: 'Backend belum dikonfigurasi di Vercel.',
      error: { code: 'BACKEND_NOT_CONFIGURED', message: 'Set LMS_GAS_WEB_APP_URL dan LMS_API_SHARED_SECRET.' },
      requestId,
    })
  }

  let parsedUrl: URL
  try { parsedUrl = new URL(endpoint) } catch {
    return sendJson(res, 500, {
      success: false, message: 'URL backend tidak valid.',
      error: { code: 'INVALID_BACKEND_URL', message: 'Periksa konfigurasi backend.' }, requestId,
    })
  }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'script.google.com') {
    return sendJson(res, 500, {
      success: false, message: 'URL backend harus berupa URL HTTPS Google Apps Script.',
      error: { code: 'INVALID_BACKEND_URL', message: 'Gunakan URL deployment script.google.com/macros/s/.../exec.' }, requestId,
    })
  }

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return sendJson(res, 413, {
      success: false, message: 'Request terlalu besar.',
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Batas request 250 KB.' }, requestId,
    })
  }

  let body: unknown
  try { body = JSON.parse(rawBody) } catch {
    return sendJson(res, 400, {
      success: false, message: 'JSON tidak valid.',
      error: { code: 'INVALID_JSON', message: 'Kirim body JSON yang valid.' }, requestId,
    })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return sendJson(res, 400, {
      success: false, message: 'Body harus berupa objek JSON.',
      error: { code: 'INVALID_BODY', message: 'Kirim objek { action, data }.' }, requestId,
    })
  }

  const input = body as { action?: unknown; data?: unknown }
  if (typeof input.action !== 'string' || !ACTION_PATTERN.test(input.action)) {
    return sendJson(res, 400, {
      success: false, message: 'Action tidak valid.',
      error: { code: 'INVALID_ACTION', message: 'Gunakan format action.nama.' }, requestId,
    })
  }
  if (input.data !== undefined && (!input.data || typeof input.data !== 'object' || Array.isArray(input.data))) {
    return sendJson(res, 400, {
      success: false, message: 'Field data harus berupa objek.',
      error: { code: 'INVALID_DATA', message: 'Gunakan data: {} bila tidak ada parameter.' }, requestId,
    })
  }

  const action = input.action
  const cookies = parseCookies(req.headers.cookie)
  const sessionToken = cookies[SESSION_COOKIE] || ''
  const forwarded = req.headers['x-forwarded-for']
  const clientIp = (Array.isArray(forwarded) ? forwarded[0] : forwarded || '').split(',')[0].trim().slice(0, 80)

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        data: input.data ?? {},
        internalSecret: secret,
        sessionToken,
        clientIp,
      }),
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    })
    const responseText = await upstream.text()
    let payload: ApiPayload
    try { payload = JSON.parse(responseText) as ApiPayload } catch {
      return sendJson(res, 502, {
        success: false, message: 'Backend mengembalikan respons yang tidak dapat dibaca.',
        error: { code: 'INVALID_UPSTREAM_RESPONSE', message: 'Periksa deployment Google Apps Script.' }, requestId,
      })
    }

    if (action === 'auth.login' && payload.success === true) {
      const data = payload.data || {}
      const token = typeof data.sessionToken === 'string' ? data.sessionToken : ''
      if (!token) {
        return sendJson(res, 502, {
          success: false, message: 'Backend login tidak mengembalikan sesi.',
          error: { code: 'INVALID_LOGIN_RESPONSE', message: 'Periksa versi deployment Apps Script.' }, requestId,
        })
      }
      setSessionCookie(res, token)
      const safeData = { ...data }
      delete safeData.sessionToken
      return sendJson(res, 200, { ...payload, data: safeData, requestId })
    }

    if (action === 'auth.logout') clearSessionCookie(res)

    const upstreamError = payload.error
    const status = payload.success === true ? 200
      : upstreamError?.code === 'UNAUTHENTICATED' ? 401
      : upstreamError?.code === 'ACCOUNT_LOCKED' ? 429
      : upstreamError?.code === 'NOT_IMPLEMENTED' ? 501
      : upstreamError?.code === 'INVALID_CREDENTIALS' ? 401
      : upstreamError?.code === 'UNAUTHORIZED' ? 502 : 400

    return sendJson(res, status, { ...payload, requestId })
  } catch {
    return sendJson(res, 502, {
      success: false, message: 'Tidak dapat menghubungi backend Google Apps Script.',
      error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Periksa URL deployment dan izin Web App.' }, requestId,
    })
  }
}
