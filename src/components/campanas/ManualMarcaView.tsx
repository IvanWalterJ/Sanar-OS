/**
 * ManualMarcaView.tsx — Manual de Marca del profesional.
 *
 * Define paleta de colores, tipografia y reglas de uso innegociables que se
 * inyectan con PRIORIDAD MAXIMA en los prompts de generacion de imagen
 * (campanasPrompts.ts -> buildImagePrompt). La paleta manda sobre el estilo
 * visual elegido y sobre cualquier imagen de referencia adjunta.
 *
 * Scope: solo imagenes. El copy/texto sigue usando adnContext() sin cambios.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Palette, Type, ScrollText, Save, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import type { ProfileV2 } from '../../lib/supabase';

interface Props {
  userId?: string;
  perfil?: Partial<ProfileV2>;
  onSaved?: (patch: Partial<ProfileV2>) => void;
}

interface ManualDraft {
  paleta: string;
  tipografia: string;
  reglas: string;
}

function draftFromPerfil(perfil?: Partial<ProfileV2>): ManualDraft {
  return {
    paleta: perfil?.identidad_colores ?? '',
    tipografia: perfil?.identidad_tipografia ?? '',
    reglas: perfil?.identidad_reglas_uso ?? '',
  };
}

function countCompletos(draft: ManualDraft): number {
  return [draft.paleta, draft.tipografia, draft.reglas].filter((v) => v.trim().length > 0).length;
}

export default function ManualMarcaView({ userId, perfil, onSaved }: Props) {
  const [draft, setDraft] = useState<ManualDraft>(() => draftFromPerfil(perfil));
  const [savedSnapshot, setSavedSnapshot] = useState<ManualDraft>(() => draftFromPerfil(perfil));
  const [saving, setSaving] = useState(false);

  // Resincronizamos cuando el perfil llega tarde (fetch asincrono en el padre).
  useEffect(() => {
    const next = draftFromPerfil(perfil);
    setDraft(next);
    setSavedSnapshot(next);
  }, [perfil]);

  const completos = countCompletos(draft);
  const dirty = useMemo(
    () =>
      draft.paleta !== savedSnapshot.paleta ||
      draft.tipografia !== savedSnapshot.tipografia ||
      draft.reglas !== savedSnapshot.reglas,
    [draft, savedSnapshot],
  );

  const syncConAdn = useCallback(() => {
    const nextPaleta = (perfil?.identidad_colores ?? '').trim();
    const nextTipo = (perfil?.identidad_tipografia ?? '').trim();
    if (!nextPaleta && !nextTipo) {
      toast.error('El ADN todavia no tiene paleta ni tipografia cargadas.');
      return;
    }
    setDraft((prev) => ({
      paleta: nextPaleta || prev.paleta,
      tipografia: nextTipo || prev.tipografia,
      reglas: prev.reglas,
    }));
    toast.success('Cargado desde el ADN. Revisa y guarda.');
  }, [perfil]);

  const guardar = useCallback(async () => {
    if (!userId) {
      toast.error('Usuario no identificado.');
      return;
    }
    if (!supabase) {
      toast.error('Supabase no configurado.');
      return;
    }
    setSaving(true);
    const patch: Partial<ProfileV2> = {
      identidad_colores: draft.paleta.trim() || undefined,
      identidad_tipografia: draft.tipografia.trim() || undefined,
      identidad_reglas_uso: draft.reglas.trim() || undefined,
    };
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          identidad_colores: patch.identidad_colores ?? null,
          identidad_tipografia: patch.identidad_tipografia ?? null,
          identidad_reglas_uso: patch.identidad_reglas_uso ?? null,
        })
        .eq('id', userId);
      if (error) throw error;
      setSavedSnapshot({ ...draft });
      onSaved?.(patch);
      toast.success('Manual de marca guardado.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`Error al guardar: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [userId, draft, onSaved]);

  return (
    <div className="space-y-5">
      {/* Intro */}
      <div className="card-panel p-4 border-[rgba(245,166,35,0.2)]">
        <p className="text-[13px] text-[#FFFFFF]/70 leading-relaxed">
          Define el codigo visual que{' '}
          <span className="text-[#F5A623] font-semibold">manda sobre cualquier estilo</span> o
          referencia que uses al generar imagenes. La paleta de marca se aplica SIEMPRE, el estilo
          aporta la tecnica y el tratamiento.
        </p>
      </div>

      {/* Progreso */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#FFFFFF]/40">
            Completado
          </span>
          <span className="text-[11px] font-semibold text-[#FFFFFF]/70">{completos}/3</span>
        </div>
        <div className="flex-1 max-w-xs h-1.5 rounded-full bg-[#FFFFFF]/5 overflow-hidden">
          <div
            className="h-full bg-[#F5A623] transition-all"
            style={{ width: `${(completos / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Paleta */}
      <Field
        icon={Palette}
        label="Paleta de colores"
        hint="Colores hex + rol. Ej: #0F1419 fondo, #F5A623 acento, #FFFFFF texto"
        value={draft.paleta}
        onChange={(v) => setDraft((d) => ({ ...d, paleta: v }))}
        placeholder="#0F1419 fondo principal, #F5A623 acento dorado, #FFFFFF texto sobre oscuro"
        rows={3}
      />

      {/* Tipografia */}
      <Field
        icon={Type}
        label="Tipografia"
        hint="Familia + peso + uso. Ej: Inter bold para titulares, Inter regular para cuerpo"
        value={draft.tipografia}
        onChange={(v) => setDraft((d) => ({ ...d, tipografia: v }))}
        placeholder="Inter bold para titulares, Inter regular para cuerpo, alineacion izquierda"
        rows={3}
      />

      {/* Reglas */}
      <Field
        icon={ScrollText}
        label="Reglas de uso"
        hint="Reglas innegociables que se respetan aunque contradigan otras instrucciones."
        value={draft.reglas}
        onChange={(v) => setDraft((d) => ({ ...d, reglas: v }))}
        placeholder={'- Nunca fondo blanco puro\n- Acento dorado siempre presente\n- No usar rojo saturado\n- Textos en mayusculas solo en titulares'}
        rows={5}
      />

      {/* Acciones */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-[rgba(245,166,35,0.15)]">
        <button
          onClick={syncConAdn}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-[#FFFFFF]/60 border border-[#FFFFFF]/10 hover:border-[#F5A623]/40 hover:text-[#FFFFFF]/90 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sincronizar con ADN
        </button>
        <button
          onClick={guardar}
          disabled={saving || !dirty || !userId}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/40 hover:bg-[#F5A623]/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Guardando...
            </>
          ) : !dirty && completos > 0 ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Guardado
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Guardar manual
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Subcomponente ──────────────────────────────────────────────────────────

interface FieldProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows: number;
}

function Field({ icon: Icon, label, hint, value, onChange, placeholder, rows }: FieldProps) {
  const isCompleto = value.trim().length > 0;
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-4 h-4 ${isCompleto ? 'text-[#F5A623]' : 'text-[#FFFFFF]/30'}`} />
        <label className="text-[11px] font-bold tracking-wider uppercase text-[#FFFFFF]/60">
          {label}
        </label>
        {isCompleto && (
          <span className="text-[9px] text-[#F5A623]/70 font-medium">· cargado</span>
        )}
      </div>
      <p className="text-[11px] text-[#FFFFFF]/40 mb-2">{hint}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full bg-black/20 border border-[rgba(245,166,35,0.25)] rounded-xl p-3 text-[#FFFFFF] text-sm focus:border-[#F5A623]/60 focus:ring-1 focus:ring-[#F5A623]/30 transition-all placeholder-[#FFFFFF]/20 resize-none"
      />
    </div>
  );
}
