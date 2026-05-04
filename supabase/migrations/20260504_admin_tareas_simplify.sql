-- ═══════════════════════════════════════════════════════════════════════════
-- Simplificación de admin_tareas a 4 estados (estilo Trello/ClickUp)
--
-- Cambios:
--   1. Re-reparar perfiles del equipo cuyo rol quedó como 'cliente' (defensa
--      en profundidad por si el trigger on_auth_user_created ganó la carrera
--      contra promover_a_admin después de la migración 20260429).
--   2. Migrar datos existentes: 'asignadas' → 'por_hacer', 'aprobadas' → 'completadas'.
--   3. Reemplazar el CHECK constraint del status con los 4 estados nuevos.
--   4. RPC `get_admin_tareas_with_users` que devuelve tareas con asignado_nombre,
--      creador_nombre y cliente_nombre via JOIN — un solo round-trip.
--   5. Trigger defensivo: cuando se actualiza profiles.admin_rol a un valor
--      válido, garantizar que rol='admin' para que las RLS lo dejen pasar.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Reparar perfiles del equipo ─────────────────────────────────────────
UPDATE public.profiles
   SET rol = 'admin',
       onboarding_completed = true
 WHERE admin_rol IN ('owner', 'manager', 'staff')
   AND rol IS DISTINCT FROM 'admin';

-- ─── 2. Migrar datos existentes a los 4 estados nuevos ──────────────────────
UPDATE public.admin_tareas SET status = 'por_hacer'   WHERE status = 'asignadas';
UPDATE public.admin_tareas SET status = 'completadas' WHERE status = 'aprobadas';

-- ─── 3. Reemplazar CHECK constraint ─────────────────────────────────────────
ALTER TABLE public.admin_tareas
  DROP CONSTRAINT IF EXISTS admin_tareas_status_check;

ALTER TABLE public.admin_tareas
  ADD CONSTRAINT admin_tareas_status_check
  CHECK (status IN ('por_hacer', 'en_proceso', 'en_revision', 'completadas'));

-- ─── 4. RPC con JOIN a profiles ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_admin_tareas_with_users()
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
  ORDER BY t.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_tareas_with_users() TO authenticated;

-- ─── 5. Trigger defensivo en profiles ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ensure_admin_rol_consistency()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Si admin_rol es uno válido, garantizar rol='admin' para que las RLS pasen.
  IF NEW.admin_rol IN ('owner', 'manager', 'staff') AND NEW.rol IS DISTINCT FROM 'admin' THEN
    NEW.rol := 'admin';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_admin_rol_consistency ON public.profiles;
CREATE TRIGGER trg_profiles_admin_rol_consistency
  BEFORE INSERT OR UPDATE OF admin_rol ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_admin_rol_consistency();
