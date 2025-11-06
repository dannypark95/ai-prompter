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

## 📝 Development Notes

- **Local Dev:** Uses `VITE_OPENAI_API_KEY` for direct OpenAI calls (convenience)
- **Production:** Client calls `/api/enhance` (secure, rate-limited)
- **Rate Limit:** Server is source of truth; client counter is UX-only
- **Reset Time:** Daily limit resets at 00:00 UTC (not local midnight)

## 🔄 Future Improvements

- [ ] Add user authentication (email/social login)
- [ ] Per-user rate limits (instead of IP-based)
- [ ] Analytics dashboard
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
