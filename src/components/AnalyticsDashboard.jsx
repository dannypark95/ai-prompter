import { useState, useEffect } from 'react'

export function AnalyticsDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const resp = await fetch(`/api/analytics?days=${days}`)
        if (resp.ok) {
          const json = await resp.json()
          setData(json.summary)
        }
      } catch (err) {
        console.error('Analytics fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [days])

  if (loading && !data) {
    return <div className="p-4 text-center text-slate-500">Loading analytics...</div>
  }

  const total = data?.reduce((sum, day) => sum + day.requests, 0) || 0
  const maxRequests = Math.max(...(data?.map(d => d.requests) || [0]), 1)

  return (
    <div className="p-6 bg-white rounded-lg border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Analytics Dashboard</h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border border-slate-200 rounded px-2 py-1 text-sm"
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      <div className="mb-6">
        <div className="text-3xl font-bold text-slate-900">{total.toLocaleString()}</div>
        <div className="text-sm text-slate-600">Total requests ({days} days)</div>
      </div>

      <div className="space-y-2">
        {data?.map((day) => (
          <div key={day.date} className="flex items-center gap-3">
            <div className="w-20 text-sm text-slate-600">{day.date}</div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                <div
                  className="bg-slate-900 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(day.requests / maxRequests) * 100}%` }}
                />
              </div>
              <div className="w-16 text-sm font-medium text-right">{day.requests}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Auto-refreshes every 30 seconds
      </div>
    </div>
  )
}

