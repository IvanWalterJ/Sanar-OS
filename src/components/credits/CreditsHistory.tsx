/**
 * CreditsHistory.tsx — Tabla del historial de movimientos de creditos.
 * Usado en el modal de cuenta/facturacion.
 */
import React, { useState, useEffect } from 'react';
import { History, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import {
  fetchCreditTransactions,
  type CreditTransaction,
  type CreditTransactionSource,
} from '../../lib/credits';

const SOURCE_LABELS: Record<CreditTransactionSource, string> = {
  monthly_reset: 'Reseteo mensual',
  monthly_quota: 'Imagen (plan)',
  topup_consume: 'Imagen (comprados)',
  purchase: 'Compra PayPal',
  admin_grant: 'Ajuste manual',
  admin_revoke: 'Ajuste manual',
  refund: 'Reembolso',
};

interface CreditsHistoryProps {
  userId: string;
  limit?: number;
}

export default function CreditsHistory({ userId, limit = 30 }: CreditsHistoryProps) {
  const [txs, setTxs] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreditTransactions(userId, limit).then((data) => {
      setTxs(data);
      setLoading(false);
    });
  }, [userId, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[#F5A623]" />
      </div>
    );
  }

  if (txs.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-white/40">
        Sin movimientos todavía
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/40 mb-3">
        <History className="h-3.5 w-3.5" />
        Historial de movimientos
      </div>
      {txs.map((tx) => {
        const isPositive = tx.delta > 0;
        const isZero = tx.delta === 0;
        return (
          <div
            key={tx.id}
            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`rounded-lg p-1.5 shrink-0 ${
                  isPositive ? 'bg-[#10B981]/15' : isZero ? 'bg-white/5' : 'bg-[#EF4444]/15'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5 text-[#10B981]" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-[#EF4444]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-white truncate">
                  {SOURCE_LABELS[tx.source]}
                </div>
                {tx.reason && (
                  <div className="text-[11px] text-white/40 truncate">
                    {tx.reason}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
              <span
                className={`text-sm font-bold ${
                  isPositive ? 'text-[#10B981]' : isZero ? 'text-white/40' : 'text-[#EF4444]'
                }`}
              >
                {isPositive ? '+' : ''}{tx.delta}
              </span>
              <span className="text-[11px] text-white/30 w-16 text-right">
                {new Date(tx.created_at).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: 'short',
                })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
