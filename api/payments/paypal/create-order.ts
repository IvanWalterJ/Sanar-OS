/**
 * POST /api/payments/paypal/create-order
 *
 * Crea una orden PayPal para que el usuario pague un pack de creditos.
 *
 * Body: { packId: string }
 * Auth: Authorization: Bearer <supabase_jwt>
 *
 * Response 200: { orderId: string, status: string }
 * Response 401: { error: 'UNAUTHORIZED' }
 * Response 400: { error: 'INVALID_PACK' | 'PACK_NOT_FOUND' }
 *
 * Flujo:
 *   1. Verificar JWT del usuario
 *   2. Leer el pack solicitado (verificar que existe y esta activo)
 *   3. Crear orden en PayPal con el precio del pack (NUNCA confiar en precio del cliente)
 *   4. Guardar paypal_orders con status='created' para tracking
 *   5. Devolver orderId al frontend (lo usa el SDK de PayPal para mostrar popup)
 */

import {
  extractJwt,
  getUserIdFromJwt,
  getAdminClient,
} from '../../_lib/credits-server';
import { createOrder } from '../../_lib/paypal';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ─── Auth ───────────────────────────────────────────────────────────────────
  const jwt = extractJwt(req);
  if (!jwt) return res.status(401).json({ error: 'UNAUTHORIZED' });

  const userId = await getUserIdFromJwt(jwt);
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

  // ─── Validar body ───────────────────────────────────────────────────────────
  const body = (req.body ?? {}) as { packId?: unknown };
  const packId = typeof body.packId === 'string' ? body.packId.trim() : '';
  if (!packId) {
    return res.status(400).json({ error: 'INVALID_PACK', message: 'packId requerido' });
  }

  try {
    // ─── Buscar pack (precio canonico viene del server, NO del cliente) ──────
    const admin = getAdminClient();
    const { data: pack, error: packError } = await admin
      .from('credit_packs')
      .select('id, label, credits, price_usd, active')
      .eq('id', packId)
      .eq('active', true)
      .maybeSingle();

    if (packError) {
      return res.status(500).json({ error: 'DB error', message: packError.message });
    }
    if (!pack) {
      return res.status(400).json({ error: 'PACK_NOT_FOUND' });
    }

    // ─── Crear orden en PayPal ──────────────────────────────────────────────
    const order = await createOrder({
      amountUsd: Number(pack.price_usd),
      description: `${pack.label} · Sanar OS`,
      customId: `${userId}:${pack.id}`,
    });

    // ─── Persistir en paypal_orders (para webhook + auditoria) ──────────────
    const { error: insertError } = await admin
      .from('paypal_orders')
      .insert({
        id: order.id,
        user_id: userId,
        pack_id: pack.id,
        credits: pack.credits,
        amount_usd: pack.price_usd,
        status: 'created',
      });

    if (insertError) {
      // No falla la operacion · el webhook puede recrear la fila si hace falta,
      // pero logueamos para investigar.
      console.error('[paypal/create-order] paypal_orders insert failed', insertError);
    }

    return res.status(200).json({
      orderId: order.id,
      status: order.status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[paypal/create-order] failed', msg);
    return res.status(500).json({ error: 'CREATE_ORDER_FAILED', message: msg });
  }
}
