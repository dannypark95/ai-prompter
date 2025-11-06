const STORAGE_KEY = 'ai-prompter:usage:v1'
export const DAILY_LIMIT = 5

// Use UTC day to provide a consistent global reset (00:00 UTC)
function getTodayKey() {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { date: getTodayKey(), count: 0 }
  } catch {
    return { date: getTodayKey(), count: 0 }
  }
}

function writeState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore write errors (private mode, etc.)
  }
}

export function getUsage() {
  const today = getTodayKey()
  const state = readState()
  if (state.date !== today) {
    const fresh = { date: today, count: 0 }
    writeState(fresh)
    return fresh
  }
  return state
}

export function recordUse() {
  const today = getTodayKey()
  const state = getUsage()
  const next = { date: today, count: Math.min(DAILY_LIMIT, (state.count || 0) + 1) }
  writeState(next)
  return next
}

export function getRemaining() {
  const { count } = getUsage()
  return Math.max(0, DAILY_LIMIT - (count || 0))
}

export function msUntilReset() {
  const now = new Date()
  const reset = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1, // next day
    0, 0, 0, 0
  ))
  return Math.max(0, reset.getTime() - now.getTime())
}

export function formatDuration(ms) {
  const totalSec = Math.ceil(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}


