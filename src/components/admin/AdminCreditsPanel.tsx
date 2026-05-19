/**
 * AdminCreditsPanel.tsx — Panel admin para gestionar creditos de un cliente.
 *
 * Permite:
 *   - Ver balance actual del cliente
 *   - Ajustar manualmente (regalo, refund, penalizacion)
 *   - Cambiar quota mensual (ej: VIP con 300/mes)
 *   - Ver historial de movimientos
 */
import React, { useState, useEffect } from 'react';
import { Plus, Minus, Settings2, Loader2, Coins, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchUserCredits,
  computeBalance,
  adminAdjustCredits,
  adminSetMonthlyQuota,
  type UserCredits,
} from '../../lib/credits';
import CreditsHistory from '../credits/CreditsHistory';

interface AdminCreditsPanelProps {
  clienteId: string;
  clienteNombre?: string;
}

export default function AdminCreditsPanel({ clienteId, clienteNombre }: AdminCreditsPanelProps) {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [newQuota, setNewQuota] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const data = await fetchUserCredits(clienteId);
    setCredits(data);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const handleAdjust = async (sign: 1 | -1) => {
    const raw = parseInt(adjustValue, 10);
    if (!Number.isFinite(raw) || raw <= 0) {
      toast.error('Ingresá una cantidad valida');
      return;
    }
    if (!adjustReason.trim()) {
      toast.error('La razón es obligatoria para auditoría');
      return;
    }
    setSaving(true);
    const result = await adminAdjustCredits(clienteId, sign * raw, adjustReason.trim());
    setSaving(false);
    if (!result) {
      toast.error('Error ajustando créditos');
      return;
    }
    toast.success(`${sign > 0 ? '+' : '-'}${raw} créditos aplicados`);
    setAdjustValue('');
    setAdjustReason('');
    setCredits(result);
  };

  const handleSetQuota = async () => {
    const raw = parseInt(newQuota, 10);
    if (!Number.isFinite(raw) || raw < 0) {
      toast.error('Quota invalida');
      return;
    }
    setSaving(true);
    const result = await adminSetMonthlyQuota(clienteId, raw);
    setSaving(false);
    if (!result) {
      toast.error('Error actualizando quota');
      return;
    }
    toast.success(`Quota mensual fijada en ${raw}`);
    setNewQuota('');
    setCredits(result);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#F5A623]" />
      </div>
    );
  }

  const balance = computeBalance(credits);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/40 mb-1">
            Gestión de créditos
          </div>
          <div className="text-lg font-semibold text-white">
            {clienteNombre || clienteId.slice(0, 8)}
          </div>
        </div>
        <button
          onClick={refresh}
          className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white transition-colors"
          title="Refrescar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Balance card */}
      <div className="rounded-xl border border-[#F5A623]/20 bg-[#F5A623]/5 p-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-white/50 mb-1">
              <Coins className="h-3 w-3" /> Total
            </div>
            <div className="text-2xl font-bold text-[#F5A623]">{balance.total}</div>
          </div>
          <div>
            <div className="text-xs text-white/50 mb-1">Plan mensual</div>
            <div className="text-2xl font-bold text-white">
              {balance.monthlyRemaining}
              <span className="text-sm text-white/40 font-normal"> / {credits?.monthly_quota ?? 0}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-white/50 mb-1">Comprados</div>
            <div className="text-2xl font-bold text-white">{balance.topup}</div>
          </div>
        </div>
        {credits && (
          <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-white/40">
            Período: {new Date(credits.quota_period_start).toLocaleDateString('es-AR')}
            {' → '}
            {new Date(credits.quota_period_end).toLocaleDateString('es-AR')}
            {' · '}
            Consumo histórico: {credits.total_consumed_lifetime}
            {' · '}
            Comprado histórico: {credits.total_purchased_lifetime}
          </div>
        )}
      </div>

      {/* Ajuste manual */}
      <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Settings2 className="h-4 w-4 text-[#F5A623]" />
          Ajuste manual de créditos
        </div>
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <input
            type="number"
            min="1"
            placeholder="Cantidad"
            value={adjustValue}
            onChange={(e) => setAdjustValue(e.target.value)}
            className="rounded-lg bg-[#0F0F0F] border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#F5A623]/50 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Razón (obligatoria · queda en log)"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            className="rounded-lg bg-[#0F0F0F] border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#F5A623]/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleAdjust(1)}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/25 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Sumar
          </button>
          <button
            onClick={() => handleAdjust(-1)}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/25 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Minus className="h-4 w-4" /> Restar
          </button>
        </div>
      </div>

      {/* Cambiar quota mensual */}
      <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4 space-y-3">
        <div className="text-sm font-semibold text-white">
          Quota mensual del plan
        </div>
        <div className="text-xs text-white/50">
          Por defecto 150. Subila para clientes VIP. Bajarla afecta el período actual.
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            placeholder={`Actual: ${credits?.monthly_quota ?? 150}`}
            value={newQuota}
            onChange={(e) => setNewQuota(e.target.value)}
            className="flex-1 rounded-lg bg-[#0F0F0F] border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#F5A623]/50 focus:outline-none"
          />
          <button
            onClick={handleSetQuota}
            disabled={saving || !newQuota}
            className="rounded-lg bg-[#F5A623]/15 border border-[#F5A623]/30 text-[#F5A623] hover:bg-[#F5A623]/25 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* Historial */}
      <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
        <CreditsHistory userId={clienteId} limit={50} />
      </div>
    </div>
  );
}
