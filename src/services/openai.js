const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

export async function enhancePromptWithGpt4oMini(userPrompt, styleKey = 'detailed', promptType = 'rewrite') {
  // Prefer calling our server endpoint if no browser key is present.
  if (!OPENAI_API_KEY) {
    const resp = await fetch('/api/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userPrompt, style: 'detailed', type: promptType }),
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err.detail || err.error || `Server error ${resp.status}`)
    }
    const json = await resp.json()
    return (json.text || '').trim()
  }

  // Local dev direct call template with style instructions
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
  const typeInstruction = TYPE_INSTRUCTIONS[promptType] || TYPE_INSTRUCTIONS.rewrite

  const requestBody = {
    model: 'gpt-4o-mini',
    instructions: `${typeInstruction} Ensure the AI follows it precisely. Keep the user's intent, clarify steps, add constraints when helpful, and avoid changing meaning. ${styleInstruction}`,
    input: userPrompt,
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


