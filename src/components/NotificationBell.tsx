import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCircle2, MessageSquare, Trophy, Shield } from 'lucide-react';
import { toast } from 'sonner';
import {
  obtenerNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  contarNoLeidas,
  type NotificacionDB,
  type TipoNotificacion,
} from '../lib/notifications';
import { supabase, isSupabaseReady } from '../lib/supabase';

const ICON_MAP: Record<TipoNotificacion, React.ElementType> = {
  hito: Trophy,
  tarea: CheckCircle2,
  mensaje: MessageSquare,
  sistema: Bell,
  admin: Shield,
};

const COLOR_MAP: Record<TipoNotificacion, { text: string; bg: string }> = {
  hito: { text: 'text-[#F5A623]', bg: 'bg-[#F5A623]/10' },
  tarea: { text: 'text-[#22C55E]', bg: 'bg-[#22C55E]/10' },
  mensaje: { text: 'text-[#F5A623]', bg: 'bg-[#F5A623]/10' },
  sistema: { text: 'text-[#F5A623]', bg: 'bg-[#F5A623]/10' },
  admin: { text: 'text-[#F5A623]', bg: 'bg-[#F5A623]/10' },
};

function tiempoRelativo(fechaISO: string): string {
  const ahora = Date.now();
  const fecha = new Date(fechaISO).getTime();
  const diffMs = ahora - fecha;
  const minutos = Math.floor(diffMs / 60_000);
  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `hace ${dias} d`;
  const meses = Math.floor(dias / 30);
  return `hace ${meses} mes${meses > 1 ? 'es' : ''}`;
}

interface NotificationBellProps {
  userId?: string;
  /** Callback con la `accion_url` de la notificación cuando hace click. El padre decide cómo navegar. */
  onNavigate?: (accionUrl: string) => void;
  /** Variant compacta (más chica) para usar en headers densos. */
  size?: 'normal' | 'sm';
}

export default function NotificationBell({ userId, onNavigate, size = 'normal' }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificacionDB[]>([]);
  const [unread, setUnread] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  // Re-posicionar el dropdown cuando se abre o cuando cambia el viewport
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPos(null);
      return;
    }
    const compute = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({
        top: rect.bottom + 12,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [open]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    async function load() {
      const [notifs, count] = await Promise.all([
        obtenerNotificaciones(userId!, 20),
        contarNoLeidas(userId!),
      ]);
      if (!alive) return;
      setItems(notifs);
      setUnread(count);
    }
    load();

    if (!isSupabaseReady() || !supabase) return;
    const channel = supabase.channel(`notif-realtime-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `usuario_id=eq.${userId}`,
      }, (payload) => {
        if (!alive) return;
        const n = payload.new as NotificacionDB;
        setItems(prev => [n, ...prev].slice(0, 20));
        setUnread(prev => prev + 1);
        toast(n.titulo, {
          description: n.descripcion ?? undefined,
          duration: 6000,
          action: n.accion_url && onNavigate
            ? { label: 'Ver', onClick: () => onNavigate(n.accion_url!) }
            : undefined,
        });
      })
      .subscribe();

    return () => {
      alive = false;
      if (supabase) supabase.removeChannel(channel);
    };
  }, [userId]);

  // Cerrar dropdown con Escape o click afuera
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function handleClickNotif(notif: NotificacionDB) {
    if (!notif.leida) {
      await marcarLeida(notif.id);
      setItems(prev => prev.map(n => n.id === notif.id ? { ...n, leida: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    }
    if (notif.accion_url && onNavigate) onNavigate(notif.accion_url);
    setOpen(false);
  }

  async function handleMarkAll() {
    if (!userId) return;
    await marcarTodasLeidas(userId);
    setItems(prev => prev.map(n => ({ ...n, leida: true })));
    setUnread(0);
  }

  const buttonSize = size === 'sm' ? 'w-9 h-9' : 'w-10 h-10';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  if (!userId) return null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className={`${buttonSize} rounded-full card-panel flex items-center justify-center transition-all duration-300 active:scale-95 relative ${
          open ? 'text-[#FFFFFF] bg-[#1C1C1C] shadow-[0_0_15px_rgba(245,166,35,0.15)]' : 'text-[#FFFFFF]/40 hover:text-[#FFFFFF]'
        }`}
        title="Notificaciones"
      >
        <Bell className={`${iconSize} transition-transform duration-300 ${open ? 'scale-110' : 'hover:scale-110'}`} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 bg-[#F5A623] text-black text-[9px] font-bold rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(245,166,35,0.8)]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && pos && createPortal(
        <>
          {/* Backdrop invisible para cerrar al click afuera. z muy alto para
              ganar a cualquier stacking context (backdrop-blur, transform, etc.) */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed w-[calc(100vw-2rem)] md:w-80 card-panel border border-[rgba(245,166,35,0.2)] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200"
            style={{ top: pos.top, right: pos.right, zIndex: 9999 }}
          >
            <div className="p-4 border-b border-[rgba(245,166,35,0.15)] flex items-center justify-between bg-[#1C1C1C]/50">
              <h3 className="font-medium text-[#FFFFFF]">Notificaciones</h3>
              {unread > 0 && (
                <button onClick={handleMarkAll} className="text-xs text-[#F5A623] hover:text-[#FFB94D] transition-colors">
                  Marcar todas como leídas
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {items.length === 0 && (
                <div className="py-12 text-center">
                  <Bell className="w-8 h-8 text-[#FFFFFF]/20 mx-auto mb-3" />
                  <p className="text-sm text-[#FFFFFF]/40">Sin notificaciones</p>
                </div>
              )}
              {items.map(notif => {
                const Icon = ICON_MAP[notif.tipo] ?? Bell;
                const colors = COLOR_MAP[notif.tipo] ?? COLOR_MAP.sistema;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClickNotif(notif)}
                    className={`p-4 border-b border-[rgba(245,166,35,0.08)] hover:bg-[#1C1C1C]/50 transition-colors cursor-pointer flex gap-3 ${notif.leida ? 'opacity-60' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colors.bg}`}>
                      <Icon className={`w-4 h-4 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <p className="text-sm font-medium text-[#FFFFFF]/90 mb-0.5">{notif.titulo}</p>
                        {!notif.leida && (
                          <span className="w-2 h-2 rounded-full bg-[#EF4444] shrink-0 mt-1.5" />
                        )}
                      </div>
                      {notif.descripcion && (
                        <p className="text-xs text-[#FFFFFF]/50 line-clamp-2">{notif.descripcion}</p>
                      )}
                      <p className="text-[10px] text-[#FFFFFF]/30 mt-2">{tiempoRelativo(notif.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 text-center border-t border-[rgba(245,166,35,0.15)] bg-[#1C1C1C]/50">
              <button onClick={() => setOpen(false)} className="text-xs text-[#FFFFFF]/50 hover:text-[#FFFFFF] transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
