const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

export async function enhancePromptWithGpt4oMini(userPrompt) {
  // Prefer calling our server endpoint if no browser key is present.
  if (!OPENAI_API_KEY) {
    const resp = await fetch('/api/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userPrompt }),
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err.detail || err.error || `Server error ${resp.status}`)
    }
    const json = await resp.json()
    return (json.text || '').trim()
  }

  const requestBody = {
    model: 'gpt-4o-mini',
    input: `Improve this prompt so an AI follows it precisely. Keep the user's intent, clarify steps, add constraints when helpful, and avoid changing meaning. Return only the improved prompt.\n\nUser prompt:\n${userPrompt}`,
    temperature: 0.2,
  }

  console.log('[openai] request', requestBody)

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    console.error('[openai] http error', response.status, errorText)
    throw new Error(`OpenAI error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  console.log('[openai] response', data)

  // Prefer Responses API convenience field if present
  let improved = data.output_text

  // Fallback: traverse the output array shape
  if (!improved && Array.isArray(data.output)) {
    const first = data.output[0]
    const textChunk = first?.content?.[0]?.text
    if (typeof textChunk === 'string') improved = textChunk
  }

  // Older chat format fallback
  if (!improved) {
    improved = data.choices?.[0]?.message?.content
  }

  return (improved || '').trim()
}


