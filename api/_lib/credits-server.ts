/**
 * credits-server.ts — Helpers de creditos para uso server-side en /api/*.
 *
 * Usa SUPABASE_SERVICE_ROLE_KEY (NUNCA exponer al cliente). Esta key
 * tiene permisos full sobre la DB · solo se carga en Vercel functions.
 *
 * Responsabilidades:
 *   - Verificar el JWT del usuario (auth.uid())
 *   - Consumir creditos atomicamente antes de generar imagen
 *   - Acreditar creditos despues de un pago PayPal confirmado
 *   - Crear/actualizar paypal_orders
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

/**
 * Cliente Supabase con service_role · bypass RLS, full DB access.
 * Lazy-init para evitar crash en cold-start si las vars no estan.
 */
export function getAdminClient(): SupabaseClient {
  if (_admin) return _admin;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('SUPABASE_URL not configured');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');

  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

/**
 * Cliente Supabase con el JWT del usuario · respeta RLS.
 * Usado para verificar identidad y leer datos del propio user.
 */
export function getUserClient(jwt: string): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url) throw new Error('SUPABASE_URL not configured');
  if (!anonKey) throw new Error('SUPABASE_ANON_KEY not configured');

  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Extrae el JWT del header Authorization. Devuelve null si falta o invalido.
 */
export function extractJwt(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (!auth || typeof auth !== 'string') return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Verifica el JWT y devuelve el user.id, o null si invalido.
 */
export async function getUserIdFromJwt(jwt: string): Promise<string | null> {
  try {
    const client = getUserClient(jwt);
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

/**
 * Consume 1 credito del user. Throw 'INSUFFICIENT_CREDITS' si no hay saldo.
 */
export async function consumeCreditServer(
  userId: string,
  metadata: Record<string, unknown> = {},
): Promise<{ monthlyRemaining: number; topup: number; source: string }> {
  const admin = getAdminClient();
  const { data, error } = await admin.rpc('consume_credit', {
    p_user_id: userId,
    p_metadata: metadata,
  });

  if (error) {
    if (error.message?.includes('INSUFFICIENT_CREDITS')) {
      const e = new Error('INSUFFICIENT_CREDITS');
      (e as Error & { code: string }).code = 'INSUFFICIENT_CREDITS';
      throw e;
    }
    throw new Error(`consume_credit failed: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    monthlyRemaining: row.monthly_quota_remaining,
    topup: row.topup_balance,
    source: row.source,
  };
}

/**
 * Acredita un pago PayPal confirmado. Idempotente sobre paypal_order_id.
 */
export async function grantCreditsFromPayPal(args: {
  userId: string;
  credits: number;
  packId: string;
  paypalOrderId: string;
}): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.rpc('grant_credits', {
    p_user_id: args.userId,
    p_credits: args.credits,
    p_source: 'purchase',
    p_paypal_order_id: args.paypalOrderId,
    p_pack_id: args.packId,
    p_reason: `Compra PayPal: ${args.packId}`,
  });
  if (error) throw new Error(`grant_credits failed: ${error.message}`);
}

/**
 * Refund: devuelve creditos a topup_balance, marca order como refunded.
 */
export async function refundPayPalOrder(args: {
  userId: string;
  credits: number;
  paypalOrderId: string;
  reason: string;
}): Promise<void> {
  const admin = getAdminClient();

  // Restar creditos otorgados (puede dejar topup negativo si ya los gastaron ·
  // por eso el admin debe revisar manualmente refunds parciales).
  const { error: txError } = await admin.from('credit_transactions').insert({
    user_id: args.userId,
    delta: -args.credits,
    source: 'refund',
    paypal_order_id: args.paypalOrderId,
    reason: args.reason,
  });
  if (txError) throw new Error(`refund tx failed: ${txError.message}`);

  // Actualizar status de la order
  const { error: orderError } = await admin
    .from('paypal_orders')
    .update({ status: 'refunded', updated_at: new Date().toISOString() })
    .eq('id', args.paypalOrderId);
  if (orderError) throw new Error(`refund update failed: ${orderError.message}`);
}
