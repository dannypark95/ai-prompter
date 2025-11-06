// Privacy-friendly analytics helper
// Stores aggregated stats in Redis (no personal data)

async function upstash(cmd, ...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  const body = JSON.stringify([cmd, ...args])
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
    })
    if (!resp.ok) return null
    const json = await resp.json()
    return json.result
  } catch {
    return null
  }
}

export function getUtcDayKey(date = new Date()) {
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function getUtcHourKey(date = new Date()) {
  const day = getUtcDayKey(date)
  const hh = String(date.getUTCHours()).padStart(2, '0')
  return `${day}:${hh}`
}

// Extract referrer domain (privacy-friendly)
export function getReferrerDomain(referer) {
  if (!referer) return 'direct'
  try {
    const url = new URL(referer)
    const host = url.hostname.replace('www.', '')
    // Only store domain, not full URL
    return host || 'direct'
  } catch {
    return 'direct'
  }
}

// Extract country from Cloudflare/Vercel headers (if available)
export function getCountry(request) {
  return request.headers.get('cf-ipcountry') || 
         request.headers.get('x-vercel-ip-country') || 
         'unknown'
}

// Track event (non-blocking, fire-and-forget)
export async function trackEvent(eventType, metadata = {}) {
  if (!process.env.UPSTASH_REDIS_REST_URL) return // Skip if Redis not configured
  
  const day = getUtcDayKey()
  const hour = getUtcHourKey()
  
  // Increment daily total
  await upstash('INCR', `analytics:${eventType}:day:${day}`)
  await upstash('EXPIRE', `analytics:${eventType}:day:${day}`, 86400 * 7) // Keep 7 days
  
  // Increment hourly total
  await upstash('INCR', `analytics:${eventType}:hour:${hour}`)
  await upstash('EXPIRE', `analytics:${eventType}:hour:${hour}`, 86400 * 7)
  
  // Track referrer (domain only)
  if (metadata.referrer) {
    const domain = getReferrerDomain(metadata.referrer)
    await upstash('INCR', `analytics:referrer:${domain}:day:${day}`)
    await upstash('EXPIRE', `analytics:referrer:${domain}:day:${day}`, 86400 * 30) // Keep 30 days
  }
  
  // Track country (if available)
  if (metadata.country && metadata.country !== 'unknown') {
    await upstash('INCR', `analytics:country:${metadata.country}:day:${day}`)
    await upstash('EXPIRE', `analytics:country:${metadata.country}:day:${day}`, 86400 * 30)
  }
  
  // Track user agent category (privacy-friendly)
  if (metadata.userAgent) {
    const ua = metadata.userAgent.toLowerCase()
    let category = 'other'
    if (ua.includes('chrome')) category = 'chrome'
    else if (ua.includes('firefox')) category = 'firefox'
    else if (ua.includes('safari')) category = 'safari'
    else if (ua.includes('edge')) category = 'edge'
    else if (ua.includes('mobile')) category = 'mobile'
    
    await upstash('INCR', `analytics:browser:${category}:day:${day}`)
    await upstash('EXPIRE', `analytics:browser:${category}:day:${day}`, 86400 * 30)
  }
}

// Get analytics summary (for dashboard)
export async function getAnalyticsSummary(days = 7) {
  const today = new Date()
  const summaries = []
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() - i)
    const day = getUtcDayKey(date)
    
    const requests = await upstash('GET', `analytics:enhance:day:${day}`) || 0
    summaries.push({ date: day, requests: Number(requests) || 0 })
  }
  
  return summaries.reverse()
}

