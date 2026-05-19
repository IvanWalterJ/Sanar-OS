/**
 * BuyCreditsModal.tsx — Modal de compra de packs de creditos con PayPal.
 *
 * Flujo:
 *   1. Lista packs activos desde credit_packs (server-side)
 *   2. Usuario elige pack · render del PayPal Buttons SDK
 *   3. createOrder() → POST /api/payments/paypal/create-order (devuelve orderId)
 *   4. PayPal popup · usuario aprueba
 *   5. onApprove → POST /api/payments/paypal/capture-order
 *   6. Toast success + refresh del balance
 *
 * Carga el SDK de PayPal on-demand para no inflar el bundle.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Coins, Check, Loader2, ShoppingBag, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchCreditPacks,
  type CreditPack,
  type UserCredits,
  type CreditBalance,
} from '../../lib/credits';
import { supabase } from '../../lib/supabase';

interface BuyCreditsModalProps {
  userId: string;
  currentBalance: CreditBalance;
  credits: UserCredits | null;
  onClose: () => void;
  onPurchaseComplete: () => Promise<void> | void;
}

// SDK PayPal · cargado on-demand
declare global {
  interface Window {
    paypal?: {
      Buttons: (config: PayPalButtonsConfig) => { render: (selector: string | HTMLElement) => Promise<void> };
    };
  }
}

interface PayPalButtonsConfig {
  style?: Record<string, unknown>;
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onError: (err: unknown) => void;
  onCancel?: () => void;
}

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;
const PAYPAL_ENV = (import.meta.env.VITE_PAYPAL_ENV as string | undefined) || 'sandbox';

function loadPayPalSdk(): Promise<void> {
  if (window.paypal) return Promise.resolve();
  if (!PAYPAL_CLIENT_ID) {
    return Promise.reject(new Error('VITE_PAYPAL_CLIENT_ID no configurada'));
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar el SDK de PayPal'));
    document.head.appendChild(script);
  });
}

async function getAuthToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No hay sesion activa');
  return token;
}

export default function BuyCreditsModal({
  userId,
  currentBalance,
  credits,
  onClose,
  onPurchaseComplete,
}: BuyCreditsModalProps) {
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [paypalLoading, setPaypalLoading] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const paypalContainerRef = useRef<HTMLDivElement>(null);

  // Cargar packs
  useEffect(() => {
    fetchCreditPacks().then((p) => {
      setPacks(p);
      setLoading(false);
      // Auto-seleccionar el pack del medio (mejor valor visible)
      if (p.length > 0) setSelectedPack(p[Math.floor(p.length / 2)]);
    });
  }, []);

  // Cargar SDK de PayPal cuando se selecciona un pack
  useEffect(() => {
    if (!selectedPack) return;
    setPaypalLoading(true);
    setPaypalReady(false);
    loadPayPalSdk()
      .then(() => {
        setPaypalReady(true);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Error cargando PayPal');
      })
      .finally(() => setPaypalLoading(false));
  }, [selectedPack]);

  const handleCreateOrder = useCallback(async (): Promise<string> => {
    if (!selectedPack) throw new Error('Pack no seleccionado');
    const token = await getAuthToken();
    const resp = await fetch('/api/payments/paypal/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ packId: selectedPack.id }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`create-order fallo: ${text.slice(0, 200)}`);
    }
    const data = await resp.json() as { orderId: string };
    return data.orderId;
  }, [selectedPack]);

  const handleApprove = useCallback(async (data: { orderID: string }): Promise<void> => {
    setProcessing(true);
    try {
      const token = await getAuthToken();
      const resp = await fetch('/api/payments/paypal/capture-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: data.orderID }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`capture fallo: ${text.slice(0, 200)}`);
      }
      const result = await resp.json() as { credits: number };
      toast.success(`+${result.credits} créditos acreditados`);
      await onPurchaseComplete();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error procesando pago');
    } finally {
      setProcessing(false);
    }
  }, [onPurchaseComplete, onClose]);

  // Renderizar PayPal Buttons cuando el SDK esta listo
  useEffect(() => {
    if (!paypalReady || !selectedPack || !paypalContainerRef.current || !window.paypal) return;

    // Limpiar buttons anteriores antes de re-renderizar
    paypalContainerRef.current.innerHTML = '';

    window.paypal.Buttons({
      style: {
        color: 'gold',
        shape: 'rect',
        label: 'pay',
        height: 45,
      },
      createOrder: handleCreateOrder,
      onApprove: handleApprove,
      onError: (err: unknown) => {
        console.error('[paypal] onError', err);
        toast.error('Error en el pago. Probá de nuevo.');
      },
      onCancel: () => {
        toast.info('Pago cancelado');
      },
    }).render(paypalContainerRef.current).catch(() => {
      // ignore render errors
    });
  }, [paypalReady, selectedPack, handleCreateOrder, handleApprove]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#F5A623]/20 bg-[#0F0F0F] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#F5A623]/10 bg-[#0F0F0F]/95 backdrop-blur p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#F5A623]/15 p-2 border border-[#F5A623]/30">
              <ShoppingBag className="h-5 w-5 text-[#F5A623]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Comprar créditos</h2>
              <p className="text-xs text-white/50 mt-0.5">
                1 crédito = 1 imagen generada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Balance actual */}
          <div className="rounded-xl border border-[#F5A623]/20 bg-[#F5A623]/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Coins className="h-5 w-5 text-[#F5A623]" />
                <span className="text-sm text-white/70">Saldo actual</span>
              </div>
              <span className="text-2xl font-bold text-[#F5A623]">
                {currentBalance.total}
              </span>
            </div>
            {credits && (
              <div className="mt-3 flex items-center justify-between text-xs text-white/50">
                <span>
                  {currentBalance.monthlyRemaining} del plan mensual
                  {' '}
                  ({currentBalance.topup} comprados, no expiran)
                </span>
                <span>
                  Reseteo: {new Date(credits.quota_period_end).toLocaleDateString('es-AR')}
                </span>
              </div>
            )}
          </div>

          {/* Packs */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#F5A623]" />
            </div>
          ) : packs.length === 0 ? (
            <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-[#EF4444] shrink-0 mt-0.5" />
              <div className="text-sm text-white/80">
                No hay packs disponibles en este momento. Contactá al equipo.
              </div>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-white/80 mb-3">
                  Elegí un pack
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {packs.map((pack) => {
                    const isSelected = selectedPack?.id === pack.id;
                    const pricePerCredit = pack.price_usd / pack.credits;
                    return (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => setSelectedPack(pack)}
                        className={`relative rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? 'border-[#F5A623] bg-[#F5A623]/10 shadow-[0_0_20px_rgba(245,166,35,0.2)]'
                            : 'border-white/10 bg-[#1A1A1A] hover:border-[#F5A623]/40 hover:bg-[#F5A623]/5'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 rounded-full bg-[#F5A623] p-1">
                            <Check className="h-3 w-3 text-black" strokeWidth={3} />
                          </div>
                        )}
                        <div className="text-xs uppercase tracking-wider text-white/40 font-medium mb-2">
                          {pack.label}
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">
                          {pack.credits}
                          <span className="text-sm font-normal text-white/50 ml-1">créditos</span>
                        </div>
                        <div className="text-xl font-bold text-[#F5A623]">
                          ${pack.price_usd.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-white/40 mt-1">
                          ${pricePerCredit.toFixed(3)} / crédito
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PayPal button container */}
              {selectedPack && (
                <div className="border-t border-white/10 pt-5">
                  <div className="text-sm text-white/70 mb-3">
                    Pagás <span className="text-white font-semibold">${selectedPack.price_usd.toFixed(2)} USD</span>
                    {' '}por <span className="text-[#F5A623] font-semibold">{selectedPack.credits} créditos</span>
                  </div>

                  {!PAYPAL_CLIENT_ID && (
                    <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-sm text-white/80 mb-3">
                      ⚠️ VITE_PAYPAL_CLIENT_ID no configurada — el botón de PayPal no se va a renderizar.
                    </div>
                  )}

                  {paypalLoading && (
                    <div className="flex items-center gap-2 text-sm text-white/50 py-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando PayPal...
                    </div>
                  )}

                  {processing && (
                    <div className="flex items-center gap-2 text-sm text-[#F5A623] py-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando pago, no cierres esta ventana...
                    </div>
                  )}

                  <div ref={paypalContainerRef} className={processing ? 'opacity-50 pointer-events-none' : ''} />

                  {PAYPAL_ENV === 'sandbox' && (
                    <div className="mt-3 text-[11px] text-white/40 text-center">
                      Modo sandbox · usá una cuenta de prueba de PayPal Developer
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
