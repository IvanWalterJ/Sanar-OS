/**
 * funnelCalcs.ts — Cálculos automáticos del embudo de ventas
 *
 * 9 campos manuales (MetricaSemanaV2) → 8 KPIs calculados → 6 diagnósticos
 */
import type { MetricaSemanaV2 } from './supabase';

// ─── 8 KPIs calculados ─────────────────────────────────────────────────────

export interface FunnelKPIs {
  costo_por_mensaje: number | null;
  pct_dm_formulario: number | null;
  pct_formulario_agenda: number | null;
  pct_show: number | null;
  tasa_cierre: number | null;
  cpv: number | null;           // costo por venta
  phr: number | null;           // pesos por hora real
  proyeccion_mensual: number | null;
}

export function calcularFunnelKPIs(m: MetricaSemanaV2, ticketPromedio?: number): FunnelKPIs {
  const safe = (num: number, den: number) => den > 0 ? num / den : null;

  const costo_por_mensaje = safe(m.gasto_ads, m.mensajes_recibidos);
  const pct_dm_formulario = safe(m.formularios_completados, m.mensajes_recibidos);
  const pct_formulario_agenda = safe(m.agendados, m.formularios_completados);
  const pct_show = safe(m.shows, m.agendados);
  const tasa_cierre = safe(m.ventas_cerradas, m.llamadas_tomadas);
  const cpv = safe(m.gasto_ads, m.ventas_cerradas);
  const horasMensuales = m.horas_trabajadas_semana * 4.33;
  const phr = horasMensuales > 0 ? m.ingresos_cobrados / horasMensuales : null;
  const ticket = ticketPromedio ?? (m.ventas_cerradas > 0 ? m.ingresos_cobrados / m.ventas_cerradas : 0);
  const proyeccion_mensual = m.ventas_cerradas * 4.33 * ticket;

  return {
    costo_por_mensaje,
    pct_dm_formulario,
    pct_formulario_agenda,
    pct_show,
    tasa_cierre,
    cpv,
    phr,
    proyeccion_mensual,
  };
}

// ─── 6 Diagnósticos automáticos ─────────────────────────────────────────────

export type DiagnosticoNivel = 'ok' | 'alerta' | 'critico';

export interface Diagnostico {
  etapa: string;
  mensaje: string;
  nivel: DiagnosticoNivel;
  valor: number | null;
  umbral_ok: number;
  umbral_alerta: number;
}

export function diagnosticarEmbudo(kpis: FunnelKPIs): Diagnostico[] {
  const diagnosticos: Diagnostico[] = [];

  // 1. Costo por mensaje
  if (kpis.costo_por_mensaje !== null) {
    const nivel: DiagnosticoNivel =
      kpis.costo_por_mensaje <= 1.5 ? 'ok' :
      kpis.costo_por_mensaje <= 3 ? 'alerta' : 'critico';
    diagnosticos.push({
      etapa: 'Costo por Mensaje',
      mensaje: nivel === 'ok' ? 'Buen costo de adquisición de mensajes'
        : nivel === 'alerta' ? 'El costo por mensaje está subiendo. Revisá creativos.'
        : 'Costo por mensaje muy alto. Pausá y revisá la segmentación.',
      nivel,
      valor: kpis.costo_por_mensaje,
      umbral_ok: 1.5,
      umbral_alerta: 3,
    });
  }

  // 2. DM → Formulario
  if (kpis.pct_dm_formulario !== null) {
    const pct = kpis.pct_dm_formulario * 100;
    const nivel: DiagnosticoNivel =
      pct >= 40 ? 'ok' : pct >= 20 ? 'alerta' : 'critico';
    diagnosticos.push({
      etapa: 'DM → Formulario',
      mensaje: nivel === 'ok' ? 'Buena conversión de mensajes a formularios'
        : nivel === 'alerta' ? 'Pocos completan el formulario. Revisá el copy del mensaje automático.'
        : 'Muy pocos pasan a formulario. El mensaje inicial no engancha.',
      nivel,
      valor: pct,
      umbral_ok: 40,
      umbral_alerta: 20,
    });
  }

  // 3. Formulario → Agenda
  if (kpis.pct_formulario_agenda !== null) {
    const pct = kpis.pct_formulario_agenda * 100;
    const nivel: DiagnosticoNivel =
      pct >= 50 ? 'ok' : pct >= 30 ? 'alerta' : 'critico';
    diagnosticos.push({
      etapa: 'Formulario → Agenda',
      mensaje: nivel === 'ok' ? 'Buen ratio de agendamiento'
        : nivel === 'alerta' ? 'Pocos agendan después del formulario. Revisá el proceso de seguimiento.'
        : 'Problema serio de agendamiento. ¿Estás llamando rápido?',
      nivel,
      valor: pct,
      umbral_ok: 50,
      umbral_alerta: 30,
    });
  }

  // 4. Show rate
  if (kpis.pct_show !== null) {
    const pct = kpis.pct_show * 100;
    const nivel: DiagnosticoNivel =
      pct >= 70 ? 'ok' : pct >= 50 ? 'alerta' : 'critico';
    diagnosticos.push({
      etapa: 'Tasa de Show',
      mensaje: nivel === 'ok' ? 'Buena asistencia a llamadas'
        : nivel === 'alerta' ? 'Muchos no se presentan. Mandá recordatorios 24h y 1h antes.'
        : 'Tasa de show muy baja. El lead no siente urgencia. Revisá tu confirmación.',
      nivel,
      valor: pct,
      umbral_ok: 70,
      umbral_alerta: 50,
    });
  }

  // 5. Tasa de cierre
  if (kpis.tasa_cierre !== null) {
    const pct = kpis.tasa_cierre * 100;
    const nivel: DiagnosticoNivel =
      pct >= 25 ? 'ok' : pct >= 15 ? 'alerta' : 'critico';
    diagnosticos.push({
      etapa: 'Tasa de Cierre',
      mensaje: nivel === 'ok' ? 'Buen cierre de ventas'
        : nivel === 'alerta' ? 'Cerrás pocas llamadas. Practicá con el Simulador de Ventas.'
        : 'Tasa de cierre muy baja. Revisá tu script y manejo de objeciones.',
      nivel,
      valor: pct,
      umbral_ok: 25,
      umbral_alerta: 15,
    });
  }

  // 6. CPV (costo por venta)
  if (kpis.cpv !== null) {
    const nivel: DiagnosticoNivel =
      kpis.cpv <= 100 ? 'ok' : kpis.cpv <= 250 ? 'alerta' : 'critico';
    diagnosticos.push({
      etapa: 'Costo por Venta',
      mensaje: nivel === 'ok' ? 'Buen retorno sobre inversión publicitaria'
        : nivel === 'alerta' ? 'CPV subiendo. Optimizá el embudo o aumentá el ticket.'
        : 'CPV insostenible. Necesitás revisar todo el embudo.',
      nivel,
      valor: kpis.cpv,
      umbral_ok: 100,
      umbral_alerta: 250,
    });
  }

  return diagnosticos;
}

// ─── Helpers de formato ─────────────────────────────────────────────────────

export function formatPct(val: number | null): string {
  if (val === null) return '—';
  return `${val.toFixed(1)}%`;
}

export function formatCurrency(val: number | null): string {
  if (val === null) return '—';
  return `$${val.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatNumber(val: number | null, decimals = 1): string {
  if (val === null) return '—';
  return val.toFixed(decimals);
}

export function nivelColor(nivel: DiagnosticoNivel): string {
  switch (nivel) {
    case 'ok': return 'text-[#2DD4A0]';
    case 'alerta': return 'text-[#C8893A]';
    case 'critico': return 'text-[#E85555]';
  }
}

export function nivelBgColor(nivel: DiagnosticoNivel): string {
  switch (nivel) {
    case 'ok': return 'bg-[#2DD4A0]/10 border-[#2DD4A0]/20';
    case 'alerta': return 'bg-[#C8893A]/10 border-[#C8893A]/20';
    case 'critico': return 'bg-[#E85555]/10 border-[#E85555]/20';
  }
}

// ─── Empty metrics ──────────────────────────────────────────────────────────

export const EMPTY_METRICAS: MetricaSemanaV2 = {
  user_id: '',
  semana: '',
  gasto_ads: 0,
  mensajes_recibidos: 0,
  formularios_completados: 0,
  agendados: 0,
  shows: 0,
  llamadas_tomadas: 0,
  ventas_cerradas: 0,
  ingresos_cobrados: 0,
  horas_trabajadas_semana: 0,
};
