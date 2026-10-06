require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in environment variables.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const db = require('./db');
const { refreshBrand } = require('./lib/documentBrand');
const { expirePendingPayments } = require('./lib/payments');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');
const institutionRoutes = require('./routes/institutions');
const announcementRoutes = require('./routes/announcements');
const webhookRoutes = require('./routes/webhooks');
const analyticsRoutes = require('./routes/analytics');
const formRoutes = require('./routes/forms');

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');

if (process.env.TRUST_PROXY) {
  const tp = process.env.TRUST_PROXY;
  app.set('trust proxy', tp === 'true' ? true : Number(tp) || tp);
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { error: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Analytics beacons are frequent by nature (pageviews + clicks), so they get
// their own budget and are mounted before the general limiter.
const analyticsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: { error: 'Too many events, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // HSTS only on HTTPS requests (req.secure honours X-Forwarded-Proto when
  // TRUST_PROXY is set) — the header is ignored by browsers over plain HTTP,
  // and never sending it on localhost keeps dev unaffected.
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' https://checkout.razorpay.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' https: blob:",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://api.razorpay.com https://checkout.razorpay.com",
    "connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '));
  next();
});
// gzip every text response (bundle, JSON APIs) — static assets and big admin
// lists were shipping raw. PDFs are skipped: pdfkit already deflate-compresses
// its content streams, so recompressing them only burns CPU.
app.use(compression({
  filter: (req, res) => {
    const type = String(res.getHeader('Content-Type') || '');
    if (type.includes('application/pdf') || req.path.includes('/download/')) return false;
    return compression.filter(req, res);
  },
}));
// The database (schema + seeds) and brand settings must be ready before any
// request is served. On Vercel the function starts handling requests as soon
// as it is required. The gate is retriable: a transient DB failure (e.g. a
// dropped TLS handshake to the pooler during a cold start) must not poison
// this instance for its whole lifetime — after a failure the next request
// starts a fresh attempt, and up to 3 tries (with backoff) are made per
// request before the real error is surfaced.
let appReady = null;
const ensureReady = () => {
  if (!appReady) {
    appReady = (async () => {
      let lastErr;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await db.init();
          await refreshBrand();
          return;
        } catch (err) {
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

// Razorpay webhook must run before express.json() — its signature is computed
// over the raw request body.
app.use('/api/razorpay', webhookRoutes);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use('/api/analytics', analyticsLimiter, analyticsRoutes);
app.use(generalLimiter);

// Static files. Hashed build output (client/dist/assets/*) is content-addressed
// by Vite — cache it forever; index.html must always revalidate so a deploy
// is picked up immediately.
app.use(express.static(path.join(__dirname, 'client', 'dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/announcements', announcementRoutes);
// Public, unauthenticated form downloads (verification page)
app.use('/api/forms', formRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all: serve index.html for SPA routes, 404 for unknown API routes
app.get('{*splat}', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  console.error(err.stack);
  const body = { error: 'Something went wrong' };
  if (process.env.NODE_ENV !== 'production') body.details = err.message;
  res.status(500).json(body);
});

// Expired pending payments are also failed lazily whenever they are read;
// this timer keeps things prompt even when nobody hits those routes. Skipped
// on Vercel, where the instance can freeze between requests — there the
// lazy checks (plus the sweep at db init) are enough.
if (!process.env.VERCEL) {
  setInterval(() => {
    expirePendingPayments().catch((err) => console.error('Payment expiry sweep failed:', err.message));
  }, 60 * 1000).unref();
}

// Locally: start listening only once the database and brand are ready.
// On Vercel (see api/index.js) the app is exported instead, no port is
// opened, and each incoming request waits on the gate above.
if (process.env.VERCEL) {
  ensureReady().catch((err) => console.error('Database initialization failed:', err));
} else {
  ensureReady()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`API available at http://localhost:${PORT}/api`);
      });
    })
    .catch((err) => {
      console.error('Database initialization failed:', err);
      process.exit(1);
    });
}

module.exports = app;
