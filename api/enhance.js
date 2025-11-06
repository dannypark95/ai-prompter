export const config = { runtime: 'edge' }

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const userPrompt = (body && body.prompt) || ''
  const styleKey = 'detailed'
  const typeKey = (body && body.type) || 'rewrite'
  if (!userPrompt || typeof userPrompt !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing prompt' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Track analytics (non-blocking, fire-and-forget)
  try {
    const { trackEvent, getReferrerDomain, getCountry } = await import('./_lib/analytics.js')
    trackEvent('enhance', {
      referrer: request.headers.get('referer'),
      country: getCountry(request),
      userAgent: request.headers.get('user-agent'),
    }).catch(() => {}) // Don't block on analytics errors
  } catch {
    // Analytics optional, don't fail if not configured
  }

  // Server-enforced daily rate limit (Upstash Redis)
  try {
    const { getFingerprint, checkAndIncrementDailyLimit, secondsUntilNextUtcMidnight } = await import('./_lib/limit.js')
    const fp = await getFingerprint(request)
    const result = await checkAndIncrementDailyLimit(fp)
    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'rate_limited',
          detail: 'Daily limit reached',
          reset_seconds: result.ttl,
          remaining: 0,
          limit: result.limit,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'x-rate-limit': String(result.limit), 'x-rate-remaining': '0', 'x-rate-reset': String(result.ttl) } },
      )
    }
    // Attach rate headers on success path as well
    var rateHeaders = { 'x-rate-limit': String(result.limit), 'x-rate-remaining': String(result.remaining), 'x-rate-reset': String(result.ttl) }
  } catch (e) {
    // If Upstash is not configured, proceed without blocking (but do not crash)
    var rateHeaders = {}
  }

  const STYLE_INSTRUCTIONS = {
    detailed:
      "Be thorough and explicit with steps, inputs, outputs, and constraints. Return only the improved prompt.",
  }

  const TYPE_INSTRUCTIONS = {
    rewrite: "Improve and clarify the user's prompt without changing intent.",
    summarize: "Summarize the content clearly, preserving key facts and constraints.",
    brainstorm: "Generate multiple creative approaches or ideas relevant to the prompt.",
  }

  const styleInstruction = STYLE_INSTRUCTIONS.detailed
  const typeInstruction = TYPE_INSTRUCTIONS[typeKey] || TYPE_INSTRUCTIONS.rewrite

  const requestBody = {
    model: 'gpt-4o-mini',
    instructions:
      typeInstruction +
      " Ensure the AI follows it precisely. Keep the user's intent, clarify steps, add constraints when helpful, and avoid changing meaning. " +
      styleInstruction,
    input: userPrompt,
    temperature: 0.2,
  }

  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '')
    return new Response(
      JSON.stringify({ error: 'openai_error', status: upstream.status, detail: text }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const data = await upstream.json()

  let improved = data.output_text
  if (!improved && Array.isArray(data.output)) {
    const first = data.output[0]
    const textChunk = first?.content?.[0]?.text
    if (typeof textChunk === 'string') improved = textChunk
  }
  if (!improved) improved = data.choices?.[0]?.message?.content || ''

  return new Response(JSON.stringify({ text: (improved || '').trim() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...rateHeaders },
  })
}


