/**
 * AdminClienteADN.tsx — Editor de ADN para el equipo (owner / manager).
 *
 * Reutiliza el schema v7 de `adnSchema.ts` y la misma lógica de merge que
 * la página de cliente (perfil + outputs de hoja_de_ruta). Owner y manager
 * pueden editar cualquier campo; staff queda en modo lectura.
 *
 * Cada edición se persiste vía la RPC `admin_update_adn_field` y queda
 * registrada en `adn_audit_log`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Fingerprint,
  User as UserIcon,
  Sparkles,
  DollarSign,
  Building2,
  Megaphone,
  BarChart3,
  Check,
  Circle,
  AlertCircle,
  Pencil,
  Loader2,
  Lock,
  History,
  X as CloseIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, fetchProfileV2 } from '../../lib/supabase';
import type { ProfileV2 } from '../../lib/supabase';
import { SEED_ROADMAP_V3 } from '../../lib/roadmapSeed';
import {
  ADN_SCHEMA_V7,
  calcularCompletitudSeccion,
  calcularCompletitudTotal,
  campoEstaCompleto,
  getADNValor,
  type ADNCampo,
  type ADNSeccion,
  type ADNSeccionCodigo,
} from '../../lib/adnSchema';

type AdminRol = 'owner' | 'manager' | 'staff';

interface AdminClienteADNProps {
  clienteId: string;
  clienteNombre: string;
  adminRol: AdminRol;
}

interface AuditEntry {
  id: string;
  target_user_id: string;
  edited_by: string;
  field_codigo: string;
  field_label?: string | null;
  field_key: string;
  field_path?: string[] | null;
  old_value: unknown;
  new_value: unknown;
  edited_at: string;
  editor?: { nombre?: string };
}

const ICONOS_SECCION: Record<ADNSeccionCodigo, LucideIcon> = {
  ID: Fingerprint,
  META: UserIcon,
  IRR: Sparkles,
  NEG: DollarSign,
  INF: Building2,
  CAP: Megaphone,
  MET: BarChart3,
};

// Campos que viven como TEXT[] en la columna o como string[] anidado.
const ARRAY_FIELDS = new Set<string>([
  'adn_cinco_por_que',
  'adn_avatar.dolores',
  'adn_avatar.suenos',
  'adn_avatar.objeciones',
  'adn_avatar.lenguaje',
]);

// Columnas JSONB estructuradas que se editan como JSON crudo.
const OBJECT_KEYS = new Set<string>([
  'adn_meta_config',
  'adn_skool_setup',
  'adn_retargeting_config',
  'adn_avatar',
  'adn_formulario_bienvenida',
]);

type EditorKind = 'text' | 'array' | 'json';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFieldKeyAndPath(campo: ADNCampo): { fieldKey: string; valuePath: string[] | null } | null {
  if (campo.profileKey) {
    return { fieldKey: campo.profileKey as string, valuePath: null };
  }
  if (campo.profilePath) {
    const [root, ...rest] = campo.profilePath.split('.');
    return { fieldKey: root, valuePath: rest.length ? rest : null };
  }
  return null;
}

function getEditorKind(campo: ADNCampo, currentValue: unknown): EditorKind {
  const ref = campo.profilePath ?? campo.profileKey ?? '';
  if (ARRAY_FIELDS.has(ref)) return 'array';
  if (campo.profileKey && OBJECT_KEYS.has(campo.profileKey)) return 'json';
  if (Array.isArray(currentValue)) return 'array';
  if (currentValue && typeof currentValue === 'object') return 'json';
  return 'text';
}

function formatearValor(valor: unknown): string {
  if (valor === undefined || valor === null) return '—';
  if (typeof valor === 'string') return valor;
  if (Array.isArray(valor)) return valor.filter(Boolean).join(' · ');
  if (typeof valor === 'object') {
    try {
      return JSON.stringify(valor, null, 2);
    } catch {
      return String(valor);
    }
  }
  return String(valor);
}

function valueToEditorString(valor: unknown, kind: EditorKind): string {
  if (valor === undefined || valor === null) return '';
  if (kind === 'array') {
    return Array.isArray(valor) ? valor.filter(Boolean).join('\n') : String(valor);
  }
  if (kind === 'json') {
    try {
      return JSON.stringify(valor, null, 2);
    } catch {
      return String(valor);
    }
  }
  return typeof valor === 'string' ? valor : String(valor);
}

function fechaCorta(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ── Modal de edición ──────────────────────────────────────────────────────────

interface EditModalProps {
  campo: ADNCampo;
  clienteId: string;
  currentValue: unknown;
  onClose: () => void;
  onSaved: () => void;
}

function formatSupabaseError(err: unknown): string {
  if (!err) return 'Error desconocido';
  if (typeof err === 'string') return err;
  const e = err as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof e.message === 'string' && e.message) parts.push(e.message);
  if (typeof e.details === 'string' && e.details) parts.push(`detalle: ${e.details}`);
  if (typeof e.hint === 'string' && e.hint) parts.push(`hint: ${e.hint}`);
  if (typeof e.code === 'string' && e.code) parts.push(`code ${e.code}`);
  if (parts.length === 0) {
    try { return JSON.stringify(err); } catch { return String(err); }
  }
  return parts.join(' · ');
}

function EditModal({ campo, clienteId, currentValue, onClose, onSaved }: EditModalProps) {
  const kind = getEditorKind(campo, currentValue);
  const [text, setText] = useState<string>(() => valueToEditorString(currentValue, kind));
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fieldRef = getFieldKeyAndPath(campo);

  async function handleSave() {
    if (!supabase || !fieldRef) {
      toast.error('No se puede editar este campo');
      return;
    }

    let payload: unknown = text;
    if (kind === 'array') {
      payload = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } else if (kind === 'json') {
      try {
        payload = text.trim() === '' ? null : JSON.parse(text);
        setJsonError(null);
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : 'JSON inválido');
        return;
      }
    } else {
      payload = text;
    }

    setSaving(true);
    setSaveError(null);
    const rpcArgs = {
      target_user_id: clienteId,
      field_codigo: campo.codigo,
      field_label: campo.label,
      field_key: fieldRef.fieldKey,
      new_value: payload,
      value_path: fieldRef.valuePath,
    };
    // eslint-disable-next-line no-console
    console.log('[admin_update_adn_field] llamando con', rpcArgs);
    try {
      const { error, data } = await supabase.rpc('admin_update_adn_field', rpcArgs);
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[admin_update_adn_field] error de RPC:', error);
        throw error;
      }
      // eslint-disable-next-line no-console
      console.log('[admin_update_adn_field] OK:', data);
      toast.success('Campo actualizado');
      onSaved();
      onClose();
    } catch (err) {
      const msg = formatSupabaseError(err);
      // eslint-disable-next-line no-console
      console.error('[admin_update_adn_field] catch:', err);
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0F0F0F] border border-[#F5A623]/30 rounded-2xl shadow-2xl">
        <div className="flex items-start justify-between p-5 border-b border-[#FFFFFF]/10">
          <div>
            <p className="text-[10px] text-[#F5A623] uppercase tracking-widest font-semibold">
              {campo.codigo} · {campo.pilarOrigen}
            </p>
            <h3 className="text-xl font-light text-[#FFFFFF] mt-1">{campo.label}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#FFFFFF]/40 hover:text-[#FFFFFF] transition-colors"
            aria-label="Cerrar"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {kind === 'array' && (
            <p className="text-xs text-[#FFFFFF]/50">
              Una entrada por línea. Las líneas vacías se ignoran.
            </p>
          )}
          {kind === 'json' && (
            <p className="text-xs text-[#FFFFFF]/50">
              Editor de JSON crudo. Mantené la estructura del objeto.
            </p>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={kind === 'json' ? 14 : 10}
            className={`w-full bg-[#FFFFFF]/5 border border-[#FFFFFF]/10 rounded-lg p-3 text-sm text-[#FFFFFF] placeholder-[#FFFFFF]/30 focus:outline-none focus:border-[#F5A623]/60 ${kind === 'json' ? 'font-mono' : ''}`}
            placeholder={kind === 'array' ? 'Una línea por elemento…' : kind === 'json' ? '{ … }' : 'Contenido…'}
          />
          {jsonError && (
            <p className="text-xs text-[#EF4444]">JSON inválido: {jsonError}</p>
          )}
          {saveError && (
            <div className="text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg p-3 whitespace-pre-wrap break-words">
              <p className="font-semibold mb-1">Error al guardar</p>
              <p className="font-mono">{saveError}</p>
              <p className="text-[#FFFFFF]/40 mt-2 text-[10px]">
                Detalle completo en la consola del navegador.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#FFFFFF]/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#FFFFFF]/60 hover:text-[#FFFFFF] transition-colors"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de sección ────────────────────────────────────────────────────────

interface TarjetaSeccionProps {
  seccion: ADNSeccion;
  perfil: Partial<ProfileV2>;
  expandida: boolean;
  onToggle: () => void;
  canEdit: boolean;
  ultimaEdicionPorCampo: Map<string, AuditEntry>;
  onEditar: (campo: ADNCampo) => void;
}

function TarjetaSeccion({
  seccion,
  perfil,
  expandida,
  onToggle,
  canEdit,
  ultimaEdicionPorCampo,
  onEditar,
}: TarjetaSeccionProps) {
  const Icon = ICONOS_SECCION[seccion.codigo];
  const { completos, total, porcentaje } = calcularCompletitudSeccion(perfil, seccion);

  return (
    <div className="card-panel overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-5 flex items-center gap-4 hover:bg-[#F5A623]/5 transition-colors text-left"
      >
        <div className="w-11 h-11 rounded-xl bg-[#F5A623]/15 border border-[#F5A623]/30 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[#F5A623]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-medium text-[#FFFFFF] tracking-tight">{seccion.titulo}</h3>
            <span className="text-[10px] text-[#F5A623] uppercase tracking-widest font-semibold">
              {seccion.codigo} · {seccion.pilarRange}
            </span>
          </div>
          <p className="text-sm text-[#FFFFFF]/50 mt-0.5">{seccion.subtitulo}</p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-[#FFFFFF]/40 uppercase tracking-wider">
              {completos} / {total}
            </p>
            <p className="text-base font-medium text-[#F5A623]">{porcentaje}%</p>
          </div>
          {expandida ? (
            <ChevronUp className="w-5 h-5 text-[#FFFFFF]/40" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#FFFFFF]/40" />
          )}
        </div>
      </button>

      <div className="h-1 bg-[#F5A623]/5">
        <div
          className="h-full bg-[#F5A623] transition-all duration-500"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      {expandida && (
        <div className="px-5 pb-5 pt-3 space-y-3">
          {seccion.campos.map((campo) => {
            const completo = campoEstaCompleto(perfil, campo);
            const valor = getADNValor(perfil, campo);
            const valorTexto = formatearValor(valor);
            const ref = getFieldKeyAndPath(campo);
            const editable = canEdit && ref !== null;
            const ultima = ultimaEdicionPorCampo.get(campo.codigo);

            return (
              <div
                key={campo.codigo}
                className="border-l-2 pl-4 py-2"
                style={{ borderColor: completo ? '#F5A623' : 'rgba(255,255,255,0.1)' }}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {completo ? (
                      <Check className="w-3.5 h-3.5 text-[#F5A623] flex-shrink-0" />
                    ) : campo.pending ? (
                      <AlertCircle className="w-3.5 h-3.5 text-[#FFFFFF]/30 flex-shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[#FFFFFF]/20 flex-shrink-0" />
                    )}
                    <p className="text-sm text-[#FFFFFF]/90 font-medium truncate">{campo.label}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {campo.criticoDia45 && (
                      <span className="text-[9px] uppercase tracking-widest text-[#F5A623] font-semibold">
                        D45
                      </span>
                    )}
                    <span className="text-[10px] text-[#FFFFFF]/30 font-mono">{campo.pilarOrigen}</span>
                    {editable ? (
                      <button
                        type="button"
                        onClick={() => onEditar(campo)}
                        className="p-1.5 rounded-md bg-[#F5A623]/10 hover:bg-[#F5A623]/20 border border-[#F5A623]/30 transition-colors"
                        title="Editar campo"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#F5A623]" />
                      </button>
                    ) : !canEdit ? (
                      <Lock className="w-3.5 h-3.5 text-[#FFFFFF]/20" />
                    ) : null}
                  </div>
                </div>

                {completo ? (
                  <div className="text-[#FFFFFF]/60 text-sm mt-1 pl-5">
                    <p className="whitespace-pre-wrap break-words">{valorTexto}</p>
                  </div>
                ) : (
                  <p className="text-xs text-[#FFFFFF]/30 pl-5 italic">
                    {campo.pending
                      ? 'Campo nuevo · se llenará cuando el cliente complete el pilar.'
                      : `Se completa en ${campo.pilarOrigen}.`}
                  </p>
                )}

                {ultima && (
                  <p className="text-[10px] text-[#FFFFFF]/30 pl-5 mt-1 italic">
                    Editado por {ultima.editor?.nombre ?? 'equipo'} · {fechaCorta(ultima.edited_at)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AdminClienteADN({ clienteId, clienteNombre, adminRol }: AdminClienteADNProps) {
  const canEdit = adminRol === 'owner' || adminRol === 'manager';

  const [perfil, setPerfil] = useState<Partial<ProfileV2>>({});
  const [hojaOutputs, setHojaOutputs] = useState<Record<string, string>>({});
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [campoEnEdicion, setCampoEnEdicion] = useState<ADNCampo | null>(null);
  const [seccionesExpandidas, setSeccionesExpandidas] = useState<Set<ADNSeccionCodigo>>(
    () => new Set<ADNSeccionCodigo>(['IRR']),
  );
  const [historialAbierto, setHistorialAbierto] = useState(false);

  const cargar = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [profileRes, hojaRes, auditRes] = await Promise.all([
        fetchProfileV2(clienteId),
        supabase
          .from('hoja_de_ruta')
          .select('pilar_numero, meta_codigo, completada, output_generado')
          .eq('usuario_id', clienteId)
          .eq('completada', true),
        supabase
          .from('adn_audit_log')
          .select('*')
          .eq('target_user_id', clienteId)
          .order('edited_at', { ascending: false })
          .limit(100),
      ]);

      setPerfil(profileRes ?? {});

      // Resolver nombre del editor en consulta separada (no dependemos del FK).
      const auditEntries = (auditRes.data ?? []) as AuditEntry[];
      const editorIds = Array.from(new Set(auditEntries.map((e) => e.edited_by).filter(Boolean)));
      const nameById = new Map<string, string>();
      if (editorIds.length > 0) {
        const { data: editors } = await supabase
          .from('profiles')
          .select('id, nombre')
          .in('id', editorIds);
        for (const ed of editors ?? []) {
          if (ed?.id) nameById.set(ed.id, ed.nombre ?? '');
        }
      }
      const auditWithNames = auditEntries.map((e) => ({
        ...e,
        editor: { nombre: nameById.get(e.edited_by) || undefined },
      }));

      const outputs: Record<string, string> = {};
      for (const row of hojaRes.data ?? []) {
        const pilar = SEED_ROADMAP_V3.find((p) => p.numero === row.pilar_numero);
        if (!pilar) continue;
        const meta = pilar.metas.find((m) => m.codigo === row.meta_codigo);
        if (!meta?.adn_field) continue;
        const texto = (row.output_generado as { texto?: unknown })?.texto;
        if (typeof texto === 'string' && texto.trim()) {
          if (meta.adn_field === 'historia_300') {
            const m300 = texto.match(/---\s*HISTORIA\s+300\s+PALABRAS\s*---\s*([\s\S]*?)(?=---\s*HISTORIA\s+150|$)/i);
            const m150 = texto.match(/---\s*HISTORIA\s+150\s+PALABRAS\s*---\s*([\s\S]*?)(?=---\s*HISTORIA\s+50|$)/i);
            const m50 = texto.match(/---\s*HISTORIA\s+50\s+PALABRAS\s*---\s*([\s\S]*?)$/i);
            if (m300 && m150 && m50) {
              outputs.historia_300 = m300[1].trim();
              outputs.historia_150 = m150[1].trim();
              outputs.historia_50 = m50[1].trim();
            } else {
              outputs.historia_300 = texto;
            }
          } else {
            outputs[meta.adn_field] = texto;
          }
        }
      }
      setHojaOutputs(outputs);
      setAuditLog(auditWithNames);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Merge perfil + outputs (perfil tiene prioridad — admin override).
  const mergedPerfil = useMemo(() => {
    const merged = { ...perfil } as Record<string, unknown>;
    for (const [key, val] of Object.entries(hojaOutputs)) {
      if (!merged[key] || (typeof merged[key] === 'string' && !(merged[key] as string).trim())) {
        merged[key] = val;
      }
    }
    return merged as Partial<ProfileV2>;
  }, [perfil, hojaOutputs]);

  const ultimaEdicionPorCampo = useMemo(() => {
    const map = new Map<string, AuditEntry>();
    for (const entry of auditLog) {
      if (!map.has(entry.field_codigo)) {
        map.set(entry.field_codigo, entry);
      }
    }
    return map;
  }, [auditLog]);

  const totalStats = calcularCompletitudTotal(mergedPerfil);

  const toggleSeccion = (codigo: ADNSeccionCodigo) => {
    setSeccionesExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#F5A623] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-[10px] text-[#F5A623] uppercase tracking-widest font-semibold">
            ADN del Negocio · {clienteNombre}
          </p>
          <h2 className="text-2xl font-light text-[#FFFFFF] tracking-tight mt-1">
            7 secciones · 56 campos · v7
          </h2>
          {!canEdit && (
            <p className="text-xs text-[#FFFFFF]/50 mt-2 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              Modo lectura — solo owner y manager pueden editar.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setHistorialAbierto((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFFFFF]/5 hover:bg-[#FFFFFF]/10 border border-[#FFFFFF]/10 text-sm text-[#FFFFFF]/70 transition-colors"
        >
          <History className="w-4 h-4" />
          {historialAbierto ? 'Ocultar historial' : `Historial (${auditLog.length})`}
        </button>
      </div>

      {/* Resumen */}
      <div className="card-panel p-5">
        <p className="text-xs text-[#FFFFFF]/40 uppercase tracking-widest mb-1 font-semibold">
          Progreso del ADN
        </p>
        <p className="text-2xl font-light text-[#FFFFFF] tracking-tight">
          {totalStats.porcentaje}%
          <span className="text-sm text-[#FFFFFF]/40 ml-2">
            ({totalStats.completos} de {totalStats.total} campos)
          </span>
        </p>
        <div className="h-2 bg-[#F5A623]/5 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-[#F5A623] rounded-full transition-all duration-700"
            style={{ width: `${totalStats.porcentaje}%` }}
          />
        </div>
      </div>

      {/* Historial de auditoría */}
      {historialAbierto && (
        <div className="card-panel p-5">
          <h3 className="text-sm font-medium text-[#FFFFFF] mb-3">Últimas ediciones</h3>
          {auditLog.length === 0 ? (
            <p className="text-xs text-[#FFFFFF]/40 italic">Sin ediciones registradas todavía.</p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto pr-2">
              {auditLog.slice(0, 30).map((entry) => (
                <li key={entry.id} className="text-xs text-[#FFFFFF]/70 border-l border-[#F5A623]/20 pl-3">
                  <span className="text-[#F5A623] font-medium">{entry.field_label ?? entry.field_codigo}</span>
                  <span className="text-[#FFFFFF]/40"> · {entry.editor?.nombre ?? 'equipo'} · {fechaCorta(entry.edited_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Secciones */}
      <div className="space-y-4">
        {ADN_SCHEMA_V7.map((seccion) => (
          <TarjetaSeccion
            key={seccion.codigo}
            seccion={seccion}
            perfil={mergedPerfil}
            expandida={seccionesExpandidas.has(seccion.codigo)}
            onToggle={() => toggleSeccion(seccion.codigo)}
            canEdit={canEdit}
            ultimaEdicionPorCampo={ultimaEdicionPorCampo}
            onEditar={(campo) => setCampoEnEdicion(campo)}
          />
        ))}
      </div>

      {campoEnEdicion && (
        <EditModal
          campo={campoEnEdicion}
          clienteId={clienteId}
          currentValue={getADNValor(mergedPerfil, campoEnEdicion)}
          onClose={() => setCampoEnEdicion(null)}
          onSaved={cargar}
        />
      )}
    </div>
  );
}
