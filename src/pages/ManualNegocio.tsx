/**
 * ManualNegocio.tsx — Documento estructurado que agrega todos los outputs
 * generados por las herramientas IA en un Manual de Negocio completo.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Download,
  FileText,
  CheckCircle2,
  Loader2,
  Zap,
  BookMarked,
} from 'lucide-react';
import Markdown from 'react-markdown';
import type { ProfileV2 } from '../lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SubseccionDef {
  id: string;
  titulo: string;
  descripcion: string;
  targetPage: string;
  perfilKey?: keyof ProfileV2;
}

interface SeccionDef {
  id: string;
  titulo: string;
  subtitulo: string;
  color: string;
  subsecciones: SubseccionDef[];
}

interface SubseccionHidratada extends SubseccionDef {
  contenido: string | null;
}

interface SeccionHidratada extends Omit<SeccionDef, 'subsecciones'> {
  subsecciones: SubseccionHidratada[];
  completadas: number;
  total: number;
}

// ─── Definición de secciones ─────────────────────────────────────────────────

const SECCIONES_DEF: SeccionDef[] = [
  {
    id: 'perfil',
    titulo: 'TU PERFIL',
    subtitulo: 'El punto de partida: quién sos como profesional',
    color: 'emerald',
    subsecciones: [
      {
        id: 'A1',
        titulo: 'Perfil del Fundador',
        descripcion: 'Tu especialidad, a quién ayudás, qué resultado lográs y tu diferencial único',
        targetPage: 'roadmap',
        perfilKey: 'posicionamiento',
      },
    ],
  },
  {
    id: 'identidad',
    titulo: 'IDENTIDAD',
    subtitulo: 'Tu fundamento como emprendedor/a de la salud',
    color: 'violet',
    subsecciones: [
      {
        id: 'A2',
        titulo: 'Carta del Día 91',
        descripcion: 'La carta que te escribís hoy y leés al terminar el programa',
        targetPage: 'roadmap',
        perfilKey: 'carta_dia91',
      },
      {
        id: 'A3',
        titulo: 'Historia de Origen',
        descripcion: 'Las 3 versiones de tu historia (300/150/50 palabras)',
        targetPage: 'roadmap',
        perfilKey: 'historia_origen',
      },
      {
        id: 'A4',
        titulo: 'Creencias Reformuladas',
        descripcion: 'Tus creencias limitantes convertidas en potenciadoras',
        targetPage: 'roadmap',
      },
      {
        id: 'A5',
        titulo: 'Visión Financiera Clara',
        descripcion: 'Tu meta de ingresos a 90 días y cuántos protocolos necesitás vender',
        targetPage: 'roadmap',
      },
    ],
  },
  {
    id: 'nicho',
    titulo: 'NICHO Y CLIENTE IDEAL',
    subtitulo: 'A quién ayudás y qué te hace único',
    color: 'indigo',
    subsecciones: [
      {
        id: 'B1',
        titulo: 'Definición de Nicho',
        descripcion: 'Tu especialización concreta y diferenciada',
        targetPage: 'roadmap',
        perfilKey: 'nicho',
      },
      {
        id: 'B2',
        titulo: 'Avatar de Cliente Ideal',
        descripcion: 'Perfil completo de tu cliente soñado',
        targetPage: 'roadmap',
        perfilKey: 'avatar_cliente',
      },
      {
        id: 'B3',
        titulo: 'Propuesta de Valor Única',
        descripcion: 'Lo que solo vos podés ofrecer y cómo comunicarlo',
        targetPage: 'roadmap',
      },
    ],
  },
  {
    id: 'programa',
    titulo: 'PROGRAMA Y PRECIO',
    subtitulo: 'Tu oferta y su justificación de valor',
    color: 'emerald',
    subsecciones: [
      {
        id: 'B4',
        titulo: 'Estructura del Protocolo',
        descripcion: 'El diseño paso a paso de tu programa premium',
        targetPage: 'roadmap',
      },
      {
        id: 'B5',
        titulo: 'Justificación de Precio',
        descripcion: 'Por qué tu precio es una inversión, no un gasto',
        targetPage: 'roadmap',
      },
    ],
  },
  {
    id: 'digital',
    titulo: 'PRESENCIA DIGITAL',
    subtitulo: 'Cómo te mostrás y qué decís en cada canal',
    color: 'cyan',
    subsecciones: [
      {
        id: 'D1',
        titulo: 'Bio de Instagram Optimizada',
        descripcion: 'Tu bio que convierte visitantes en seguidores y leads',
        targetPage: 'roadmap',
      },
      {
        id: 'D3',
        titulo: 'Copy de Landing Page',
        descripcion: 'Todos los textos de tu página de ventas',
        targetPage: 'roadmap',
      },
      {
        id: 'C3',
        titulo: 'Plan de Contenido Semanal',
        descripcion: 'Tu calendario editorial para las próximas semanas',
        targetPage: 'roadmap',
      },
    ],
  },
  {
    id: 'ventas',
    titulo: 'CAPTACIÓN Y VENTAS',
    subtitulo: 'Tu sistema para conseguir y cerrar clientes',
    color: 'rose',
    subsecciones: [
      {
        id: 'E1',
        titulo: 'Guión de Llamada de Venta',
        descripcion: 'El flujo completo de tu llamada de cierre',
        targetPage: 'roadmap',
      },
      {
        id: 'E2',
        titulo: 'Manejo de Objeciones',
        descripcion: 'Respuestas preparadas a las dudas más comunes',
        targetPage: 'roadmap',
      },
    ],
  },
];

// ─── Mapas de color estáticos (para Tailwind JIT) ─────────────────────────────

const BORDER_COLOR: Record<string, string> = {
  violet:  'border-l-violet-500',
  indigo:  'border-l-indigo-500',
  emerald: 'border-l-emerald-500',
  cyan:    'border-l-cyan-500',
  rose:    'border-l-rose-500',
};

const BADGE_COLOR: Record<string, string> = {
  violet:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
  indigo:  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cyan:    'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  rose:    'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const PROGRESS_COLOR: Record<string, string> = {
  violet:  'bg-violet-500',
  indigo:  'bg-indigo-500',
  emerald: 'bg-emerald-500',
  cyan:    'bg-cyan-500',
  rose:    'bg-rose-500',
};

// ─── Hidratación ──────────────────────────────────────────────────────────────

function hidratarSecciones(
  def: SeccionDef[],
  perfil: Partial<ProfileV2> | undefined
): SeccionHidratada[] {
  return def.map((seccion) => {
    const subsecciones: SubseccionHidratada[] = seccion.subsecciones.map((sub) => {
      let contenido: string | null = null;

      // 1. localStorage: tcd_herramienta_{id}
      try {
        const raw = localStorage.getItem(`tcd_herramienta_${sub.id}`);
        if (raw) {
          // The value may be a plain string or JSON. Try JSON first, fall back to raw.
          try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'string') {
              contenido = parsed;
            } else if (parsed && typeof parsed.texto === 'string') {
              contenido = parsed.texto;
            } else if (parsed && typeof parsed.output === 'string') {
              contenido = parsed.output;
            } else if (parsed && typeof parsed.contenido === 'string') {
              contenido = parsed.contenido;
            } else {
              // Fallback: stringify so we at least show something
              contenido = raw;
            }
          } catch {
            contenido = raw;
          }
        }
      } catch { /* noop */ }

      // 2. Fallback a campo de ProfileV2
      if (!contenido && sub.perfilKey && perfil) {
        const val = perfil[sub.perfilKey];
        if (typeof val === 'string' && val.trim()) contenido = val;
      }

      return { ...sub, contenido };
    });

    const completadas = subsecciones.filter((s) => s.contenido !== null).length;

    return {
      ...seccion,
      subsecciones,
      completadas,
      total: subsecciones.length,
    };
  });
}

// ─── Exportar PDF ─────────────────────────────────────────────────────────────

async function exportarManualPDF(
  secciones: SeccionHidratada[],
  perfil: Partial<ProfileV2> | undefined
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const margenIzq = 18;
  const margenDer = 192;
  const anchoTexto = margenDer - margenIzq;
  let y = 18;
  const nombreUsuario = perfil?.nombre ?? '';

  // ── Encabezado ──────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 140);
  doc.text('Tu Clínica Digital — Método CLÍNICA', margenIzq, y);
  doc.text(
    new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long' }),
    margenDer,
    y,
    { align: 'right' }
  );
  y += 5;
  doc.setDrawColor(50, 50, 70);
  doc.line(margenIzq, y, margenDer, y);
  y += 20;

  // ── Portada ─────────────────────────────────────────────────────────────────
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 60);
  doc.text('Manual de Negocio', margenIzq, y);
  y += 12;

  if (nombreUsuario) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 110);
    doc.text(nombreUsuario, margenIzq, y);
    y += 8;
  }
  if (perfil?.especialidad) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 130);
    doc.text(perfil.especialidad, margenIzq, y);
    y += 6;
  }
  y += 6;
  doc.setDrawColor(180, 180, 210);
  doc.line(margenIzq, y, margenDer, y);
  y += 14;

  // ── Secciones ────────────────────────────────────────────────────────────────
  for (const seccion of secciones) {
    const conContenido = seccion.subsecciones.filter((s) => s.contenido);
    if (conContenido.length === 0) continue;

    if (y > 240) { doc.addPage(); y = 20; }

    // Título de sección
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 120);
    const secLines = doc.splitTextToSize(seccion.titulo, anchoTexto) as string[];
    doc.text(secLines, margenIzq, y);
    y += secLines.length * 7 + 2;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 140);
    const subTituloLines = doc.splitTextToSize(seccion.subtitulo, anchoTexto) as string[];
    doc.text(subTituloLines, margenIzq, y);
    y += subTituloLines.length * 5 + 6;

    doc.setDrawColor(180, 180, 210);
    doc.line(margenIzq, y, margenDer, y);
    y += 8;

    // Subsecciones
    for (const sub of conContenido) {
      if (y > 250) { doc.addPage(); y = 20; }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 80);
      doc.text(sub.titulo, margenIzq, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 70);

      const parrafos = (sub.contenido ?? '').split('\n');
      for (const parrafo of parrafos) {
        if (y > 272) { doc.addPage(); y = 20; }

        if (parrafo.startsWith('##')) {
          y += 2;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(50, 50, 100);
          const lines = doc.splitTextToSize(parrafo.replace(/^#+\s*/, ''), anchoTexto) as string[];
          doc.text(lines, margenIzq, y);
          y += lines.length * 5.5 + 1;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 70);
        } else if (parrafo.startsWith('**') && parrafo.endsWith('**')) {
          doc.setFont('helvetica', 'bold');
          const lines = doc.splitTextToSize(parrafo.replace(/\*\*/g, ''), anchoTexto) as string[];
          doc.text(lines, margenIzq, y);
          y += lines.length * 5.5;
          doc.setFont('helvetica', 'normal');
        } else if (parrafo.trim() === '') {
          y += 3;
        } else {
          const lines = doc.splitTextToSize(parrafo, anchoTexto) as string[];
          doc.text(lines, margenIzq, y);
          y += lines.length * 5.5;
        }
      }

      y += 8;
    }

    y += 6;
  }

  // ── Pie de página ────────────────────────────────────────────────────────────
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 180);
    doc.text(`Manual de Negocio — ${nombreUsuario}`, margenIzq, 288);
    doc.text(`Página ${i} de ${pageCount}`, margenDer, 288, { align: 'right' });
  }

  const filename = `Manual_Negocio_${(nombreUsuario).replace(/[^a-z0-9áéíóúüñ\s]/gi, '').trim() || 'TuClinicaDigital'}.pdf`;
  doc.save(filename);
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface ManualHeaderProps {
  progresoPct: number;
  totalCompletadas: number;
  totalSubsecciones: number;
  onExportar: () => void;
  exportando: boolean;
  nombreUsuario?: string;
  especialidad?: string;
}

function ManualHeader({
  progresoPct,
  totalCompletadas,
  totalSubsecciones,
  onExportar,
  exportando,
  nombreUsuario,
  especialidad,
}: ManualHeaderProps) {
  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
            <BookMarked className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Manual de Negocio
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {nombreUsuario ? `${nombreUsuario}${especialidad ? ` · ${especialidad}` : ''}` : 'Tu estrategia completa documentada'}
            </p>
          </div>
        </div>
        <button
          onClick={onExportar}
          disabled={exportando || totalCompletadas === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-sm font-medium rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {exportando
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Download className="w-4 h-4" />}
          Exportar PDF
        </button>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">
            {totalCompletadas} de {totalSubsecciones} secciones completadas
          </span>
          <span className="text-xs font-semibold text-indigo-300">{progresoPct}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-700"
            style={{ width: `${progresoPct}%` }}
          />
        </div>
        {totalCompletadas === 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Completá herramientas en la Hoja de Ruta para que aparezcan aquí.
          </p>
        )}
      </div>
    </div>
  );
}

interface SubseccionItemProps {
  sub: SubseccionHidratada;
  onNavigate: (page: string) => void;
}

function SubseccionItem({ sub, onNavigate }: SubseccionItemProps) {
  const [expandido, setExpandido] = useState(true);

  if (!sub.contenido) {
    return (
      <div className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-gray-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/50 truncate">{sub.titulo}</p>
            <p className="text-xs text-gray-600 mt-0.5 truncate">{sub.descripcion}</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate(sub.targetPage)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 rounded-lg transition-all whitespace-nowrap shrink-0"
        >
          <Zap className="w-3 h-3" />
          Completar
        </button>
      </div>
    );
  }

  return (
    <div className="p-5">
      <button
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold text-white text-left">{sub.titulo}</span>
        </div>
        {expandido
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 transition-colors shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 transition-colors shrink-0" />}
      </button>

      {expandido && (
        <div className="pl-6 border-l border-white/[0.06]">
          <div className="prose prose-invert prose-sm max-w-none prose-p:text-gray-300 prose-headings:text-white prose-strong:text-white prose-li:text-gray-300 prose-h2:text-base prose-h3:text-sm prose-h2:font-semibold prose-h3:font-medium">
            <Markdown>{sub.contenido}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}

interface SeccionCardProps {
  seccion: SeccionHidratada;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: (page: string) => void;
}

function SeccionCard({ seccion, isExpanded, onToggle, onNavigate }: SeccionCardProps) {
  const borderClass = BORDER_COLOR[seccion.color] ?? 'border-l-indigo-500';
  const badgeClass  = BADGE_COLOR[seccion.color]  ?? BADGE_COLOR.indigo;
  const progressClass = PROGRESS_COLOR[seccion.color] ?? 'bg-indigo-500';
  const seccionPct = seccion.total > 0
    ? Math.round((seccion.completadas / seccion.total) * 100)
    : 0;

  return (
    <div className={`glass-panel rounded-2xl border-l-[3px] ${borderClass} overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 text-left">
          <div className="min-w-0">
            <h2 className="text-[10px] font-bold text-white/30 tracking-widest uppercase">
              {seccion.titulo}
            </h2>
            <p className="text-sm font-medium text-white mt-0.5 truncate">
              {seccion.subtitulo}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${badgeClass}`}>
            {seccion.completadas}/{seccion.total}
          </span>
          <div className="w-14 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${progressClass} transition-all duration-500`}
              style={{ width: `${seccionPct}%` }}
            />
          </div>
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-gray-500" />
            : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {seccion.subsecciones.map((sub) => (
            <SubseccionItem
              key={sub.id}
              sub={sub}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ManualNegocioProps {
  userId?: string;
  perfil?: Partial<ProfileV2>;
  onNavigate: (page: string) => void;
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ManualNegocio({ perfil, onNavigate }: ManualNegocioProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(SECCIONES_DEF.map((s) => s.id))
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportando, setExportando] = useState(false);

  // Recargar cuando otra pestaña actualiza localStorage
  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const secciones = useMemo(
    () => hidratarSecciones(SECCIONES_DEF, perfil),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [perfil, refreshKey]
  );

  const totalSubsecciones = secciones.reduce((a, s) => a + s.total, 0);
  const totalCompletadas  = secciones.reduce((a, s) => a + s.completadas, 0);
  const progresoPct = totalSubsecciones > 0
    ? Math.round((totalCompletadas / totalSubsecciones) * 100)
    : 0;

  const toggleSeccion = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExportarPDF = async () => {
    setExportando(true);
    try {
      await exportarManualPDF(secciones, perfil);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      <ManualHeader
        progresoPct={progresoPct}
        totalCompletadas={totalCompletadas}
        totalSubsecciones={totalSubsecciones}
        onExportar={handleExportarPDF}
        exportando={exportando}
        nombreUsuario={perfil?.nombre}
        especialidad={perfil?.especialidad}
      />

      {secciones.map((seccion) => (
        <SeccionCard
          key={seccion.id}
          seccion={seccion}
          isExpanded={expanded.has(seccion.id)}
          onToggle={() => toggleSeccion(seccion.id)}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
