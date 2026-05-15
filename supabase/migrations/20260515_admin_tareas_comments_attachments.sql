-- ═══════════════════════════════════════════════════════════════════════════
-- Conversación + adjuntos en admin_tareas
--
-- Agrega:
--   1. Tabla `admin_tareas_comentarios` — hilo de respuestas por tarea.
--   2. Tabla `admin_tareas_adjuntos`    — metadatos de archivos subidos a Storage.
--   3. Bucket `task-attachments` (privado) + policies para el equipo.
--   4. RPCs `get_tarea_comentarios` / `get_tarea_adjuntos` con join a profiles
--      para devolver `autor_nombre` ya resuelto.
--
-- La descripción de la tarea sigue siendo TEXT pero ahora guardamos HTML
-- (output de Tiptap). Texto plano existente sigue renderizando correcto.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Tabla de comentarios ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_tareas_comentarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id    UUID NOT NULL REFERENCES public.admin_tareas(id) ON DELETE CASCADE,
  autor_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_tareas_comentarios_tarea
  ON public.admin_tareas_comentarios(tarea_id, created_at);

ALTER TABLE public.admin_tareas_comentarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_tareas_comentarios_read" ON admin_tareas_comentarios;
CREATE POLICY "admin_tareas_comentarios_read" ON admin_tareas_comentarios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND (p.rol = 'admin' OR p.admin_rol IN ('owner','manager','staff'))
    )
  );

DROP POLICY IF EXISTS "admin_tareas_comentarios_insert" ON admin_tareas_comentarios;
CREATE POLICY "admin_tareas_comentarios_insert" ON admin_tareas_comentarios
  FOR INSERT WITH CHECK (
    autor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND (p.rol = 'admin' OR p.admin_rol IN ('owner','manager','staff'))
    )
  );

DROP POLICY IF EXISTS "admin_tareas_comentarios_delete" ON admin_tareas_comentarios;
CREATE POLICY "admin_tareas_comentarios_delete" ON admin_tareas_comentarios
  FOR DELETE USING (autor_id = auth.uid());

-- ─── 2. Tabla de adjuntos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_tareas_adjuntos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id     UUID NOT NULL REFERENCES public.admin_tareas(id) ON DELETE CASCADE,
  autor_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  mime_type    TEXT,
  size_bytes   BIGINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_tareas_adjuntos_tarea
  ON public.admin_tareas_adjuntos(tarea_id, created_at);

ALTER TABLE public.admin_tareas_adjuntos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_tareas_adjuntos_read" ON admin_tareas_adjuntos;
CREATE POLICY "admin_tareas_adjuntos_read" ON admin_tareas_adjuntos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND (p.rol = 'admin' OR p.admin_rol IN ('owner','manager','staff'))
    )
  );

DROP POLICY IF EXISTS "admin_tareas_adjuntos_insert" ON admin_tareas_adjuntos;
CREATE POLICY "admin_tareas_adjuntos_insert" ON admin_tareas_adjuntos
  FOR INSERT WITH CHECK (
    autor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND (p.rol = 'admin' OR p.admin_rol IN ('owner','manager','staff'))
    )
  );

DROP POLICY IF EXISTS "admin_tareas_adjuntos_delete" ON admin_tareas_adjuntos;
CREATE POLICY "admin_tareas_adjuntos_delete" ON admin_tareas_adjuntos
  FOR DELETE USING (autor_id = auth.uid());

-- ─── 3. Storage bucket privado + policies ──────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "task_attachments_read" ON storage.objects;
CREATE POLICY "task_attachments_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-attachments'
    AND EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND (p.rol = 'admin' OR p.admin_rol IN ('owner','manager','staff'))
    )
  );

DROP POLICY IF EXISTS "task_attachments_insert" ON storage.objects;
CREATE POLICY "task_attachments_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-attachments'
    AND EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND (p.rol = 'admin' OR p.admin_rol IN ('owner','manager','staff'))
    )
  );

DROP POLICY IF EXISTS "task_attachments_delete" ON storage.objects;
CREATE POLICY "task_attachments_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'task-attachments'
    AND EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND (p.rol = 'admin' OR p.admin_rol IN ('owner','manager','staff'))
    )
  );

-- ─── 4. RPCs con join a profiles ───────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_tarea_comentarios(UUID);
CREATE OR REPLACE FUNCTION public.get_tarea_comentarios(p_tarea_id UUID)
RETURNS TABLE (
  id           UUID,
  tarea_id     UUID,
  autor_id     UUID,
  autor_nombre TEXT,
  contenido    TEXT,
  created_at   TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.tarea_id, c.autor_id, p.nombre AS autor_nombre, c.contenido, c.created_at
    FROM public.admin_tareas_comentarios c
    LEFT JOIN public.profiles p ON p.id = c.autor_id
   WHERE c.tarea_id = p_tarea_id
     AND EXISTS (
       SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
          AND (pr.rol = 'admin' OR pr.admin_rol IN ('owner','manager','staff'))
     )
   ORDER BY c.created_at ASC;
$$;
GRANT EXECUTE ON FUNCTION public.get_tarea_comentarios(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.get_tarea_adjuntos(UUID);
CREATE OR REPLACE FUNCTION public.get_tarea_adjuntos(p_tarea_id UUID)
RETURNS TABLE (
  id           UUID,
  tarea_id     UUID,
  autor_id     UUID,
  autor_nombre TEXT,
  storage_path TEXT,
  file_name    TEXT,
  mime_type    TEXT,
  size_bytes   BIGINT,
  created_at   TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.tarea_id, a.autor_id, p.nombre AS autor_nombre,
         a.storage_path, a.file_name, a.mime_type, a.size_bytes, a.created_at
    FROM public.admin_tareas_adjuntos a
    LEFT JOIN public.profiles p ON p.id = a.autor_id
   WHERE a.tarea_id = p_tarea_id
     AND EXISTS (
       SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
          AND (pr.rol = 'admin' OR pr.admin_rol IN ('owner','manager','staff'))
     )
   ORDER BY a.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_tarea_adjuntos(UUID) TO authenticated;
