import { useState, useEffect } from 'react'
import './App.css'
import { enhancePromptWithGpt4oMini } from './services/openai.js'
import { DAILY_LIMIT, getRemaining, recordUse, msUntilReset, formatDuration, formatDurationHMS } from './utils/usageLimit.js'

function App() {
  const [userPrompt, setUserPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [enhanced, setEnhanced] = useState('')
  const [copied, setCopied] = useState(false)
  const [remaining, setRemaining] = useState(getRemaining())
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(formatDurationHMS(msUntilReset()))
  

  async function handleSubmit() {
    if (!userPrompt.trim() || isLoading) return
    if (remaining <= 0) {
      setError(`Daily limit reached (${DAILY_LIMIT}). Resets in ${formatDuration(msUntilReset())}.`)
      return
    }
    try {
      setIsLoading(true)
      setError('')
      const improved = await enhancePromptWithGpt4oMini(userPrompt)
      setEnhanced(improved)
      const usage = recordUse()
      setRemaining(Math.max(0, DAILY_LIMIT - usage.count))
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(event) {
    const isMetaEnter = (event.metaKey || event.ctrlKey) && event.key === 'Enter'
    if (isMetaEnter) {
      event.preventDefault()
      handleSubmit()
    }
  }

  // Live countdown when limit reached
  useEffect(() => {
    if (remaining > 0) return
    setCountdown(formatDurationHMS(msUntilReset()))
    const id = setInterval(() => {
      setCountdown(formatDurationHMS(msUntilReset()))
    }, 1000)
    return () => clearInterval(id)
  }, [remaining])

  return (
    <div className="min-h-screen w-screen bg-white text-slate-900 flex items-center justify-center">
      <div className="w-full max-w-3xl px-4">
        <h1 className="text-5xl font-semibold text-center mb-8">AI Prompt Enhancer</h1>
        <div className="rounded-2xl border border-slate-200 shadow-sm p-2">
          <textarea
            className="w-full min-h-40 resize-none rounded-xl p-5 text-lg bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-slate-300"
            placeholder="Type your prompt and press ⌘⏎ (or Ctrl+Enter)"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          
        </div>
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={handleSubmit}
            disabled={isLoading || !userPrompt.trim() || remaining <= 0}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-50"
          >
            {isLoading ? 'Enhancing…' : 'Submit'}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
        <div className="mt-2 text-center text-sm text-slate-600">
          {remaining > 0
            ? (
              <>You have {remaining} free {remaining === 1 ? 'use' : 'uses'} left today</>
            ) : (
              <>Daily limit reached. New credits in {countdown} (00:00 UTC)</>
            )}
        </div>

        {enhanced && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium">Enhanced prompt</h2>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(enhanced)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
                className={`text-sm px-3 py-1 rounded-md border border-slate-200 ${
                  copied ? 'bg-emerald-100 text-emerald-900' : 'bg-white hover:bg-slate-50'
                }`}
                aria-live="polite"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <pre className="whitespace-pre-wrap break-words text-slate-900">{enhanced}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
