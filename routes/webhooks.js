const express = require('express');
const db = require('../db');
const rzp = require('../lib/razorpay');
const { completePayment } = require('../lib/payments');

const router = express.Router();

// Razorpay webhook — the backup path that completes a payment even if the
// browser closes right after checkout. Signature is computed over the RAW
// request body, so this route must be mounted before express.json().
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    return res.status(501).json({
      error: 'Webhook not configured: set RAZORPAY_WEBHOOK_SECRET in .env and use the same secret in your Razorpay dashboard webhook.',
    });
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!rzp.verifyWebhookSignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch (_) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const paymentEntity = event.payload?.payment?.entity;
    const orderEntity = event.payload?.order?.entity;
    const orderId = paymentEntity?.order_id || (event.event === 'order.paid' ? orderEntity?.id : null);
    let transactionId = paymentEntity?.id || null;
    const chargedPaise = paymentEntity?.amount ?? orderEntity?.amount ?? null;
    const amount = chargedPaise != null ? Number(chargedPaise) / 100 : null;

    if (orderId) {
      // order.paid events without a payment entity would otherwise complete
      // the invoice with no payment id at all — ask Razorpay for it.
      if (!transactionId) {
        try {
          const captured = (await rzp.fetchPaymentsForOrder(orderId))
            .find((p) => p.status === 'captured');
          if (captured) transactionId = captured.id;
        } catch (err) {
          console.error(`Webhook: could not look up payment for order ${orderId}:`, err.message);
        }
      }

      const payment = await db.get('SELECT * FROM payments WHERE razorpayOrderId = ?', orderId);
      if (payment && payment.status !== 'completed') {
        await completePayment(payment, { transactionId, razorpayOrderId: orderId, razorpayPaymentId: transactionId, amount });
        console.log(`Webhook: payment ${payment.id} completed via Razorpay (${orderId})`);
      }
    }
  }

  res.json({ status: 'ok' });
});

module.exports = router;
