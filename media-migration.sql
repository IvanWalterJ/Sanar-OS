-- ============================================================
-- SANAR OS — Media Migration
-- Correr este SQL en el SQL Editor de Supabase Dashboard
-- ============================================================

-- 1. Agregar columnas de multimedia a la tabla mensajes
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS tipo_archivo TEXT;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS archivo_url  TEXT;

-- 2. Crear el bucket de Storage para archivos de mensajes
INSERT INTO storage.buckets (id, name, public)
VALUES ('mensajes-archivos', 'mensajes-archivos', true)
ON CONFLICT DO NOTHING;

-- 3. Políticas de Storage
-- Permitir subida a usuarios autenticados
CREATE POLICY "mensajes_archivos_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mensajes-archivos');

-- Permitir lectura pública (los archivos son URLs públicas)
CREATE POLICY "mensajes_archivos_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'mensajes-archivos');

-- Permitir que el dueño del archivo lo borre
CREATE POLICY "mensajes_archivos_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mensajes-archivos' AND auth.uid()::text = (storage.foldername(name))[1]);
