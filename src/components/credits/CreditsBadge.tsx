/**
 * CreditsBadge.tsx — Widget compacto que muestra el balance actual.
 *
 * Click → abre BuyCreditsModal. Color cambia segun saldo:
 *   - normal:  oro
 *   - low:     amarillo intenso
 *   - empty:   rojo
 */
import React, { useState } from 'react';
import { Coins, AlertTriangle } from 'lucide-react';
import BuyCreditsModal from './BuyCreditsModal';
import { useCreditsBalance } from './useCreditsBalance';

interface CreditsBadgeProps {
  userId: string | null | undefined;
  /** Compact mode: solo numero + icono. Expanded: muestra "X / Y" + tooltip. */
  variant?: 'compact' | 'expanded';
}

export default function CreditsBadge({ userId, variant = 'expanded' }: CreditsBadgeProps) {
  const { credits, balance, loading, refresh } = useCreditsBalance(userId);
  const [showModal, setShowModal] = useState(false);

  if (!userId) return null;

  const color = balance.isEmpty
    ? 'text-[#EF4444] border-[#EF4444]/40 bg-[#EF4444]/10'
    : balance.isLow
    ? 'text-[#F5A623] border-[#F5A623]/60 bg-[#F5A623]/15'
    : 'text-[#F5A623] border-[#F5A623]/30 bg-[#F5A623]/10 hover:bg-[#F5A623]/15';

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        title={
          loading
            ? 'Cargando...'
            : `${balance.total} créditos disponibles · ${balance.monthlyRemaining} del plan + ${balance.topup} comprados`
        }
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold transition-all ${color}`}
      >
        {balance.isEmpty ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Coins className="h-4 w-4" />
        )}
        {loading ? (
          <span className="opacity-60">—</span>
        ) : variant === 'compact' ? (
          <span>{balance.total}</span>
        ) : (
          <span>
            {balance.total}{' '}
            <span className="opacity-60 font-normal text-[12px]">créditos</span>
          </span>
        )}
      </button>

      {showModal && (
        <BuyCreditsModal
          userId={userId}
          currentBalance={balance}
          credits={credits}
          onClose={() => setShowModal(false)}
          onPurchaseComplete={async () => {
            await refresh();
          }}
        />
      )}
    </>
  );
}
