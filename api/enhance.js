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
  if (!userPrompt || typeof userPrompt !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing prompt' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const requestBody = {
    model: 'gpt-4o-mini',
    input:
      "Improve this prompt so an AI follows it precisely. Keep the user's intent, clarify steps, add constraints when helpful, and avoid changing meaning. Return only the improved prompt.\n\nUser prompt:\n" + userPrompt,
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
    headers: { 'Content-Type': 'application/json' },
  })
}


