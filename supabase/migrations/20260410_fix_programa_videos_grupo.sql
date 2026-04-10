-- ============================================================================
-- fix: hace que grupo sea nullable en programa_videos
-- El campo pilar_id es ahora la columna canónica para organizar videos.
-- grupo es legado (solo valores 'A'-'E') y ya no se usa al insertar.
-- ============================================================================

ALTER TABLE programa_videos
  ALTER COLUMN grupo DROP NOT NULL;
