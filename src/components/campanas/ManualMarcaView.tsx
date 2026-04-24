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
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Palette, Type, ScrollText, Save, RefreshCw, Loader2, CheckCircle2,
  Plus, X, Sparkles, Copy as CopyIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import type { ProfileV2 } from '../../lib/supabase';

interface Props {
  userId?: string;
  perfil?: Partial<ProfileV2>;
  onSaved?: (patch: Partial<ProfileV2>) => void;
}

interface Swatch {
  hex: string;
  rol: string;
}

interface ManualDraft {
  swatches: Swatch[];
  tipografia: string;
  reglas: string;
}

// ─── Paleta de ejemplo (sector salud, aspiracional, premium) ────────────────

const PALETA_EJEMPLO: Swatch[] = [
  { hex: '#0F1419', rol: 'fondo profundo' },
  { hex: '#F5A623', rol: 'acento dorado' },
  { hex: '#FFFFFF', rol: 'texto principal' },
  { hex: '#A8B5C4', rol: 'texto secundario' },
];

const TIPOGRAFIA_EJEMPLO =
  'Inter bold para titulares grandes, Inter regular para cuerpo, DM Serif Display italic para acentos aspiracionales. Maximo 3 pesos en la misma pieza.';

const REGLAS_EJEMPLO =
  [
    '- Nunca fondo blanco puro (usar siempre tonos calidos o profundos)',
    '- El acento dorado #F5A623 debe estar presente en cada pieza',
    '- No usar rojo saturado — choca con la identidad aspiracional',
    '- Textos en MAYUSCULAS solo en titulares, jamas en parrafos',
    '- Fotos de personas: miradas reales, no poses de stock',
  ].join('\n');

// ─── Parser / serializer de paleta ──────────────────────────────────────────

function normalizeHex(raw: string): string {
  let h = raw.trim().toUpperCase();
  if (!h.startsWith('#')) h = '#' + h;
  // #RGB -> #RRGGBB
  if (/^#[0-9A-F]{3}$/.test(h)) {
    h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  return /^#[0-9A-F]{6}$/.test(h) ? h : h;
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(hex);
}

function parsePaleta(s?: string): Swatch[] {
  if (!s || !s.trim()) return [];
  return s
    .split(/[,;\n]/)
    .map((seg) => seg.trim())
    .filter(Boolean)
    .map((seg) => {
      const match = seg.match(/(#[0-9A-Fa-f]{3,8})\s*(.*)$/);
      if (match) {
        return { hex: normalizeHex(match[1]), rol: match[2].trim() };
      }
      return { hex: '#000000', rol: seg };
    });
}

function serializePaleta(swatches: Swatch[]): string {
  return swatches
    .filter((sw) => isValidHex(sw.hex))
    .map((sw) => (sw.rol.trim() ? `${sw.hex} ${sw.rol.trim()}` : sw.hex))
    .join(', ');
}

// ─── Helpers de draft ───────────────────────────────────────────────────────

function draftFromPerfil(perfil?: Partial<ProfileV2>): ManualDraft {
  return {
    swatches: parsePaleta(perfil?.identidad_colores),
    tipografia: perfil?.identidad_tipografia ?? '',
    reglas: perfil?.identidad_reglas_uso ?? '',
  };
}

function countCompletos(draft: ManualDraft): number {
  return [
    draft.swatches.length > 0 ? 1 : 0,
    draft.tipografia.trim().length > 0 ? 1 : 0,
    draft.reglas.trim().length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
}

function swatchesEqual(a: Swatch[], b: Swatch[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((s, i) => s.hex === b[i].hex && s.rol === b[i].rol);
}

// ─── Componente principal ──────────────────────────────────────────────────

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
      !swatchesEqual(draft.swatches, savedSnapshot.swatches) ||
      draft.tipografia !== savedSnapshot.tipografia ||
      draft.reglas !== savedSnapshot.reglas,
    [draft, savedSnapshot],
  );

  const syncConAdn = useCallback(() => {
    const nextSwatches = parsePaleta(perfil?.identidad_colores);
    const nextTipo = (perfil?.identidad_tipografia ?? '').trim();
    if (nextSwatches.length === 0 && !nextTipo) {
      toast.error('El ADN todavia no tiene paleta ni tipografia cargadas.');
      return;
    }
    setDraft((prev) => ({
      swatches: nextSwatches.length > 0 ? nextSwatches : prev.swatches,
      tipografia: nextTipo || prev.tipografia,
      reglas: prev.reglas,
    }));
    toast.success('Cargado desde el ADN. Revisa y guarda.');
  }, [perfil]);

  const cargarEjemplo = useCallback(() => {
    setDraft({
      swatches: [...PALETA_EJEMPLO],
      tipografia: TIPOGRAFIA_EJEMPLO,
      reglas: REGLAS_EJEMPLO,
    });
    toast.success('Ejemplo cargado. Ajustalo a tu marca y guarda.');
  }, []);

  const guardar = useCallback(async () => {
    if (!userId) {
      toast.error('Usuario no identificado.');
      return;
    }
    if (!supabase) {
      toast.error('Supabase no configurado.');
      return;
    }
    // Validacion: todos los swatches deben tener hex valido
    const paletaInvalida = draft.swatches.find((s) => !isValidHex(s.hex));
    if (paletaInvalida) {
      toast.error(`Color invalido: "${paletaInvalida.hex}". Usa formato #RRGGBB.`);
      return;
    }
    setSaving(true);
    const paletaStr = serializePaleta(draft.swatches);
    const patch: Partial<ProfileV2> = {
      identidad_colores: paletaStr || undefined,
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

  const updateSwatch = useCallback((idx: number, patch: Partial<Swatch>) => {
    setDraft((d) => ({
      ...d,
      swatches: d.swatches.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  }, []);

  const addSwatch = useCallback(() => {
    setDraft((d) => ({
      ...d,
      swatches: [...d.swatches, { hex: '#F5A623', rol: '' }],
    }));
  }, []);

  const removeSwatch = useCallback((idx: number) => {
    setDraft((d) => ({
      ...d,
      swatches: d.swatches.filter((_, i) => i !== idx),
    }));
  }, []);

  return (
    <div className="space-y-5">
      {/* Intro + acciones rapidas */}
      <div className="card-panel p-4 border-[rgba(245,166,35,0.2)] flex items-start justify-between gap-4">
        <p className="text-[13px] text-[#FFFFFF]/70 leading-relaxed flex-1">
          Define el codigo visual que{' '}
          <span className="text-[#F5A623] font-semibold">manda sobre cualquier estilo</span> o
          referencia que uses al generar imagenes. La paleta se aplica SIEMPRE, el estilo aporta
          tecnica y tratamiento.
        </p>
        <button
          onClick={cargarEjemplo}
          title="Cargar un ejemplo para probar"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#F5A623] border border-[#F5A623]/30 hover:bg-[#F5A623]/10 transition-all whitespace-nowrap"
        >
          <Sparkles className="w-3 h-3" />
          Cargar ejemplo
        </button>
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

      {/* PALETA — visual */}
      <PaletteSection
        swatches={draft.swatches}
        onUpdate={updateSwatch}
        onAdd={addSwatch}
        onRemove={removeSwatch}
      />

      {/* Tipografia */}
      <Field
        icon={Type}
        label="Tipografia"
        hint="Familia + peso + uso. Podes mencionar varias fuentes y cuando usarlas."
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
        placeholder={'- Nunca fondo blanco puro\n- Acento dorado siempre presente\n- No usar rojo saturado'}
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

// ─── Seccion paleta visual ──────────────────────────────────────────────────

interface PaletteSectionProps {
  swatches: Swatch[];
  onUpdate: (idx: number, patch: Partial<Swatch>) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}

function PaletteSection({ swatches, onUpdate, onAdd, onRemove }: PaletteSectionProps) {
  const isCompleto = swatches.length > 0;
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <Palette className={`w-4 h-4 ${isCompleto ? 'text-[#F5A623]' : 'text-[#FFFFFF]/30'}`} />
        <label className="text-[11px] font-bold tracking-wider uppercase text-[#FFFFFF]/60">
          Paleta de colores
        </label>
        {isCompleto && (
          <span className="text-[9px] text-[#F5A623]/70 font-medium">
            · {swatches.length} color{swatches.length === 1 ? '' : 'es'}
          </span>
        )}
      </div>
      <p className="text-[11px] text-[#FFFFFF]/40 mb-3">
        Estos colores se aplican con prioridad sobre el estilo visual y sobre cualquier imagen de
        referencia al generar.
      </p>

      {/* Gradient bar preview */}
      {swatches.length > 0 && (
        <div
          className="h-8 rounded-lg mb-3 overflow-hidden flex border border-[rgba(245,166,35,0.2)] shadow-inner"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          {swatches.map((sw, i) => (
            <div
              key={i}
              className="flex-1 transition-all"
              style={{ backgroundColor: isValidHex(sw.hex) ? sw.hex : 'transparent' }}
              title={`${sw.hex}${sw.rol ? ' · ' + sw.rol : ''}`}
            />
          ))}
        </div>
      )}

      {/* Swatch grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {swatches.map((sw, i) => (
          <SwatchCard
            key={i}
            swatch={sw}
            onChange={(patch) => onUpdate(i, patch)}
            onRemove={() => onRemove(i)}
          />
        ))}

        {/* Add button card */}
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-2 min-h-[76px] rounded-xl border border-dashed border-[rgba(245,166,35,0.3)] text-[#F5A623]/70 hover:bg-[#F5A623]/5 hover:border-[#F5A623]/50 hover:text-[#F5A623] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="text-[12px] font-medium">Agregar color</span>
        </button>
      </div>
    </div>
  );
}

// ─── Swatch card (un color con preview + hex + rol) ─────────────────────────

interface SwatchCardProps {
  swatch: Swatch;
  onChange: (patch: Partial<Swatch>) => void;
  onRemove: () => void;
}

function SwatchCard({ swatch, onChange, onRemove }: SwatchCardProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [hexLocal, setHexLocal] = useState(swatch.hex);

  useEffect(() => {
    setHexLocal(swatch.hex);
  }, [swatch.hex]);

  const valido = isValidHex(hexLocal);
  const display = valido ? hexLocal : '#1A1A1A';

  const commitHex = useCallback(() => {
    const normalized = normalizeHex(hexLocal);
    if (isValidHex(normalized)) {
      onChange({ hex: normalized });
      setHexLocal(normalized);
    }
  }, [hexLocal, onChange]);

  const copyHex = useCallback(async () => {
    if (!valido) return;
    try {
      await navigator.clipboard.writeText(hexLocal);
      toast.success(`${hexLocal} copiado`);
    } catch {
      /* noop */
    }
  }, [hexLocal, valido]);

  return (
    <div className="group relative flex items-center gap-3 p-2.5 rounded-xl bg-black/20 border border-[rgba(245,166,35,0.15)] hover:border-[#F5A623]/35 transition-all">
      {/* Color preview circle (clickable -> opens native picker) */}
      <button
        type="button"
        onClick={() => colorInputRef.current?.click()}
        className="relative w-12 h-12 rounded-full shrink-0 shadow-lg border-2 border-[#FFFFFF]/10 hover:border-[#FFFFFF]/25 transition-all ring-1 ring-black/40"
        style={{ backgroundColor: display }}
        title="Click para cambiar color"
      >
        {!valido && (
          <span className="absolute inset-0 flex items-center justify-center text-[18px] text-[#FFFFFF]/40">
            ?
          </span>
        )}
      </button>
      <input
        ref={colorInputRef}
        type="color"
        value={valido ? hexLocal : '#F5A623'}
        onChange={(e) => {
          const val = e.target.value.toUpperCase();
          setHexLocal(val);
          onChange({ hex: val });
        }}
        className="sr-only"
      />

      {/* Hex + rol inputs */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={hexLocal}
            onChange={(e) => setHexLocal(e.target.value.toUpperCase())}
            onBlur={commitHex}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            placeholder="#RRGGBB"
            maxLength={7}
            className={`w-[92px] bg-black/30 border rounded-md px-2 py-1 text-[12px] font-mono tracking-wider transition-all focus:outline-none focus:ring-1 ${
              valido
                ? 'border-[rgba(245,166,35,0.3)] text-[#FFFFFF]/90 focus:border-[#F5A623]/60 focus:ring-[#F5A623]/30'
                : 'border-[#EF4444]/40 text-[#EF4444] focus:border-[#EF4444]/60 focus:ring-[#EF4444]/30'
            }`}
          />
          <button
            type="button"
            onClick={copyHex}
            className="p-1 rounded text-[#FFFFFF]/30 hover:text-[#F5A623] transition-colors"
            title="Copiar hex"
          >
            <CopyIcon className="w-3 h-3" />
          </button>
        </div>
        <input
          type="text"
          value={swatch.rol}
          onChange={(e) => onChange({ rol: e.target.value })}
          placeholder="rol (ej: fondo, acento)"
          className="w-full bg-transparent border-0 border-b border-[#FFFFFF]/10 text-[11px] text-[#FFFFFF]/70 placeholder-[#FFFFFF]/25 focus:outline-none focus:border-[#F5A623]/40 pb-0.5"
        />
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#FFFFFF]/30 hover:text-[#EF4444] transition-all"
        title="Eliminar color"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Campo de texto generico ────────────────────────────────────────────────

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
