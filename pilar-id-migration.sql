-- ============================================================
-- SANAR OS — Migración: pilar_id en programa_videos
-- Correr en el SQL Editor del Supabase Dashboard.
-- Es idempotente: se puede correr más de una vez sin problema.
-- ============================================================

-- 1. Agregar la columna si no existe
ALTER TABLE programa_videos
  ADD COLUMN IF NOT EXISTS pilar_id TEXT;

-- 2. Backfill: los videos cargados antes de este flujo quedan en P0.
--    Javo los reasigna desde el panel admin cuando los revisa.
UPDATE programa_videos
  SET pilar_id = 'P0'
  WHERE pilar_id IS NULL;

-- 3. Índice para acelerar filtros por pilar en la Biblioteca/Roadmap
CREATE INDEX IF NOT EXISTS programa_videos_pilar_id_idx
  ON programa_videos (pilar_id);
