-- ═══════════════════════════════════════════════════════════════════════════
-- Archivado de admin_tareas
--
-- Cambios:
--   1. Columna `archivada_at TIMESTAMPTZ NULL` — null = activa, timestamp = archivada.
--   2. Index parcial para acelerar listados que excluyen archivadas (caso común).
--   3. Index para ver archivadas ordenadas por fecha de archivado.
--   4. Reemplazar RPC `get_admin_tareas_with_users` para devolver `archivada_at`
--      y aceptar parámetro `incluir_archivadas` (default false).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Columna archivada_at ───────────────────────────────────────────────
ALTER TABLE public.admin_tareas
  ADD COLUMN IF NOT EXISTS archivada_at TIMESTAMPTZ;

-- ─── 2. Index parcial para queries por defecto (excluyen archivadas) ──────
CREATE INDEX IF NOT EXISTS idx_admin_tareas_activas
  ON public.admin_tareas(created_at DESC)
  WHERE archivada_at IS NULL;

-- ─── 3. Index para listar archivadas ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_admin_tareas_archivadas
  ON public.admin_tareas(archivada_at DESC)
  WHERE archivada_at IS NOT NULL;

-- ─── 4. RPC actualizada con archivada_at + filtro opcional ────────────────
DROP FUNCTION IF EXISTS public.get_admin_tareas_with_users();
DROP FUNCTION IF EXISTS public.get_admin_tareas_with_users(BOOLEAN);

CREATE OR REPLACE FUNCTION public.get_admin_tareas_with_users(
  incluir_archivadas BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id                 UUID,
  titulo             TEXT,
  descripcion        TEXT,
  asignado_a         UUID,
  creado_por         UUID,
  cliente_id         UUID,
  prioridad          TEXT,
  fecha_vencimiento  DATE,
  status             TEXT,
  completada_at      TIMESTAMPTZ,
  archivada_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ,
  asignado_nombre    TEXT,
  creador_nombre     TEXT,
  cliente_nombre     TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.titulo,
    t.descripcion,
    t.asignado_a,
    t.creado_por,
    t.cliente_id,
    t.prioridad,
    t.fecha_vencimiento,
    t.status,
    t.completada_at,
    t.archivada_at,
    t.created_at,
    t.updated_at,
    pa.nombre AS asignado_nombre,
    pc.nombre AS creador_nombre,
    pcl.nombre AS cliente_nombre
  FROM public.admin_tareas t
  LEFT JOIN public.profiles pa  ON pa.id  = t.asignado_a
  LEFT JOIN public.profiles pc  ON pc.id  = t.creado_por
  LEFT JOIN public.profiles pcl ON pcl.id = t.cliente_id
  WHERE EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = auth.uid()
       AND (p.rol = 'admin' OR p.admin_rol IN ('owner', 'manager', 'staff'))
  )
    AND (incluir_archivadas OR t.archivada_at IS NULL)
  ORDER BY t.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_tareas_with_users(BOOLEAN) TO authenticated;
