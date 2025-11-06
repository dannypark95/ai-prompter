import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './App.css'
import { enhancePromptWithGpt4oMini } from './services/openai.js'
import { DAILY_LIMIT, getRemaining, recordUse, msUntilReset, formatDuration, formatDurationHMS } from './utils/usageLimit.js'
import logo from './assets/logo.png'

function App() {
  const { t, i18n } = useTranslation()
  const [userPrompt, setUserPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [enhanced, setEnhanced] = useState('')
  const [copied, setCopied] = useState(false)
  const [remaining, setRemaining] = useState(null) // null = loading, number = loaded
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(formatDurationHMS(msUntilReset()))
  const [isLoadingRate, setIsLoadingRate] = useState(true)

  async function handleSubmit() {
    if (!userPrompt.trim() || isLoading) return
    if (remaining !== null && remaining <= 0) {
      setError(t('error.dailyLimit', { limit: DAILY_LIMIT, time: formatDuration(msUntilReset()) }))
      return
    }
    try {
      setIsLoading(true)
      setError('')
      const result = await enhancePromptWithGpt4oMini(userPrompt)
      setEnhanced(result.text)
      if (result.meta && typeof result.meta.remaining === 'number') {
        setRemaining(Math.max(0, result.meta.remaining))
      } else {
        const usage = recordUse()
        setRemaining(Math.max(0, DAILY_LIMIT - usage.count))
      }
    } catch (err) {
      setError(err.message || t('error.somethingWrong'))
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
    if (remaining === null || remaining > 0) return
    setCountdown(formatDurationHMS(msUntilReset()))
    const id = setInterval(() => {
      setCountdown(formatDurationHMS(msUntilReset()))
    }, 1000)
    return () => clearInterval(id)
  }, [remaining])

  // Sync remaining with server on first load and detect country for language
  useEffect(() => {
    async function fetchRateAndDetectLanguage() {
      try {
        const resp = await fetch('/api/rate')
        if (resp.ok) {
          const json = await resp.json()
          
          // Update remaining count
          if (typeof json.remaining === 'number') {
            setRemaining(Math.max(0, json.remaining))
          } else {
            setRemaining(getRemaining())
          }
          
          // Detect country and set language if Korea
          const country = json.country || resp.headers.get('x-country')
          if (country === 'KR' && i18n.language !== 'ko') {
            i18n.changeLanguage('ko').catch(() => {})
          }
        } else {
          setRemaining(getRemaining())
        }
      } catch {
        // Fallback: check browser language and local remaining
        setRemaining(getRemaining())
        const browserLang = navigator.language || navigator.userLanguage
        if (browserLang.startsWith('ko') && i18n.language !== 'ko') {
          i18n.changeLanguage('ko').catch(() => {})
        }
      } finally {
        setIsLoadingRate(false)
      }
    }
    
    fetchRateAndDetectLanguage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen w-screen bg-white text-slate-900 flex items-center justify-center">
      <div className="w-full max-w-3xl px-4">
        <div className="absolute top-4 right-4">
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'ko' ? 'en' : 'ko')}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            aria-label="Switch language"
          >
            {i18n.language === 'ko' ? 'English' : '한국어'}
          </button>
        </div>
        <div className="flex items-center justify-center mb-8">
          <img src={logo} alt={t('title')} className="h-16 w-auto" />
        </div>
        <div className="rounded-2xl border border-slate-200 shadow-sm p-2">
          <textarea
            className="w-full min-h-40 resize-none rounded-xl p-5 text-lg bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-slate-300"
            placeholder={t('placeholder')}
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          
        </div>
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={handleSubmit}
            disabled={isLoading || !userPrompt.trim() || (remaining !== null && remaining <= 0) || isLoadingRate}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-50"
          >
            {isLoading ? t('enhancing') : t('submit')}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
        <div className="mt-1 text-center text-xs text-slate-500">{t('keyboardHint')}</div>
        <div className="mt-2 text-center text-sm text-slate-600 min-h-[20px]">
          {isLoadingRate ? (
            <span className="text-slate-400">{t('loading')}</span>
          ) : remaining !== null && remaining > 0 ? (
            t('remaining', { count: remaining })
          ) : remaining !== null && remaining === 0 ? (
            t('limitReached', { time: countdown })
          ) : null}
        </div>

        {enhanced && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium">{t('enhancedPrompt')}</h2>
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
                {copied ? t('copied') : t('copy')}
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
