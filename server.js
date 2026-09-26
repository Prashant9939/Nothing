require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in environment variables.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

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
  max: 500,
  message: { error: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
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
// Razorpay webhook must run before express.json() — its signature is computed
// over the raw request body.
app.use('/api/razorpay', webhookRoutes);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use('/api/analytics', analyticsLimiter, analyticsRoutes);
app.use(generalLimiter);

// Static files
app.use(express.static(path.join(__dirname, 'client', 'dist')));

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

module.exports = app;
