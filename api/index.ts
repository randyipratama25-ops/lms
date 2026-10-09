import type { VercelRequest, VercelResponse } from '@vercel/node'
import { pbkdf2Sync, randomUUID, timingSafeEqual } from 'node:crypto'

const MAX_BODY_BYTES = 250_000
const ACTION_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/
const SESSION_COOKIE = 'lms_session'
const SESSION_TTL_SECONDS = 7200

// Password verification uses PBKDF2 in Apps Script; allow enough time for cold starts and hashing.
export const config = { maxDuration: 60 }

type ApiPayload = Record<string, unknown> & {
  success?: boolean
  data?: Record<string, unknown>
  error?: { code?: string; message?: string }
}


async function callAppsScript(endpoint: string, secret: string, action: string, data: Record<string, unknown>, sessionToken: string, clientIp: string): Promise<ApiPayload> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data, internalSecret: secret, sessionToken, clientIp }),
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  })
  const text = await response.text()
  try { return JSON.parse(text) as ApiPayload } catch {
    throw new Error('InvalidAppsScriptResponse')
  }
}

function verifyStoredPassword(password: string, encodedHash: string): boolean {
  const parts = encodedHash.split('
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
  const requestId = randomUUID()
  try {
    return await handleRequest(req, res, requestId)
  } catch (error) {
    // Catch unexpected failures and always return JSON for the frontend.
    console.error('LMS API handler crashed', {
      requestId,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
    if (res.headersSent) {
      res.end()
      return
    }
    return sendJson(res, 500, {
      success: false,
      message: 'Terjadi kesalahan internal pada API LMS.',
      error: {
        code: 'INTERNAL_API_ERROR',
        message: 'API mengalami kesalahan tak terduga. Sampaikan requestId kepada administrator.',
      },
      requestId,
    })
  }
}

async function handleRequest(req: VercelRequest, res: VercelResponse, requestId: string) {

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

  // Internal bridge actions must never be callable directly from the browser.
  if (['auth.credentials.lookup', 'auth.login.failed', 'auth.session.issue'].includes(action)) {
    return sendJson(res, 404, { success: false, message: 'Action tidak ditemukan.', error: { code: 'NOT_FOUND' }, requestId })
  }

  if (action === 'auth.login') {
    const data = input.data as Record<string, unknown> | undefined
    const username = typeof data?.username === 'string' ? data.username.trim().toLowerCase() : ''
    const password = typeof data?.password === 'string' ? data.password : ''
    if (!/^[a-z0-9._-]{3,64}$/.test(username) || password.length < 1 || password.length > 128) {
      return sendJson(res, 401, { success: false, message: 'Username atau password tidak valid.', error: { code: 'INVALID_CREDENTIALS' }, requestId })
    }

    try {
      const lookup = await callAppsScript(endpoint, secret, 'auth.credentials.lookup', { username }, '', clientIp)
      if (lookup.success !== true) {
        const code = lookup.error?.code
        const status = code === 'ACCOUNT_LOCKED' ? 429 : 401
        return sendJson(res, status, { ...lookup, requestId })
      }

      const account = lookup.data || {}
      const matches = account.found === true &&
        typeof account.passwordHash === 'string' &&
        verifyStoredPassword(password, account.passwordHash)

      if (!matches) {
        const failed = await callAppsScript(endpoint, secret, 'auth.login.failed', { username }, '', clientIp)
        if (failed.error?.code === 'ACCOUNT_LOCKED' || failed.data?.locked === true) {
          return sendJson(res, 429, { success: false, message: 'Terlalu banyak percobaan login. Coba kembali setelah 15 menit.', error: { code: 'ACCOUNT_LOCKED' }, requestId })
        }
        return sendJson(res, 401, { success: false, message: 'Username atau password tidak valid.', error: { code: 'INVALID_CREDENTIALS' }, requestId })
      }

      const issued = await callAppsScript(endpoint, secret, 'auth.session.issue', { userId: String(account.userId || '') }, '', clientIp)
      if (issued.success !== true || typeof issued.data?.sessionToken !== 'string') {
        const code = issued.error?.code
        return sendJson(res, code === 'ACCOUNT_LOCKED' ? 429 : 401, { ...issued, requestId })
      }

      setSessionCookie(res, issued.data.sessionToken)
      const safeData = { ...issued.data }
      delete safeData.sessionToken
      return sendJson(res, 200, { ...issued, data: safeData, requestId })
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
      console.error('LMS login bridge failed', { requestId, errorName: error instanceof Error ? error.name : 'UnknownError', timedOut })
      return sendJson(res, 502, {
        success: false,
        message: timedOut ? 'Backend Google Apps Script terlalu lama merespons.' : 'Login gagal diproses oleh backend.',
        error: { code: timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE', message: 'Periksa log runtime menggunakan requestId ini.' },
        requestId,
      })
    }
  }

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
      signal: AbortSignal.timeout(55_000),
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
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    // Log only safe diagnostic metadata; never log request bodies, passwords, cookies, or secrets.
    console.error('LMS upstream request failed', {
      requestId,
      action,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      timedOut,
    })
    return sendJson(res, 502, {
      success: false,
      message: timedOut ? 'Backend Google Apps Script terlalu lama merespons.' : 'Tidak dapat menghubungi backend Google Apps Script.',
      error: {
        code: timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
        message: timedOut
          ? 'Permintaan backend melewati batas waktu. Periksa durasi eksekusi Apps Script.'
          : 'Periksa URL deployment dan izin Web App.',
      },
      requestId,
    })
  }
}
)
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false
  const iterations = Number(parts[1])
  if (!Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false
  if (!/^[a-f0-9]{64}$/i.test(parts[2]) || !/^[A-Za-z0-9_-]{40,50}$/.test(parts[3])) return false

  try {
    const salt = Buffer.from(parts[2], 'hex')
    const expected = Buffer.from(parts[3], 'base64url')
    if (salt.length !== 32 || expected.length !== 32) return false
    const actual = pbkdf2Sync(password, salt, iterations, 32, 'sha256')
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
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
      signal: AbortSignal.timeout(55_000),
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
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    // Log only safe diagnostic metadata; never log request bodies, passwords, cookies, or secrets.
    console.error('LMS upstream request failed', {
      requestId,
      action,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      timedOut,
    })
    return sendJson(res, 502, {
      success: false,
      message: timedOut ? 'Backend Google Apps Script terlalu lama merespons.' : 'Tidak dapat menghubungi backend Google Apps Script.',
      error: {
        code: timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
        message: timedOut
          ? 'Permintaan backend melewati batas waktu. Periksa durasi eksekusi Apps Script.'
          : 'Periksa URL deployment dan izin Web App.',
      },
      requestId,
    })
  }
}
