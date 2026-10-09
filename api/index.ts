import type { VercelRequest, VercelResponse } from '@vercel/node'
import { pbkdf2Sync, randomUUID, timingSafeEqual } from 'node:crypto'

const MAX_BODY_BYTES = 250_000
const ACTION_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/
const SESSION_COOKIE = 'lms_session'
const SESSION_TTL_SECONDS = 7200

// The proxy is designed for short calls; allow enough time for Apps Script cold starts.
export const config = { maxDuration: 60 }

type ApiPayload = {
  success?: boolean
  message?: string
  data?: Record<string, unknown>
  error?: { code?: string; message?: string }
  requestId?: string
  [key: string]: unknown
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
    try {
      cookies[key] = decodeURIComponent(value)
    } catch {
      // Ignore malformed cookie values.
    }
  }
  return cookies
}

function setSessionCookie(res: VercelResponse, token: string) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`,
  )
}

function clearSessionCookie(res: VercelResponse) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  )
}

async function callAppsScript(
  endpoint: string,
  secret: string,
  action: string,
  data: Record<string, unknown>,
  sessionToken: string,
  clientIp: string,
): Promise<ApiPayload> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data, internalSecret: secret, sessionToken, clientIp }),
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  })
  const text = await response.text()
  try {
    return JSON.parse(text) as ApiPayload
  } catch {
    throw new Error('InvalidAppsScriptResponse')
  }
}

function verifyStoredPassword(password: string, encodedHash: string): boolean {
  const parts = encodedHash.split('$')
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

function errorStatus(code: string | undefined): number {
  switch (code) {
    case 'UNAUTHENTICATED':
    case 'INVALID_CREDENTIALS':
      return 401
    case 'ACCOUNT_LOCKED':
      return 429
    case 'NOT_IMPLEMENTED':
      return 501
    case 'UNAUTHORIZED':
      return 502
    case 'AUTH_PROXY_REQUIRED':
      return 500
    default:
      return 400
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = randomUUID()

  try {
    return await handleRequest(req, res, requestId)
  } catch (error) {
    // Log safe metadata only; never log request bodies, passwords, cookies or secrets.
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
      data: {
        service: 'lms-sekolah-madrasah',
        proxy: 'ok',
        backendConfigured: Boolean(process.env.LMS_GAS_WEB_APP_URL && process.env.LMS_API_SHARED_SECRET),
      },
      requestId,
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return sendJson(res, 405, {
      success: false,
      message: 'Method tidak didukung.',
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Gunakan GET atau POST.' },
      requestId,
    })
  }

  const endpoint = process.env.LMS_GAS_WEB_APP_URL
  const secret = process.env.LMS_API_SHARED_SECRET
  if (!endpoint || !secret) {
    return sendJson(res, 503, {
      success: false,
      message: 'Backend belum dikonfigurasi di Vercel.',
      error: { code: 'BACKEND_NOT_CONFIGURED', message: 'Set LMS_GAS_WEB_APP_URL dan LMS_API_SHARED_SECRET.' },
      requestId,
    })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(endpoint)
  } catch {
    return sendJson(res, 500, {
      success: false,
      message: 'URL backend tidak valid.',
      error: { code: 'INVALID_BACKEND_URL', message: 'Periksa konfigurasi backend.' },
      requestId,
    })
  }

  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'script.google.com' || !parsedUrl.pathname.endsWith('/exec')) {
    return sendJson(res, 500, {
      success: false,
      message: 'URL backend tidak valid.',
      error: { code: 'INVALID_BACKEND_URL', message: 'Gunakan URL HTTPS Web App Google Apps Script yang berakhir /exec.' },
      requestId,
    })
  }

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return sendJson(res, 413, {
      success: false,
      message: 'Request terlalu besar.',
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Batas request 250 KB.' },
      requestId,
    })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return sendJson(res, 400, {
      success: false,
      message: 'JSON tidak valid.',
      error: { code: 'INVALID_JSON', message: 'Kirim body JSON yang valid.' },
      requestId,
    })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return sendJson(res, 400, {
      success: false,
      message: 'Body harus berupa objek JSON.',
      error: { code: 'INVALID_BODY', message: 'Kirim objek { action, data }.' },
      requestId,
    })
  }

  const input = body as { action?: unknown; data?: unknown }
  if (typeof input.action !== 'string' || !ACTION_PATTERN.test(input.action)) {
    return sendJson(res, 400, {
      success: false,
      message: 'Action tidak valid.',
      error: { code: 'INVALID_ACTION', message: 'Gunakan format action.nama.' },
      requestId,
    })
  }

  if (input.data !== undefined && (!input.data || typeof input.data !== 'object' || Array.isArray(input.data))) {
    return sendJson(res, 400, {
      success: false,
      message: 'Field data harus berupa objek.',
      error: { code: 'INVALID_DATA', message: 'Gunakan data: {} bila tidak ada parameter.' },
      requestId,
    })
  }

  const action = input.action
  const data = (input.data ?? {}) as Record<string, unknown>
  const cookies = parseCookies(req.headers.cookie)
  const sessionToken = cookies[SESSION_COOKIE] || ''
  const forwarded = req.headers['x-forwarded-for']
  const clientIp = (Array.isArray(forwarded) ? forwarded[0] : forwarded || '').split(',')[0].trim().slice(0, 80)

  // Internal bridge actions must never be directly callable from the browser.
  if (['auth.credentials.lookup', 'auth.login.failed', 'auth.session.issue'].includes(action)) {
    return sendJson(res, 404, {
      success: false,
      message: 'Action tidak ditemukan.',
      error: { code: 'NOT_FOUND', message: 'Action tidak ditemukan.' },
      requestId,
    })
  }

  if (action === 'auth.login') {
    const username = typeof data.username === 'string' ? data.username.trim().toLowerCase() : ''
    const password = typeof data.password === 'string' ? data.password : ''

    if (!/^[a-z0-9._-]{3,64}$/.test(username) || password.length < 1 || password.length > 128) {
      return sendJson(res, 401, {
        success: false,
        message: 'Username atau password tidak valid.',
        error: { code: 'INVALID_CREDENTIALS', message: 'Username atau password tidak valid.' },
        requestId,
      })
    }

    try {
      const lookup = await callAppsScript(endpoint, secret, 'auth.credentials.lookup', { username }, '', clientIp)
      if (lookup.success !== true) {
        return sendJson(res, errorStatus(lookup.error?.code), { ...lookup, requestId })
      }

      const account = lookup.data || {}
      const matches =
        account.found === true &&
        typeof account.passwordHash === 'string' &&
        verifyStoredPassword(password, account.passwordHash)

      if (!matches) {
        const failed = await callAppsScript(endpoint, secret, 'auth.login.failed', { username }, '', clientIp)
        if (failed.error?.code === 'ACCOUNT_LOCKED' || failed.data?.locked === true) {
          return sendJson(res, 429, {
            success: false,
            message: 'Terlalu banyak percobaan login. Coba kembali setelah 15 menit.',
            error: { code: 'ACCOUNT_LOCKED', message: 'Terlalu banyak percobaan login.' },
            requestId,
          })
        }
        return sendJson(res, 401, {
          success: false,
          message: 'Username atau password tidak valid.',
          error: { code: 'INVALID_CREDENTIALS', message: 'Username atau password tidak valid.' },
          requestId,
        })
      }

      const issued = await callAppsScript(
        endpoint,
        secret,
        'auth.session.issue',
        { userId: String(account.userId || '') },
        '',
        clientIp,
      )

      if (issued.success !== true || typeof issued.data?.sessionToken !== 'string') {
        return sendJson(res, errorStatus(issued.error?.code), { ...issued, requestId })
      }

      setSessionCookie(res, issued.data.sessionToken)
      const safeData = { ...issued.data }
      delete safeData.sessionToken
      return sendJson(res, 200, { ...issued, data: safeData, requestId })
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
      console.error('LMS login bridge failed', {
        requestId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        timedOut,
      })
      return sendJson(res, 502, {
        success: false,
        message: timedOut ? 'Backend Google Apps Script terlalu lama merespons.' : 'Login gagal diproses oleh backend.',
        error: {
          code: timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
          message: 'Periksa URL, izin Web App, dan versi Apps Script yang aktif.',
        },
        requestId,
      })
    }
  }

  try {
    const payload = await callAppsScript(endpoint, secret, action, data, sessionToken, clientIp)

    if (action === 'auth.logout') clearSessionCookie(res)

    return sendJson(res, payload.success === true ? 200 : errorStatus(payload.error?.code), {
      ...payload,
      requestId,
    })
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
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
        message: 'Periksa URL, izin Web App, dan versi Apps Script yang aktif.',
      },
      requestId,
    })
  }
}
