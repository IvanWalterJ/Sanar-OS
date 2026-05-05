/**
 * Paleta de colores para diferenciar miembros del equipo en la UI de tareas.
 * Asignación determinística: el mismo userId siempre obtiene el mismo color.
 *
 * Cada color trae:
 *  - solid: hex puro para borde / acento.
 *  - bg: tinta semi-transparente para fondo del avatar.
 *  - border: tinta para borde del avatar.
 *  - text: el solid pero pensado para usar como color de texto sobre fondo oscuro.
 *  - tagBg / tagBorder: para chips/pills.
 */

export interface TeamColor {
  key: string;
  solid: string;
  bg: string;
  border: string;
  text: string;
  tagBg: string;
  tagBorder: string;
}

export const UNASSIGNED_COLOR: TeamColor = {
  key: 'unassigned',
  solid: '#6B6B72',
  bg: 'rgba(107,107,114,0.15)',
  border: 'rgba(107,107,114,0.40)',
  text: '#A0A0A8',
  tagBg: 'rgba(107,107,114,0.12)',
  tagBorder: 'rgba(107,107,114,0.30)',
};

// Paleta principal — el primer color (oro) es el accent de la app y queda
// reservado para el creador (el admin que está logueado mirando la vista).
export const TEAM_PALETTE: TeamColor[] = [
  { key: 'gold',    solid: '#F5A623', bg: 'rgba(245,166,35,0.15)',  border: 'rgba(245,166,35,0.45)',  text: '#FFB94D', tagBg: 'rgba(245,166,35,0.12)', tagBorder: 'rgba(245,166,35,0.35)' },
  { key: 'blue',    solid: '#4FA3E3', bg: 'rgba(79,163,227,0.15)',  border: 'rgba(79,163,227,0.45)',  text: '#7BBFF0', tagBg: 'rgba(79,163,227,0.12)', tagBorder: 'rgba(79,163,227,0.35)' },
  { key: 'violet',  solid: '#A88BF5', bg: 'rgba(168,139,245,0.15)', border: 'rgba(168,139,245,0.45)', text: '#C4ADFF', tagBg: 'rgba(168,139,245,0.12)', tagBorder: 'rgba(168,139,245,0.35)' },
  { key: 'green',   solid: '#5BC68A', bg: 'rgba(91,198,138,0.15)',  border: 'rgba(91,198,138,0.45)',  text: '#7DDBA6', tagBg: 'rgba(91,198,138,0.12)', tagBorder: 'rgba(91,198,138,0.35)' },
  { key: 'pink',    solid: '#E879A6', bg: 'rgba(232,121,166,0.15)', border: 'rgba(232,121,166,0.45)', text: '#F195C0', tagBg: 'rgba(232,121,166,0.12)', tagBorder: 'rgba(232,121,166,0.35)' },
  { key: 'cyan',    solid: '#4FD1C5', bg: 'rgba(79,209,197,0.15)',  border: 'rgba(79,209,197,0.45)',  text: '#7DE0D7', tagBg: 'rgba(79,209,197,0.12)', tagBorder: 'rgba(79,209,197,0.35)' },
  { key: 'orange',  solid: '#F38C40', bg: 'rgba(243,140,64,0.15)',  border: 'rgba(243,140,64,0.45)',  text: '#FBA868', tagBg: 'rgba(243,140,64,0.12)', tagBorder: 'rgba(243,140,64,0.35)' },
  { key: 'indigo',  solid: '#7C8BF7', bg: 'rgba(124,139,247,0.15)', border: 'rgba(124,139,247,0.45)', text: '#A0ADFF', tagBg: 'rgba(124,139,247,0.12)', tagBorder: 'rgba(124,139,247,0.35)' },
];

/** Hash determinístico simple sobre un string. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0; // 32-bit int
  }
  return Math.abs(h);
}

/**
 * Devuelve un color determinístico para un userId.
 * Si `currentUserId` se pasa, ese usuario siempre obtiene oro (TEAM_PALETTE[0])
 * y el resto se reparte por hash sobre los colores restantes — así la persona
 * que está mirando se reconoce siempre del mismo color.
 */
export function getTeamColor(
  userId: string | null | undefined,
  currentUserId?: string,
): TeamColor {
  if (!userId) return UNASSIGNED_COLOR;
  if (currentUserId && userId === currentUserId) return TEAM_PALETTE[0];
  const pool = currentUserId ? TEAM_PALETTE.slice(1) : TEAM_PALETTE;
  return pool[hashString(userId) % pool.length];
}

/** Iniciales de un nombre — máximo 2 letras. */
export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Colores por status (para column headers de Kanban / Lista) ─────────────

import type { AdminTareaStatus, AdminTareaPrioridad } from './supabase';

export const STATUS_COLORS: Record<AdminTareaStatus, TeamColor> = {
  por_hacer: {
    key: 'status-todo',
    solid: '#9CA3AF',
    bg: 'rgba(156,163,175,0.12)',
    border: 'rgba(156,163,175,0.32)',
    text: '#CBD5E1',
    tagBg: 'rgba(156,163,175,0.10)',
    tagBorder: 'rgba(156,163,175,0.25)',
  },
  en_proceso: {
    key: 'status-doing',
    solid: '#3B82F6',
    bg: 'rgba(59,130,246,0.13)',
    border: 'rgba(59,130,246,0.36)',
    text: '#7BA8F2',
    tagBg: 'rgba(59,130,246,0.10)',
    tagBorder: 'rgba(59,130,246,0.25)',
  },
  en_revision: {
    key: 'status-review',
    solid: '#F59E0B',
    bg: 'rgba(245,158,11,0.13)',
    border: 'rgba(245,158,11,0.36)',
    text: '#FBBF24',
    tagBg: 'rgba(245,158,11,0.10)',
    tagBorder: 'rgba(245,158,11,0.25)',
  },
  completadas: {
    key: 'status-done',
    solid: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.34)',
    text: '#34D399',
    tagBg: 'rgba(16,185,129,0.10)',
    tagBorder: 'rgba(16,185,129,0.25)',
  },
};

// ─── Fondos tintados por prioridad para las cards ──────────────────────────

export interface PriorityBg {
  /** Gradient diagonal sutil para superponer al bg base de la card. */
  image: string;
  /** Color sólido de acento (chip, dot). */
  accent: string;
}

export const PRIORITY_BG: Record<AdminTareaPrioridad, PriorityBg> = {
  urgente: {
    image: 'linear-gradient(135deg, rgba(239,68,68,0.16), rgba(239,68,68,0.04) 50%, rgba(239,68,68,0) 80%)',
    accent: '#EF4444',
  },
  alta: {
    image: 'linear-gradient(135deg, rgba(249,115,22,0.18), rgba(249,115,22,0.05) 50%, rgba(249,115,22,0) 80%)',
    accent: '#F97316',
  },
  media: {
    image: 'linear-gradient(135deg, rgba(245,166,35,0.10), rgba(245,166,35,0.02) 50%, rgba(245,166,35,0) 80%)',
    accent: '#F5A623',
  },
  baja: {
    image: 'linear-gradient(135deg, rgba(34,197,94,0.09), rgba(34,197,94,0.02) 50%, rgba(34,197,94,0) 80%)',
    accent: '#22C55E',
  },
};
