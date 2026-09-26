// Razorpay integration helpers.
//
// Payment flow:
//   1. Client asks the server to create an order   -> POST /api/student/pay/:id/order
//   2. Server creates the Razorpay order with the amount stored in the DB
//      (the client can never choose the amount) and returns order id + key id
//   3. Client opens Razorpay Checkout (checkout.razorpay.com) with that order
//   4. Razorpay returns razorpay_order_id | razorpay_payment_id | razorpay_signature
//      where signature = HMAC-SHA256(order_id|payment_id, KEY_SECRET)
//   5. Client posts those back to POST /api/student/pay/:id/verify and the
//      server recomputes the HMAC — only Razorpay can produce a valid signature,
//      so a payment can never be completed without Razorpay actually charging it.
//
// There is no simulated/demo checkout: when RAZORPAY_KEY_ID or
// RAZORPAY_KEY_SECRET is missing, the order endpoint refuses with 503 and a
// clear message, so a forgotten .env entry can never become a free-payment
// bypass.
const crypto = require('crypto');

const PAYMENTS_API = 'https://api.razorpay.com/v1/orders';

function credentials() {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  return { keyId, keySecret, configured: Boolean(keyId && keySecret) };
}

// Live mode = real Razorpay keys are present
function isLive() {
  return credentials().configured;
}

// Create an order on Razorpay. Amount is in paise and must come from the DB.
async function createOrder({ amountPaise, receipt, notes }) {
  const { keyId, keySecret } = credentials();
  if (!keyId || !keySecret) throw new Error('Razorpay keys not configured');

  const res = await fetch(PAYMENTS_API, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.description || `Razorpay order creation failed (HTTP ${res.status})`);
  }
  return data;
}

// signature = HMAC-SHA256(`${order_id}|${payment_id}`, KEY_SECRET)
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const { keySecret } = credentials();
  if (!keySecret || !orderId || !paymentId || !signature) return false;
  const expected = crypto.createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return timingSafeEqual(expected, String(signature));
}

// Webhook signature = HMAC-SHA256(raw request body, RAZORPAY_WEBHOOK_SECRET)
function verifyWebhookSignature(rawBody, signature) {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  if (!secret || !rawBody || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return timingSafeEqual(expected, String(signature));
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { isLive, createOrder, verifyPaymentSignature, verifyWebhookSignature };
