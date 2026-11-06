// Canonical origin embedded in the verification QR printed on every document.
//
// The QR is scanned by a phone, so the base must be a public hostname:
//   - localhost is unreachable from any phone, and
//   - *.vercel.app preview domains are blocked or unreliable on many mobile
//     networks (this is exactly how production QRs ended up 404-ing).
//
// Precedence: admin "siteUrl" setting > SITE_URL env > production default.
// In production the last two are sanitised, so a blank setting or a stale
// preview-domain SITE_URL can never put a dead link on a document again.
const PRODUCTION_ORIGIN = 'https://iqintern.in';

const trimOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');

const hostOf = (base) => {
  try {
    return new URL(base).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const isProduction = () => process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

const isDeadHost = (host) =>
  !host || host === 'localhost' || host.endsWith('.vercel.app') || host.endsWith('.vercel.site');

/**
 * Resolve the base URL used by makeQr()/makeVerifyQr().
 * @param {string} siteUrlSetting value of the admin "Verification link" setting (may be blank)
 * @returns {string} origin with no trailing slash
 */
function resolveVerifyBase(siteUrlSetting) {
  let base = trimOrigin(siteUrlSetting) || trimOrigin(process.env.SITE_URL);

  if (isProduction()) {
    // Never point a scannable code at localhost or a preview domain.
    if (isDeadHost(hostOf(base))) base = PRODUCTION_ORIGIN;
  } else if (!base) {
    base = `http://localhost:${process.env.PORT || 5000}`;
  }

  return base;
}

module.exports = { resolveVerifyBase, PRODUCTION_ORIGIN };
