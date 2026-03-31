-- ============================================================
-- SANAR OS — Migración: Tabla programa_videos
-- Correr en el SQL Editor del Supabase Dashboard (una sola vez)
-- ============================================================

-- 1. CREAR TABLA
CREATE TABLE IF NOT EXISTS programa_videos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo       CHAR(1) NOT NULL CHECK (grupo IN ('A','B','C','D','E')),
  titulo      TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  youtube_url TEXT NOT NULL,
  duracion    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. HABILITAR RLS
ALTER TABLE programa_videos ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS

-- Todos los usuarios autenticados pueden leer los videos
CREATE POLICY "Authenticated users can read videos" ON programa_videos
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Solo el admin puede insertar videos
CREATE POLICY "Admin can insert videos" ON programa_videos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol = 'admin'
    )
  );

-- Solo el admin puede eliminar videos
CREATE POLICY "Admin can delete videos" ON programa_videos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol = 'admin'
    )
  );

-- Solo el admin puede actualizar videos (por si hace falta en el futuro)
CREATE POLICY "Admin can update videos" ON programa_videos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol = 'admin'
    )
  );
