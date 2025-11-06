export const config = { runtime: 'edge' }

export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { getFingerprint, readDailyStatus, getCountry } = await import('./_lib/limit.js')
    const fp = await getFingerprint(request)
    const status = await readDailyStatus(fp)
    const country = getCountry(request)
    return new Response(
      JSON.stringify({
        remaining: status.remaining,
        limit: status.limit,
        reset_seconds: status.ttl,
        count: status.count,
        country: country,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-rate-limit': String(status.limit),
          'x-rate-remaining': String(status.remaining),
          'x-rate-reset': String(status.ttl),
          'x-country': country,
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


