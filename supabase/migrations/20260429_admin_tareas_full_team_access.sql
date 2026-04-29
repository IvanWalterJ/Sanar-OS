-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: acceso total a admin_tareas para todos los miembros del equipo
-- (owner, manager y staff).
--
-- Síntoma: Lupe (manager) creaba tareas y se las asignaba a Javo, pero
-- ella no las veía en su panel. Causa probable: su profile quedó con
-- rol='cliente' por una carrera entre el trigger on_auth_user_created
-- y la RPC promover_a_admin (ver agregarMiembroEquipo en Admin.tsx).
-- Como las RLS sobre admin_tareas chequean rol='admin', cualquier
-- profile que quedó como 'cliente' es invisibilizado por la RLS.
--
-- Esta migración:
--   1) Repara los perfiles con admin_rol seteado pero rol != 'admin'.
--   2) Reescribe las RLS de admin_tareas para aceptar tanto rol='admin'
--      como cualquier admin_rol válido — defensa en profundidad.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Reparar perfiles del equipo que quedaron con rol incorrecto ─────────
UPDATE public.profiles
   SET rol = 'admin',
       onboarding_completed = true
 WHERE admin_rol IN ('owner', 'manager', 'staff')
   AND rol IS DISTINCT FROM 'admin';

-- ─── 2. RLS — SELECT: todo el equipo lee todas las tareas ───────────────────
DROP POLICY IF EXISTS "admin_tareas_read" ON admin_tareas;
CREATE POLICY "admin_tareas_read" ON admin_tareas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND (
           p.rol = 'admin'
           OR p.admin_rol IN ('owner', 'manager', 'staff')
         )
    )
  );

-- ─── 3. RLS — INSERT: cualquier miembro puede crear tareas ──────────────────
DROP POLICY IF EXISTS "admin_tareas_insert" ON admin_tareas;
CREATE POLICY "admin_tareas_insert" ON admin_tareas
  FOR INSERT WITH CHECK (
    creado_por = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND (
           p.rol = 'admin'
           OR p.admin_rol IN ('owner', 'manager', 'staff')
         )
    )
  );

-- ─── 4. RLS — UPDATE: cualquier miembro puede mover/editar tareas ───────────
DROP POLICY IF EXISTS "admin_tareas_update" ON admin_tareas;
CREATE POLICY "admin_tareas_update" ON admin_tareas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND (
           p.rol = 'admin'
           OR p.admin_rol IN ('owner', 'manager', 'staff')
         )
    )
  );

-- ─── 5. RLS — DELETE: cualquier miembro puede eliminar tareas ───────────────
DROP POLICY IF EXISTS "admin_tareas_delete" ON admin_tareas;
CREATE POLICY "admin_tareas_delete" ON admin_tareas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
       WHERE p.id = auth.uid()
         AND (
           p.rol = 'admin'
           OR p.admin_rol IN ('owner', 'manager', 'staff')
         )
    )
  );
