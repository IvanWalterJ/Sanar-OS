/**
 * useCreditsBalance.ts — Hook que mantiene el balance de creditos sincronizado.
 *
 * Carga el balance al montar, se suscribe a cambios via Supabase Realtime,
 * y expone helpers para refrescar manualmente (ej: despues de un pago).
 */
import { useState, useEffect, useCallback } from 'react';
import {
  fetchUserCredits,
  computeBalance,
  subscribeToCredits,
  type UserCredits,
  type CreditBalance,
} from '../../lib/credits';

export interface UseCreditsBalanceResult {
  credits: UserCredits | null;
  balance: CreditBalance;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useCreditsBalance(userId: string | null | undefined): UseCreditsBalanceResult {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCredits(null);
      setLoading(false);
      return;
    }
    const data = await fetchUserCredits(userId);
    setCredits(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    void refresh();

    // Realtime: cuando otro flujo (webhook PayPal, RPC admin) actualiza la fila,
    // el balance refresca solo · sin polling.
    const cleanup = subscribeToCredits(userId, (newCredits) => {
      setCredits(newCredits);
    });

    return cleanup;
  }, [userId, refresh]);

  return {
    credits,
    balance: computeBalance(credits),
    loading,
    refresh,
  };
}
