export const config = { runtime: 'edge' }

export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { getFingerprint, readDailyStatus } = await import('./_lib/limit.js')
    const fp = await getFingerprint(request)
    const status = await readDailyStatus(fp)
    return new Response(
      JSON.stringify({
        remaining: status.remaining,
        limit: status.limit,
        reset_seconds: status.ttl,
        count: status.count,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-rate-limit': String(status.limit),
          'x-rate-remaining': String(status.remaining),
          'x-rate-reset': String(status.ttl),
        },
      },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: 'unavailable' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}


