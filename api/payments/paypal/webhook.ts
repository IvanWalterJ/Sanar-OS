/**
 * POST /api/payments/paypal/webhook
 *
 * Red de seguridad para capturar pagos que el flujo de capture-order pudo
 * haber perdido (red del usuario fallo, browser crash, etc.).
 *
 * PayPal manda eventos: configurar webhook en PayPal Developer Dashboard
 * apuntando a esta URL, y suscribirse a:
 *   - CHECKOUT.ORDER.APPROVED      (informativo)
 *   - PAYMENT.CAPTURE.COMPLETED    (acreditar creditos)
 *   - PAYMENT.CAPTURE.DENIED       (marcar failed)
 *   - PAYMENT.CAPTURE.REFUNDED     (refund)
 *
 * IMPORTANTE:
 *   - Verificar firma con PAYPAL_WEBHOOK_ID
 *   - grant_credits es idempotente sobre paypal_order_id, asi que doble
 *     trigger (capture-order + webhook) no duplica creditos
 *   - Siempre responder 200 rapidamente para que PayPal no reintente
 */

import {
  getAdminClient,
  grantCreditsFromPayPal,
  refundPayPalOrder,
} from '../../_lib/credits-server';
import { verifyWebhookSignature, extractPayPalHeaders } from '../../_lib/paypal';

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource: Record<string, unknown>;
}

// Vercel default body parser ya nos da JSON, pero PayPal requiere el raw body
// para verificacion · usar Content-Type: application/json y pasar req.body.
// Si esto causa problemas con la firma, switchear a raw body parsing.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const headers = extractPayPalHeaders(req.headers);
    if (!headers) {
      return res.status(400).json({ error: 'MISSING_PAYPAL_HEADERS' });
    }

    const body = req.body as PayPalWebhookEvent;
    if (!body || !body.id || !body.event_type) {
      return res.status(400).json({ error: 'INVALID_BODY' });
    }

    // ─── Verificar firma ────────────────────────────────────────────────────
    const valid = await verifyWebhookSignature(headers, body);
    if (!valid) {
      console.warn('[paypal/webhook] firma invalida', body.id, body.event_type);
      return res.status(401).json({ error: 'INVALID_SIGNATURE' });
    }

    // ─── Routing por event_type ──────────────────────────────────────────────
    switch (body.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handleCaptureCompleted(body);
        break;
      case 'PAYMENT.CAPTURE.DENIED':
        await handleCaptureDenied(body);
        break;
      case 'PAYMENT.CAPTURE.REFUNDED':
      case 'PAYMENT.CAPTURE.REVERSED':
        await handleRefund(body);
        break;
      case 'CHECKOUT.ORDER.APPROVED':
        // Informativo · capture-order route hace el trabajo real
        break;
      default:
        // No-op para eventos no manejados (suscripciones, etc.)
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[paypal/webhook] failed', msg);
    // Devolver 500 hace que PayPal reintente · si el error fue transitorio puede recuperar
    return res.status(500).json({ error: 'WEBHOOK_FAILED', message: msg });
  }
}


// ─── Handlers de eventos ─────────────────────────────────────────────────────

async function handleCaptureCompleted(event: PayPalWebhookEvent): Promise<void> {
  const admin = getAdminClient();
  const resource = event.resource as {
    id?: string;                  // capture id
    custom_id?: string;           // userId:packId desde createOrder
    supplementary_data?: { related_ids?: { order_id?: string } };
    amount?: { currency_code: string; value: string };
  };

  const orderId = resource.supplementary_data?.related_ids?.order_id;
  const customId = resource.custom_id;
  if (!orderId) {
    console.warn('[webhook] PAYMENT.CAPTURE.COMPLETED sin order_id', event.id);
    return;
  }

  // Buscar la orden en nuestra DB
  const { data: order } = await admin
    .from('paypal_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) {
    // Posible si el webhook llega antes de que capture-order persista · log y skip
    console.warn('[webhook] orden no encontrada en DB', orderId);
    return;
  }

  // Idempotencia: skip si ya procesamos este event_id
  const processedEvents: string[] = order.webhook_event_ids ?? [];
  if (processedEvents.includes(event.id)) {
    return;
  }

  // Anti-fraude: verificar amount/currency
  if (resource.amount) {
    const paid = parseFloat(resource.amount.value);
    const expected = Number(order.amount_usd);
    if (resource.amount.currency_code !== 'USD' || Math.abs(paid - expected) > 0.01) {
      console.error('[webhook] AMOUNT_MISMATCH', { orderId, paid, expected });
      await admin
        .from('paypal_orders')
        .update({
          status: 'failed',
          webhook_event_ids: [...processedEvents, event.id],
        })
        .eq('id', orderId);
      return;
    }
  }

  // Acreditar (idempotente sobre paypal_order_id)
  await grantCreditsFromPayPal({
    userId: order.user_id,
    credits: order.credits,
    packId: order.pack_id,
    paypalOrderId: orderId,
  });

  // Marcar capturada
  await admin
    .from('paypal_orders')
    .update({
      status: 'captured',
      paypal_capture_id: resource.id ?? null,
      captured_at: order.captured_at ?? new Date().toISOString(),
      webhook_event_ids: [...processedEvents, event.id],
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  console.log('[webhook] capture completed', { orderId, customId, credits: order.credits });
}

async function handleCaptureDenied(event: PayPalWebhookEvent): Promise<void> {
  const admin = getAdminClient();
  const resource = event.resource as {
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
  const orderId = resource.supplementary_data?.related_ids?.order_id;
  if (!orderId) return;

  await admin
    .from('paypal_orders')
    .update({ status: 'failed', updated_at: new Date().toISOString() })
    .eq('id', orderId);
}

async function handleRefund(event: PayPalWebhookEvent): Promise<void> {
  const admin = getAdminClient();
  const resource = event.resource as {
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
  const orderId = resource.supplementary_data?.related_ids?.order_id;
  if (!orderId) return;

  const { data: order } = await admin
    .from('paypal_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (!order || order.status === 'refunded') return;

  await refundPayPalOrder({
    userId: order.user_id,
    credits: order.credits,
    paypalOrderId: orderId,
    reason: `Refund PayPal · event ${event.id}`,
  });
}
