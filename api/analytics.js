// Analytics dashboard endpoint (read-only)
export const config = { runtime: 'edge' }

export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { getAnalyticsSummary } = await import('./_lib/analytics.js')
    const days = parseInt(new URL(request.url).searchParams.get('days') || '7', 10)
    const summary = await getAnalyticsSummary(Math.min(days, 30)) // Max 30 days
    
    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Analytics unavailable', detail: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

