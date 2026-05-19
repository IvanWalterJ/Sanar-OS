-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN: Admin Roles, Manager Checklist & Notificaciones
-- Correr en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. Agregar campo `admin_rol` a profiles
--    Valores: 'owner', 'manager', 'staff' (solo para rol = 'admin')
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_rol TEXT DEFAULT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 2. Tabla de checklist para managers/admins
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_tareas_checklist (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titulo            TEXT NOT NULL,
  descripcion       TEXT,
  categoria         TEXT NOT NULL DEFAULT 'diaria',  -- 'diaria', 'semanal', 'mensual'
  completada        BOOLEAN DEFAULT false,
  fecha_completada  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS para admin_tareas_checklist
ALTER TABLE admin_tareas_checklist ENABLE ROW LEVEL SECURITY;

-- Admins pueden gestionar sus propios items del checklist
DROP POLICY IF EXISTS "admin_checklist_own" ON admin_tareas_checklist;
CREATE POLICY "admin_checklist_own" ON admin_tareas_checklist
  FOR ALL USING (
    admin_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- Owner puede ver todos los items del checklist
DROP POLICY IF EXISTS "owner_checklist_all" ON admin_tareas_checklist;
CREATE POLICY "owner_checklist_all" ON admin_tareas_checklist
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND admin_rol = 'owner')
  );

-- ═══════════════════════════════════════════════════════════════
-- 3. Tabla de notificaciones
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notificaciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,  -- 'hito', 'tarea', 'mensaje', 'sistema', 'admin'
  titulo        TEXT NOT NULL,
  descripcion   TEXT,
  leida         BOOLEAN DEFAULT false,
  accion_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario
  ON notificaciones(usuario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notificaciones_no_leidas
  ON notificaciones(usuario_id) WHERE leida = false;

-- RLS para notificaciones
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden leer sus propias notificaciones
DROP POLICY IF EXISTS "notif_read_own" ON notificaciones;
CREATE POLICY "notif_read_own" ON notificaciones
  FOR SELECT USING (usuario_id = auth.uid());

-- Usuarios pueden actualizar sus propias notificaciones (marcar como leída)
DROP POLICY IF EXISTS "notif_update_own" ON notificaciones;
CREATE POLICY "notif_update_own" ON notificaciones
  FOR UPDATE USING (usuario_id = auth.uid());

-- Inserción via función SECURITY DEFINER (ver abajo)

-- ═══════════════════════════════════════════════════════════════
-- 4. Función SECURITY DEFINER para crear notificaciones
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION crear_notificacion(
  p_usuario_id  UUID,
  p_tipo        TEXT,
  p_titulo      TEXT,
  p_descripcion TEXT DEFAULT NULL,
  p_accion_url  TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notificaciones (usuario_id, tipo, titulo, descripcion, accion_url)
  VALUES (p_usuario_id, p_tipo, p_titulo, p_descripcion, p_accion_url)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 5. Actualizar programa_videos para organización por pilar
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE programa_videos
  ADD COLUMN IF NOT EXISTS pilar_id TEXT;

-- Migrar valores existentes de grupo a pilar_id
UPDATE programa_videos SET pilar_id = 'P1'  WHERE grupo = 'A' AND pilar_id IS NULL;
UPDATE programa_videos SET pilar_id = 'P4'  WHERE grupo = 'B' AND pilar_id IS NULL;
UPDATE programa_videos SET pilar_id = 'P6'  WHERE grupo = 'C' AND pilar_id IS NULL;
UPDATE programa_videos SET pilar_id = 'P7'  WHERE grupo = 'D' AND pilar_id IS NULL;
UPDATE programa_videos SET pilar_id = 'P9A' WHERE grupo = 'E' AND pilar_id IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- 6. Función para sembrar checklist por defecto de un manager
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION seed_manager_checklist(p_admin_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO admin_tareas_checklist (admin_id, titulo, descripcion, categoria) VALUES
    (p_admin_id, 'Responder mensajes del día',         'Revisar y responder todos los mensajes de clientes',            'diaria'),
    (p_admin_id, 'Revisar nuevos formularios',          'Verificar formularios de bienvenida completados',               'diaria'),
    (p_admin_id, 'Seguimiento a clientes inactivos',    'Contactar clientes sin actividad en los últimos 3 días',        'diaria'),
    (p_admin_id, 'Seguimiento de llamadas agendadas',   'Confirmar que los clientes asistieron a sus llamadas',          'diaria'),
    (p_admin_id, 'Revisar progreso de clientes',        'Verificar avance semanal de cada cliente',                      'semanal'),
    (p_admin_id, 'Preparar resumen semanal',            'Compilar métricas y progreso para reporte al owner',            'semanal'),
    (p_admin_id, 'Actualizar estados de clientes',      'Revisar y actualizar estados (activo, pausado, etc.)',          'semanal'),
    (p_admin_id, 'Revisión mensual de retención',       'Análisis de churn y retención del mes',                         'mensual');
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 7. Permisos para rol authenticated (requerido para SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION crear_notificacion(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION seed_manager_checklist(UUID) TO authenticated;
