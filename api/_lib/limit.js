// Simple server-side limiter using Upstash Redis (REST API)
// Env required: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, RATE_LIMIT_DAILY (optional, default 5), RATE_LIMIT_SECRET (for HMAC)

export function getUtcDayKey(date = new Date()) {
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function secondsUntilNextUtcMidnight() {
  const now = new Date()
  const reset = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ))
  return Math.max(0, Math.floor((reset.getTime() - now.getTime()) / 1000))
}

async function hmacSHA256Hex(secret, data) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  const bytes = new Uint8Array(sig)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function getFingerprint(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0'
  const ua = request.headers.get('user-agent') || 'unknown'
  const secret = process.env.RATE_LIMIT_SECRET || ''
  const basis = `${ip}|${ua}`
  if (!secret) return await hmacSHA256Hex('fallback', basis)
  return await hmacSHA256Hex(secret, basis)
}

async function upstash(cmd, ...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Missing Upstash Redis configuration')
  const body = JSON.stringify([cmd, ...args])
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  })
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(`Upstash error ${resp.status}: ${txt}`)
  }
  const json = await resp.json()
  return json.result
}

export async function checkAndIncrementDailyLimit(fingerprint) {
  const limit = parseInt(process.env.RATE_LIMIT_DAILY || '5', 10)
  const day = getUtcDayKey()
  const key = `rl:${fingerprint}:${day}`
  const ttl = secondsUntilNextUtcMidnight()

  const count = await upstash('INCR', key)
  if (count === 1) {
    // set expiry to next UTC midnight
    await upstash('EXPIRE', key, ttl)
  }

  const remaining = Math.max(0, limit - count)
  return { allowed: count <= limit, count, limit, remaining, ttl }
}

export async function readDailyStatus(fingerprint) {
  const limit = parseInt(process.env.RATE_LIMIT_DAILY || '5', 10)
  const day = getUtcDayKey()
  const key = `rl:${fingerprint}:${day}`
  let count = 0
  try {
    const val = await upstash('GET', key)
    count = val ? parseInt(val, 10) || 0 : 0
  } catch {
    count = 0
  }
  let ttl = 0
  try {
    const t = await upstash('TTL', key)
    ttl = typeof t === 'number' && t > 0 ? t : secondsUntilNextUtcMidnight()
  } catch {
    ttl = secondsUntilNextUtcMidnight()
  }
  const remaining = Math.max(0, limit - count)
  return { count, remaining, limit, ttl }
}


