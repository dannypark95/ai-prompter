# AI Prompt Enhancer

A web application that improves and optimizes AI prompts using GPT-4o mini. Users can submit prompts and receive enhanced versions with better clarity, structure, and detail.

## 🎯 Product Overview

**What it does:**

- Takes user-submitted prompts and enhances them using OpenAI's GPT-4o mini model
- Provides detailed, explicit, and well-structured prompt improvements
- Enforces daily rate limits (5 requests per user per day, resets at UTC midnight)
- Clean, minimal UI inspired by Gemini's design

**Key Features:**

- ✅ Server-side rate limiting with Redis (Upstash)
- ✅ Secure API key handling (never exposed to client)
- ✅ Real-time remaining quota display with countdown
- ✅ Vercel Analytics integration (traffic monitoring)
- ✅ Privacy-friendly custom analytics (referrers, countries, browsers)
- ✅ Keyboard shortcuts (⌘⏎ / Ctrl+Enter)
- ✅ Copy-to-clipboard for enhanced prompts
- ✅ Responsive design with Tailwind CSS

## 🏗️ Architecture

### Frontend (React + Vite)

- **Location:** `src/`
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS v4
- **Deployment:** Static files served by Vercel

**Key Components:**

- `src/App.jsx` - Main UI component
- `src/main.jsx` - App entry point with Vercel Analytics integration
- `src/services/openai.js` - API client (calls server endpoint in production)
- `src/utils/usageLimit.js` - Client-side UX counter (server is source of truth)

### Backend (Vercel Edge Functions)

- **Location:** `api/`
- **Runtime:** Vercel Edge Functions (serverless)
- **Deployment:** Auto-deployed with Vercel

**Key Files:**

- `api/enhance.js` - Main API endpoint (rate limiting + OpenAI call)
- `api/rate.js` - Read-only endpoint to check current quota
- `api/_lib/limit.js` - Rate limiting logic with Upstash Redis

## 🛠️ Tech Stack

| Component | Technology            | Purpose                       |
| --------- | --------------------- | ----------------------------- |
| Frontend  | React 19, Vite        | UI framework & build tool     |
| Styling   | Tailwind CSS v4       | Utility-first CSS             |
| Backend   | Vercel Edge Functions | Serverless API endpoints      |
| Database  | Upstash Redis         | Rate limiting storage         |
| AI Model  | OpenAI GPT-4o mini    | Prompt enhancement            |
| Analytics | Vercel Analytics      | Real-time traffic monitoring  |
| Hosting   | Vercel                | Frontend + backend deployment |

## 📋 Prerequisites

- Node.js 18+ and npm
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- Upstash Redis account ([free tier available](https://upstash.com))
- Vercel account (for deployment)

## 🚀 Local Development Setup

### 1. Clone and Install

```bash
git clone https://github.com/dannypark95/ai-prompter.git
cd ai-prompter
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
# For local dev: direct OpenAI calls (optional)
VITE_OPENAI_API_KEY=sk-your-openai-key-here

# Note: In production, this should NOT be set.
# The client will use the server endpoint instead.
```

### 3. Run Development Server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

**Local Dev Behavior:**

- If `VITE_OPENAI_API_KEY` is set: client calls OpenAI directly (for convenience)
- If not set: client calls `/api/enhance` (requires Vercel dev server)

### 4. Test with Vercel Dev (Optional)

To test the server endpoints locally:

```bash
npm i -g vercel
vercel dev
```

This will:

- Run Vercel Edge Functions locally
- Prompt for environment variables (set `OPENAI_API_KEY`, `UPSTASH_REDIS_REST_URL`, etc.)
- Serve both frontend and API routes

## 🌐 Production Deployment (Vercel)

### 1. Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Import to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel auto-detects Vite configuration

### 3. Environment Variables

In Vercel → Project → Settings → Environment Variables, add:

| Variable                   | Description                     | Example                 |
| -------------------------- | ------------------------------- | ----------------------- |
| `OPENAI_API_KEY`           | Your OpenAI secret key          | `sk-...`                |
| `UPSTASH_REDIS_REST_URL`   | Upstash Redis REST endpoint     | `https://...upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token        | `...`                   |
| `RATE_LIMIT_SECRET`        | Secret for HMAC fingerprinting  | `openssl rand -hex 32`  |
| `RATE_LIMIT_DAILY`         | Daily limit per user (optional) | `5` (default)           |

**Important:** Do NOT add `VITE_OPENAI_API_KEY` in production. The client should use the server endpoint.

### 4. Deploy

Vercel automatically deploys on push to `main`. Or manually trigger from the dashboard.

## 🔒 Rate Limiting Architecture

### How It Works

1. **Fingerprinting:**

   - Server generates a unique fingerprint per user: `HMAC-SHA256(IP + User-Agent, secret)`
   - No personal data stored; only a hash

2. **Storage:**

   - Redis key format: `rl:{fingerprint}:{YYYY-MM-DD}` (UTC date)
   - Value: integer count (1, 2, 3, ...)
   - TTL: Automatically expires at next UTC midnight

3. **Enforcement:**

   - Every `/api/enhance` request increments the counter (atomic `INCR`)
   - If count > limit (default 5): returns HTTP 429
   - Response includes `reset_seconds` (time until reset)

4. **Client Sync:**
   - On page load: calls `/api/rate` to get current quota (read-only, no increment)
   - After each submit: reads `x-rate-remaining` header from response
   - UI shows accurate remaining count from server

### Why Server-Side?

- **Security:** Client-side limits can be bypassed (clearing localStorage, scripts)
- **Accuracy:** Single source of truth in Redis
- **Scalability:** Works across devices/browsers for same user

## 🔐 Security Features

- ✅ **API Key Protection:** OpenAI key never sent to browser; only used server-side
- ✅ **Rate Limiting:** Server-enforced to prevent abuse
- ✅ **HMAC Fingerprinting:** Prevents spoofing of user identity
- ✅ **Input Validation:** Server validates all inputs before processing
- ✅ **Error Handling:** Graceful fallbacks if Redis/OpenAI unavailable

## 💰 Cost Analysis

### Estimated Monthly Costs (at scale)

| Service                | Free Tier | Paid Usage                  | Notes                            |
| ---------------------- | --------- | --------------------------- | -------------------------------- |
| **Vercel**             | ✅ Free   | $0                          | Hobby plan covers most use cases |
| **Upstash Redis**      | ✅ Free   | $0                          | 500k requests/month free tier    |
| **OpenAI GPT-4o mini** | ❌        | ~$0.15-0.30 per 1k requests | Main cost driver                 |

**Example:** 1,000 requests/month ≈ **$0.15-0.30/month**

**Cost Optimization Tips:**

- Use `gpt-4o-mini` (cheapest GPT-4 model)
- Set `temperature: 0.2` (deterministic, faster)
- Monitor usage in OpenAI dashboard
- Set hard spending limits in OpenAI billing

## 📡 API Endpoints

### `POST /api/enhance`

Enhances a user prompt.

**Request:**

```json
{
  "prompt": "Write a blog post about AI"
}
```

**Response (200):**

```json
{
  "text": "Enhanced prompt text here..."
}
```

**Response Headers:**

- `x-rate-limit`: Daily limit (e.g., `5`)
- `x-rate-remaining`: Remaining uses (e.g., `3`)
- `x-rate-reset`: Seconds until reset (e.g., `43200`)

**Response (429 - Rate Limited):**

```json
{
  "error": "rate_limited",
  "detail": "Daily limit reached",
  "reset_seconds": 43200,
  "remaining": 0,
  "limit": 5
}
```

### `GET /api/rate`

Read-only endpoint to check current quota (doesn't consume a request).

**Response (200):**

```json
{
  "remaining": 3,
  "limit": 5,
  "reset_seconds": 43200,
  "count": 2
}
```

## 🧪 Testing

### Manual Testing

1. **Rate Limit Test:**

   ```bash
   # Make 6 requests (should fail on 6th)
   for i in {1..6}; do
     curl -X POST https://your-app.vercel.app/api/enhance \
       -H "Content-Type: application/json" \
       -d '{"prompt":"test"}'
     echo ""
   done
   ```

2. **Check Redis:**

   - Go to Upstash Console → Data Browser
   - Search for keys matching `rl:*`
   - Verify count increments and TTL is set

3. **UI Testing:**
   - Submit prompts and verify enhanced output
   - Check remaining count updates correctly
   - Test countdown when limit reached
   - Verify copy-to-clipboard works

### Automated Testing (Future)

Consider adding:

- Vitest for unit tests
- React Testing Library for component tests
- E2E tests with Playwright

## 📁 Project Structure

```
ai-prompter/
├── api/                    # Backend (Vercel Edge Functions)
│   ├── enhance.js         # Main API endpoint
│   ├── rate.js            # Quota check endpoint
│   └── _lib/
│       └── limit.js        # Rate limiting logic
├── src/                    # Frontend (React)
│   ├── App.jsx            # Main component
│   ├── services/
│   │   └── openai.js       # API client
│   └── utils/
│       └── usageLimit.js   # Client-side UX counter
├── public/                 # Static assets
├── index.html
├── vite.config.js
└── package.json
```

## 🐛 Troubleshooting

### "Missing OPENAI_API_KEY"

- Check Vercel environment variables are set
- Ensure variable name is exactly `OPENAI_API_KEY`
- Redeploy after adding env vars

### "Upstash error"

- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are correct
- Check Upstash dashboard for service status
- Ensure you're using REST API credentials (not TCP)

### Rate limit not working

- Check Redis keys in Upstash Data Browser
- Verify `RATE_LIMIT_SECRET` is set (for HMAC)
- Check Vercel Runtime Logs for errors

### UI shows wrong remaining count

- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Check browser console for errors
- Verify `/api/rate` endpoint returns correct data

## 📊 Analytics & Monitoring

### Built-in Analytics

The app includes privacy-friendly analytics that track usage patterns without storing personal data.

**What's Tracked:**

- ✅ Request counts (daily/hourly aggregates)
- ✅ Referrer domains (e.g., `google.com`, `twitter.com`, `direct`)
- ✅ Country (from Cloudflare/Vercel headers)
- ✅ Browser category (Chrome, Firefox, Safari, etc.)
- ❌ No IP addresses stored
- ❌ No personal data collected
- ❌ No full URLs stored (only domains)

**How It Works:**

- Analytics are stored in Redis with automatic expiration (7-30 days)
- Non-blocking (fire-and-forget, doesn't slow down requests)
- GDPR-friendly (aggregated data only)

### Viewing Analytics

**API Endpoint:**

```bash
GET /api/analytics?days=7
```

**Response:**

```json
{
  "summary": [
    { "date": "2025-01-15", "requests": 42 },
    { "date": "2025-01-16", "requests": 38 },
    ...
  ]
}
```

**Redis Keys (for manual inspection):**

- `analytics:enhance:day:{YYYY-MM-DD}` - Daily request counts
- `analytics:enhance:hour:{YYYY-MM-DD:HH}` - Hourly request counts
- `analytics:referrer:{domain}:day:{YYYY-MM-DD}` - Referrer stats
- `analytics:country:{code}:day:{YYYY-MM-DD}` - Country stats
- `analytics:browser:{category}:day:{YYYY-MM-DD}` - Browser stats

### Monitoring Best Practices

#### 1. **Vercel Analytics (✅ Integrated)**

Vercel Analytics is already integrated in the codebase. To enable it:

1. **Deploy your changes** (the `<Analytics />` component is already added to `src/main.jsx`)
2. Go to Vercel Dashboard → Project → Analytics
3. Click "Enable Web Analytics" (free tier available)
4. Wait ~30 seconds after visiting your site

**What's Already Set Up:**

- ✅ `@vercel/analytics` package installed
- ✅ `<Analytics />` component added to `src/main.jsx`
- ✅ Automatic page view tracking (no additional code needed)

**What You Get:**

- Real-time page views and unique visitors
- Top referrers (where traffic comes from)
- Geographic breakdown (countries)
- Device/browser statistics
- Page performance metrics
- Zero configuration needed (just enable in dashboard)

#### 2. **Error Tracking (Sentry)**

For production error monitoring:

```bash
npm install @sentry/vercel-edge
```

Add to `api/enhance.js`:

```javascript
import * as Sentry from "@sentry/vercel-edge";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV,
});
```

**Benefits:**

- Automatic error capture
- Stack traces
- Performance monitoring
- Release tracking

#### 3. **Logging**

**Vercel Runtime Logs:**

- View in Vercel Dashboard → Project → Runtime Logs
- See all Edge Function invocations
- Filter by status code, function name

**Custom Logging:**
Add structured logging to track:

- Request/response times
- OpenAI API latency
- Rate limit hits
- Error patterns

#### 4. **OpenAI Usage Monitoring**

Monitor costs in real-time:

1. OpenAI Dashboard → Usage
2. Set up billing alerts
3. Track tokens per request
4. Monitor rate limits

**Recommended Alerts:**

- Daily spend > $X
- Unusual token usage spikes
- API error rate > 5%

#### 5. **Upstash Redis Monitoring**

**Upstash Dashboard:**

- View command counts
- Monitor bandwidth usage
- Check storage size
- Set up alerts for quota limits

**Key Metrics to Watch:**

- Redis command count (should stay under 500k/month on free tier)
- Storage size (should stay under 256MB on free tier)
- Error rate (should be near 0%)

### Analytics Dashboard (Future)

Consider building a simple dashboard to visualize:

- Daily/weekly/monthly request trends
- Top referrers
- Geographic distribution
- Browser/device breakdown
- Peak usage hours

**Tech Stack Options:**

- **Simple:** React + Chart.js (hosted on Vercel)
- **Advanced:** Next.js + Vercel Postgres (for historical data)
- **Third-party:** Mixpanel, Amplitude, PostHog (if you need more features)

### Privacy & Compliance

**GDPR Compliance:**

- ✅ No personal data stored (only aggregated stats)
- ✅ No cookies used for tracking
- ✅ IP addresses are hashed (fingerprint only)
- ✅ Users can't be identified from analytics

**Data Retention:**

- Analytics keys expire automatically (7-30 days)
- No permanent storage of user data
- Can be cleared manually from Redis if needed

## 🎯 Best Practices & Next Steps

### Immediate Actions (Production Ready)

1. **Enable Vercel Analytics** ✅ (Code already integrated)

   - Deploy your latest changes (includes `<Analytics />` component)
   - Go to Vercel Dashboard → Project → Analytics
   - Click "Enable Web Analytics" (free tier)
   - Visit your site to start collecting data
   - View real-time analytics in the dashboard

2. **Set Up Monitoring Alerts**

   - OpenAI: Set daily spend limit ($5-10 recommended)
   - Upstash: Monitor command count (stay under 500k/month)
   - Vercel: Enable function error alerts

3. **Review Analytics Weekly**
   - Check `/api/analytics?days=7` endpoint
   - Identify top referrers
   - Monitor usage trends
   - Adjust rate limits if needed

### Short-term Improvements (1-2 weeks)

1. **Error Tracking**

   - Integrate Sentry for error monitoring
   - Track OpenAI API failures
   - Monitor rate limit hits

2. **Performance Monitoring**

   - Add response time logging
   - Track OpenAI API latency
   - Identify slow requests

3. **Enhanced Analytics**
   - Build simple dashboard UI
   - Visualize trends (charts)
   - Export data for analysis

### Medium-term Enhancements (1-3 months)

1. **User Authentication**

   - Add email/social login (Auth0, Clerk, or NextAuth)
   - Per-user rate limits (instead of IP-based)
   - User preferences/history

2. **Advanced Features**

   - Multiple AI models (Claude, Gemini)
   - Prompt templates/library
   - Export/import functionality
   - Dark mode

3. **Scaling Considerations**
   - Consider Vercel Postgres for historical analytics
   - Implement caching for common prompts
   - Add CDN for static assets

### Security Checklist

- [x] API keys stored server-side only
- [x] Rate limiting enforced server-side
- [x] Input validation on all endpoints
- [x] HMAC fingerprinting (prevents spoofing)
- [ ] CORS headers configured (if needed)
- [ ] Content Security Policy (CSP) headers
- [ ] Rate limit per IP (burst protection)
- [ ] DDoS protection (Vercel provides basic)

### Performance Optimization

- [x] Edge Functions (low latency)
- [x] Non-blocking analytics
- [ ] Response caching (for identical prompts)
- [ ] Request deduplication
- [ ] Compression (gzip/brotli)

### Cost Optimization

- [x] Use cheapest model (gpt-4o-mini)
- [x] Low temperature (0.2) for faster responses
- [ ] Implement prompt caching (OpenAI feature)
- [ ] Monitor and optimize token usage
- [ ] Set hard spending limits

## 📝 Development Notes

- **Local Dev:** Uses `VITE_OPENAI_API_KEY` for direct OpenAI calls (convenience)
- **Production:** Client calls `/api/enhance` (secure, rate-limited)
- **Rate Limit:** Server is source of truth; client counter is UX-only
- **Reset Time:** Daily limit resets at 00:00 UTC (not local midnight)
- **Analytics:** Vercel Analytics integrated + custom Redis tracking (non-blocking, privacy-friendly)

## 🔄 Future Improvements

- [x] Basic analytics tracking (referrers, countries, browsers)
- [x] Vercel Analytics integration
- [ ] Analytics dashboard UI (custom Redis-based dashboard)
- [ ] Add user authentication (email/social login)
- [ ] Per-user rate limits (instead of IP-based)
- [ ] Error tracking (Sentry integration)
- [ ] Multiple model options (Claude, Gemini)
- [ ] Prompt templates/library
- [ ] Export/import prompts
- [ ] Dark mode

## 📄 License

See [LICENSE](LICENSE) file.

## 👤 Author

Daniel Park

## 🙏 Acknowledgments

- OpenAI for GPT-4o mini API
- Vercel for hosting and Edge Functions
- Upstash for Redis-as-a-Service

---

**Questions?** Open an issue or reach out to the maintainer.
