/**
 * credits.ts — Cliente para el sistema de creditos.
 *
 * Reglas:
 *   - 1 credito = 1 imagen generada (cualquier quality)
 *   - monthly_quota: incluido en suscripcion · resetea cada mes
 *   - topup_balance: comprado con PayPal · NO expira
 *   - Decremento: gasta primero topup, despues quota mensual
 *
 * El gating real esta en SQL (RPC consume_credit con FOR UPDATE).
 * Este modulo solo expone helpers tipados para el frontend y para
 * suscribirse a cambios de balance.
 */

import { supabase, isSupabaseReady } from './supabase';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface UserCredits {
  user_id: string;
  monthly_quota: number;
  monthly_quota_remaining: number;
  topup_balance: number;
  quota_period_start: string;
  quota_period_end: string;
  total_consumed_lifetime: number;
  total_purchased_lifetime: number;
  updated_at: string;
}

export interface CreditPack {
  id: string;
  label: string;
  credits: number;
  price_usd: number;
  active: boolean;
  sort_order: number;
}

export type CreditTransactionSource =
  | 'monthly_reset'
  | 'monthly_quota'
  | 'topup_consume'
  | 'purchase'
  | 'admin_grant'
  | 'admin_revoke'
  | 'refund';

export interface CreditTransaction {
  id: string;
  user_id: string;
  delta: number;
  source: CreditTransactionSource;
  reason?: string;
  paypal_order_id?: string;
  pack_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface CreditBalance {
  total: number;
  monthlyRemaining: number;
  topup: number;
  periodEnd: string;
  isLow: boolean;     // < 10
  isEmpty: boolean;   // 0
}

// Threshold para mostrar warning de "creditos bajos" en la UI
export const LOW_CREDIT_THRESHOLD = 10;


// ─── Lectura ─────────────────────────────────────────────────────────────────

/**
 * Obtiene el balance actual del usuario. Crea la fila si no existe.
 * Devuelve null si no hay supabase o no hay sesion.
 */
export async function fetchUserCredits(userId: string): Promise<UserCredits | null> {
  if (!isSupabaseReady() || !supabase) return null;

  // Usa RPC para garantizar que la fila exista
  const { data, error } = await supabase
    .rpc('ensure_user_credits_row', { p_user_id: userId });

  if (error || !data) {
    console.error('[credits] ensure_user_credits_row failed', error);
    return null;
  }

  // RPC devuelve la fila como array · tomar el primero
  const row = Array.isArray(data) ? data[0] : data;
  return row as UserCredits;
}

/**
 * Computa el balance simplificado para mostrar en UI.
 */
export function computeBalance(credits: UserCredits | null): CreditBalance {
  if (!credits) {
    return {
      total: 0,
      monthlyRemaining: 0,
      topup: 0,
      periodEnd: '',
      isLow: false,
      isEmpty: true,
    };
  }
  const total = credits.monthly_quota_remaining + credits.topup_balance;
  return {
    total,
    monthlyRemaining: credits.monthly_quota_remaining,
    topup: credits.topup_balance,
    periodEnd: credits.quota_period_end,
    isLow: total > 0 && total <= LOW_CREDIT_THRESHOLD,
    isEmpty: total === 0,
  };
}

/**
 * Lista los packs activos ordenados por sort_order.
 */
export async function fetchCreditPacks(): Promise<CreditPack[]> {
  if (!isSupabaseReady() || !supabase) return [];
  const { data, error } = await supabase
    .from('credit_packs')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error || !data) return [];
  return data as CreditPack[];
}

/**
 * Historial de transacciones del usuario (paginado).
 */
export async function fetchCreditTransactions(
  userId: string,
  limit = 50,
): Promise<CreditTransaction[]> {
  if (!isSupabaseReady() || !supabase) return [];
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as CreditTransaction[];
}


// ─── Consumo ─────────────────────────────────────────────────────────────────

/**
 * Resultado de consume_credit. Si falla por saldo insuficiente lanza
 * un error con code = 'INSUFFICIENT_CREDITS'.
 */
export interface ConsumeResult {
  monthlyRemaining: number;
  topup: number;
  source: 'monthly_quota' | 'topup_consume';
}

export class InsufficientCreditsError extends Error {
  code = 'INSUFFICIENT_CREDITS' as const;
  constructor() {
    super('No tenes creditos suficientes. Compra un pack o espera al reseteo mensual.');
    this.name = 'InsufficientCreditsError';
  }
}

/**
 * Consume 1 credito de manera atomica. Lanza InsufficientCreditsError si no
 * hay saldo. Esta funcion se llama SOLO desde el server-side (api/ai/image)
 * para que el gating sea real · si se llama desde el cliente, RLS bloquea.
 *
 * IMPORTANTE: el cliente NO debe llamar esto directamente · el endpoint
 * /api/ai/image lo invoca antes de pedirle a OpenAI la imagen.
 */
export async function consumeCredit(
  userId: string,
  metadata: Record<string, unknown> = {},
): Promise<ConsumeResult> {
  if (!isSupabaseReady() || !supabase) {
    throw new Error('Supabase no configurado');
  }

  const { data, error } = await supabase.rpc('consume_credit', {
    p_user_id: userId,
    p_metadata: metadata,
  });

  if (error) {
    if (error.message?.includes('INSUFFICIENT_CREDITS')) {
      throw new InsufficientCreditsError();
    }
    throw new Error(`consume_credit fallo: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    monthlyRemaining: row.monthly_quota_remaining,
    topup: row.topup_balance,
    source: row.source,
  };
}


// ─── Admin ───────────────────────────────────────────────────────────────────

/**
 * Suma o resta creditos manualmente (solo admin).
 */
export async function adminAdjustCredits(
  userId: string,
  delta: number,
  reason: string,
): Promise<UserCredits | null> {
  if (!isSupabaseReady() || !supabase) return null;
  const { data, error } = await supabase.rpc('admin_adjust_credits', {
    p_user_id: userId,
    p_delta: delta,
    p_reason: reason,
  });
  if (error) {
    console.error('[credits] adminAdjustCredits failed', error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row as UserCredits;
}

/**
 * Cambia la quota mensual de un cliente especifico (ej: VIP con 300/mes).
 */
export async function adminSetMonthlyQuota(
  userId: string,
  newQuota: number,
): Promise<UserCredits | null> {
  if (!isSupabaseReady() || !supabase) return null;
  const { data, error } = await supabase.rpc('admin_set_monthly_quota', {
    p_user_id: userId,
    p_new_quota: newQuota,
  });
  if (error) {
    console.error('[credits] adminSetMonthlyQuota failed', error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row as UserCredits;
}


// ─── Realtime: hook para refrescar el balance en la UI ───────────────────────

/**
 * Subscribe a cambios en user_credits. Retorna funcion de cleanup.
 * El callback recibe el nuevo balance cuando hay UPDATE en la fila del user.
 */
export function subscribeToCredits(
  userId: string,
  onChange: (credits: UserCredits) => void,
): () => void {
  if (!isSupabaseReady() || !supabase) return () => {};

  const channel = supabase
    .channel(`user_credits:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_credits',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) onChange(payload.new as UserCredits);
      },
    )
    .subscribe();

  return () => {
    if (supabase) supabase.removeChannel(channel);
  };
}
