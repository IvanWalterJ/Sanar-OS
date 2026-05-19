-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: Advisor de Supabase — RLS Disabled (CRITICAL) + Auth RLS InitPlan (WARN)
--
-- 1) CRITICAL — RLS Disabled in Public:
--      public.tareas_template, public.biblioteca_videos, public.biblioteca_recursos
--    Estas son tablas de catálogo: las leen los clientes, las edita el equipo.
--
-- 2) WARNING — Auth RLS Initialization Plan:
--      public.tareas_usuario, public.metricas, public.mensajes
--    Las policies usaban auth.uid() directamente → Postgres lo re-evaluaba por
--    fila. Las reescribimos como (SELECT auth.uid()) para que se evalúe una
--    sola vez por query (InitPlan).
--
-- Modelo de "miembro del equipo" (consistente con
-- 20260429_admin_tareas_full_team_access.sql):
--   profiles.rol = 'admin'  OR  profiles.admin_rol IN ('owner','manager','staff')
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Helper: is_team_member() ───────────────────────────────────────────────
-- SECURITY DEFINER bypassa RLS sobre profiles → evita recursión y cachea
-- el resultado por query. STABLE permite a Postgres reusar el valor.
CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles p
     WHERE p.id = auth.uid()
       AND (
         p.rol = 'admin'
         OR p.admin_rol IN ('owner', 'manager', 'staff')
       )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_team_member() TO authenticated;

-- ─── Helper: drop_all_policies() ────────────────────────────────────────────
-- Dropea TODAS las policies de una tabla. Necesario porque no conocemos los
-- nombres exactos de las policies viejas; si quedan, el Advisor sigue
-- avisando aunque las nuevas funcionen igual.
CREATE OR REPLACE FUNCTION public.__drop_all_policies(p_table regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname
      FROM pg_policy
     WHERE polrelid = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol.polname, p_table::text);
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 1 — CRITICAL: habilitar RLS en tablas de catálogo
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── tareas_template ────────────────────────────────────────────────────────
ALTER TABLE public.tareas_template ENABLE ROW LEVEL SECURITY;
SELECT public.__drop_all_policies('public.tareas_template'::regclass);

-- Lectura: cualquier usuario autenticado (los clientes necesitan ver sus tareas)
CREATE POLICY "tareas_template_read" ON public.tareas_template
  FOR SELECT TO authenticated
  USING (true);

-- Escritura: solo el equipo
CREATE POLICY "tareas_template_insert" ON public.tareas_template
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member());

CREATE POLICY "tareas_template_update" ON public.tareas_template
  FOR UPDATE TO authenticated
  USING (public.is_team_member())
  WITH CHECK (public.is_team_member());

CREATE POLICY "tareas_template_delete" ON public.tareas_template
  FOR DELETE TO authenticated
  USING (public.is_team_member());

-- ─── biblioteca_videos ──────────────────────────────────────────────────────
ALTER TABLE public.biblioteca_videos ENABLE ROW LEVEL SECURITY;
SELECT public.__drop_all_policies('public.biblioteca_videos'::regclass);

CREATE POLICY "biblioteca_videos_read" ON public.biblioteca_videos
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "biblioteca_videos_insert" ON public.biblioteca_videos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member());

CREATE POLICY "biblioteca_videos_update" ON public.biblioteca_videos
  FOR UPDATE TO authenticated
  USING (public.is_team_member())
  WITH CHECK (public.is_team_member());

CREATE POLICY "biblioteca_videos_delete" ON public.biblioteca_videos
  FOR DELETE TO authenticated
  USING (public.is_team_member());

-- ─── biblioteca_recursos ────────────────────────────────────────────────────
ALTER TABLE public.biblioteca_recursos ENABLE ROW LEVEL SECURITY;
SELECT public.__drop_all_policies('public.biblioteca_recursos'::regclass);

CREATE POLICY "biblioteca_recursos_read" ON public.biblioteca_recursos
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "biblioteca_recursos_insert" ON public.biblioteca_recursos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_member());

CREATE POLICY "biblioteca_recursos_update" ON public.biblioteca_recursos
  FOR UPDATE TO authenticated
  USING (public.is_team_member())
  WITH CHECK (public.is_team_member());

CREATE POLICY "biblioteca_recursos_delete" ON public.biblioteca_recursos
  FOR DELETE TO authenticated
  USING (public.is_team_member());

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 2 — WARNING: optimizar policies (auth.uid() → (SELECT auth.uid()))
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── tareas_usuario ─────────────────────────────────────────────────────────
-- Cliente: maneja sus propias tareas. Equipo: ve y edita las de cualquiera.
ALTER TABLE public.tareas_usuario ENABLE ROW LEVEL SECURITY;
SELECT public.__drop_all_policies('public.tareas_usuario'::regclass);

CREATE POLICY "tareas_usuario_read" ON public.tareas_usuario
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_team_member()
  );

CREATE POLICY "tareas_usuario_insert" ON public.tareas_usuario
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_team_member()
  );

CREATE POLICY "tareas_usuario_update" ON public.tareas_usuario
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_team_member()
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_team_member()
  );

CREATE POLICY "tareas_usuario_delete" ON public.tareas_usuario
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_team_member()
  );

-- ─── metricas ───────────────────────────────────────────────────────────────
ALTER TABLE public.metricas ENABLE ROW LEVEL SECURITY;
SELECT public.__drop_all_policies('public.metricas'::regclass);

CREATE POLICY "metricas_read" ON public.metricas
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_team_member()
  );

CREATE POLICY "metricas_insert" ON public.metricas
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_team_member()
  );

CREATE POLICY "metricas_update" ON public.metricas
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_team_member()
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_team_member()
  );

CREATE POLICY "metricas_delete" ON public.metricas
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_team_member()
  );

-- ─── mensajes ───────────────────────────────────────────────────────────────
-- canal='privado'  → visible solo para emisor, receptor y equipo.
-- canales públicos → visibles para cualquier autenticado.
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;
SELECT public.__drop_all_policies('public.mensajes'::regclass);

CREATE POLICY "mensajes_read" ON public.mensajes
  FOR SELECT TO authenticated
  USING (
    canal <> 'privado'
    OR emisor_id  = (SELECT auth.uid())
    OR receptor_id = (SELECT auth.uid())
    OR public.is_team_member()
  );

-- Solo se puede enviar como uno mismo (anti-spoofing).
CREATE POLICY "mensajes_insert" ON public.mensajes
  FOR INSERT TO authenticated
  WITH CHECK (
    emisor_id = (SELECT auth.uid())
  );

-- Editar: solo el autor o el equipo.
CREATE POLICY "mensajes_update" ON public.mensajes
  FOR UPDATE TO authenticated
  USING (
    emisor_id = (SELECT auth.uid())
    OR public.is_team_member()
  )
  WITH CHECK (
    emisor_id = (SELECT auth.uid())
    OR public.is_team_member()
  );

-- Borrar: solo el autor o el equipo.
CREATE POLICY "mensajes_delete" ON public.mensajes
  FOR DELETE TO authenticated
  USING (
    emisor_id = (SELECT auth.uid())
    OR public.is_team_member()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- Limpieza: dropeamos la helper temporal (is_team_member() se queda).
-- ═══════════════════════════════════════════════════════════════════════════
DROP FUNCTION public.__drop_all_policies(regclass);
