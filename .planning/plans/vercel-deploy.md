# Plan: Deploy IQIntern to Vercel (single project)

## Goal
One Vercel project serving the React SPA as static files (CDN) and the existing Express API as a serverless function under `/api/*`, connected to the same Supabase database and the same `JWT_SECRET` as today, so all data, users and sessions carry over. Local dev (`npm run dev`) must keep working unchanged.

## Why this works (verified)
- Vercel docs: filesystem takes precedence over rewrites → `client/dist` assets are served from CDN; rewrites only apply to unmatched paths.
- Vercel Express support: a CommonJS file exporting the app (`module.exports = app`) becomes a function; `/api` destination maps to `api/index.js`.
- Hobby plan: functions up to 300s (plenty for cold-start seeds + PDF generation), streaming responses supported.
- All server deps (pg, bcryptjs, pdfkit, qrcode) are pure JS → no native build issues.
- Repo already has a GitHub remote (Prashant9939/Nothing), but deploy is via CLI so uncommitted changes are fine.

## Architecture

```
Browser ──► https://<project>.vercel.app
              ├─ /assets/* , /favicon* , /            → static (client/dist, CDN)
              ├─ /<any SPA route>                     → rewrite → /index.html (SPA fallback)
              └─ /api/*                               → rewrite → api/index.js (Express function)
                                                        └─ same app: routes/, lib/, db.js → Supabase
```

## Code changes

### 1. `api/index.js` (new — the serverless entry)
```js
const app = require('../server');
module.exports = app;
```

### 2. `server.js` (two edits, local behavior unchanged)
a) Gate every request on DB readiness so the first request after a cold start never races schema/seeds, and `refreshBrand()` runs before first use. The gate is **retriable**: on Vercel a transient DB failure during cold-start init (e.g. a dropped TLS handshake to the pooler) must not poison the instance for its whole lifetime, so failures clear the cached promise and the next request retries (3 attempts with backoff per request). `db.js` exposes a re-runnable `db.init()` for this; its init body is idempotent. Place after the security-headers middleware (before the `/api/razorpay` mount):
```js
let appReady = null;
const ensureReady = () => {
  if (!appReady) {
    appReady = (async () => {
      let lastErr;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try { await db.init(); await refreshBrand(); return; }
        catch (err) {
          lastErr = err;
          console.error(`Startup init attempt ${attempt}/3 failed: ${err.message}`);
          if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1000));
        }
      }
      throw lastErr;
    })();
    appReady.then(() => {}, () => { appReady = null; });
  }
  return appReady;
};
app.use((req, res, next) => ensureReady().then(() => next()).catch(next));
```
b) Only listen on a port outside Vercel (replace the current `db.ready.then(...listen...)` block):
```js
if (process.env.VERCEL) {
  ensureReady().catch((err) => console.error('Database initialization failed:', err));
} else {
  ensureReady()
    .then(() => { app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)); })
    .catch((err) => { console.error('Database initialization failed:', err); process.exit(1); });
}
```
`express.static` and the `/{*splat}` catch-all stay as-is — on Vercel they are bypassed (CDN serves static, rewrites intercept the rest), locally they keep working.

### 3. `vercel.json` (new)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "client/dist",
  "framework": null,
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "functions": {
    "api/index.js": {
      "maxDuration": 60,
      "includeFiles": "client/public/logo/**"
    }
  }
}
```
- `maxDuration: 60` — cold start runs idempotent schema+seed (few seconds) + PDF generation; well under Hobby's 300s cap.
- `includeFiles` — guarantees the ~1 MB `logo-full.png` (read by 4 PDF modules via `fs.readFileSync(path.join(__dirname, ...))`) is in the function bundle even if file tracing misses it.
- Security headers (CSP, X-Frame-Options, etc. currently set in Express) are added as `vercel.json` `headers` entries mirroring `server.js:80-92`, so static HTML responses get the same policy.
- (If `"framework": null` proves invalid, drop it and set Framework Preset = "Other" in the dashboard instead — the requirement is: Express zero-config detection must not override our build/output settings.)

### 4. `package.json` (root)
```json
"scripts": { ..., "build": "npm ci --prefix client && npm run build --prefix client" },
"engines": { "node": ">=20" }
```
Vercel runs root `npm install` (default install command) → `npm run build` → outputs `client/dist`. Lockfile exists at `client/package-lock.json` so `npm ci` works.

### 5. `.vercelignore` (new — for CLI deploys)
```
.env
.env.*
!.env.example
node_modules
client/node_modules
client/dist
*.log
.planning
```

### 6. `.env.example` (small doc update)
Add `TRUST_PROXY=1` and `SITE_URL=https://<your-domain>` with comments explaining they're required on Vercel.

## Vercel project configuration (dashboard or CLI)
- Framework Preset: **Other** (explicit, so static output is used).
- Environment variables (Production + Preview):
  - `JWT_SECRET` — **same value as Render/.env** → existing logins keep working
  - `DATABASE_URL` — same Supabase pooler URI (same database, no migration)
  - `ADMIN_PASSWORD` — set (Vercel sets `NODE_ENV=production`, warning otherwise)
  - `ALLOWED_ORIGINS=https://<project>.vercel.app,http://localhost:5000`
  - `TRUST_PROXY=1` — **critical**: without it express-rate-limit sees Vercel's proxy IP as the client and ALL visitors share one 500-req/15-min bucket
  - `SITE_URL=https://<project>.vercel.app` — certificate verification links/QR codes
  - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` — optional (demo mode without them)
  - `JWT_EXPIRES_IN=7d` (optional, default already 7d)
- Function region: default (`iad1`) is fine; optionally pick the region closest to the Supabase pooler.

## Execution order
1. Make edits (1)-(6); `node --check` server.js + api/index.js.
2. Local regression: restart `npm run dev`, verify health, login, `/api/admin/internships/1/answer-key` still 200, root build script `npm run build` produces `client/dist`.
3. `npx vercel login` (user authenticates once) → `npx vercel link` in project dir.
4. `npx vercel env add <name>` for each required var (pull values from local `.env` for `JWT_SECRET`/`DATABASE_URL`).
5. `npx vercel --prod`.
6. Post-deploy verification against the live URL:
   - `GET /api/health` → `{"status":"ok"}`
   - `/` loads SPA; `/student/dashboard` deep-link reload works (SPA fallback)
   - register → weak password rejected with new policy message; login works
   - admin answer-key PDF downloads; certificate/document PDFs stream
   - static asset URLs (`/assets/*.js|css`) return 200 (CDN, not index.html)
   - Razorpay path untouched (demo mode if keys absent)

## Risks / notes
- **Vercel Hobby = non-commercial** per Vercel's terms; IQIntern processes payments — if this is a commercial product, a Pro plan ($20/mo) is the compliant choice. Called out, user's call.
- Cold start cost: schema+seed checks run per cold start (idempotent, guarded by the readiness middleware); first request after idle may take ~2-5s.
- In-memory rate-limit buckets are per-instance on serverless (weaker than single-node) — acceptable; Vercel DDoS/WAF covers the edge.
- `render.yaml` stays untouched → Render remains a fallback; both point at the same Supabase DB, so don't run the two simultaneously against writes long-term (schema is idempotent, so it's safe, but keep one as production).
- If Vercel's Express auto-detection (root `server.js`) conflicts with the explicit config, the fallback is dashboard Framework Preset = "Other" (settings not expressible in vercel.json).

## Out of scope
- No Docker/other-platform changes; no DB changes; no app code changes beyond `server.js` + new config files.
