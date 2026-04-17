-- ═══════════════════════════════════════════════════════════════════════════
-- Admin Task Pipeline
-- Pipeline interno de tareas para el equipo admin (distinto del pipeline
-- de clientes). 6 columnas: asignadas → por_hacer → en_proceso →
-- completadas → en_revision → aprobadas
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_tareas (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo             TEXT        NOT NULL,
  descripcion        TEXT,
  asignado_a         UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  creado_por         UUID        NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  cliente_id         UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  prioridad          TEXT        NOT NULL DEFAULT 'media'
                                CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  fecha_vencimiento  DATE,
  status             TEXT        NOT NULL DEFAULT 'por_hacer'
                                CHECK (status IN (
                                  'asignadas', 'por_hacer', 'en_proceso',
                                  'completadas', 'en_revision', 'aprobadas'
                                )),
  completada_at      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_admin_tareas_asignado
  ON admin_tareas(asignado_a, status);

CREATE INDEX IF NOT EXISTS idx_admin_tareas_status_fecha
  ON admin_tareas(status, fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_admin_tareas_cliente
  ON admin_tareas(cliente_id)
  WHERE cliente_id IS NOT NULL;

-- updated_at automático
CREATE OR REPLACE FUNCTION touch_admin_tareas_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_admin_tareas_updated_at ON admin_tareas;
CREATE TRIGGER trg_admin_tareas_updated_at
  BEFORE UPDATE ON admin_tareas
  FOR EACH ROW EXECUTE FUNCTION touch_admin_tareas_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE admin_tareas ENABLE ROW LEVEL SECURITY;

-- Todos los admins pueden leer todas las tareas
DROP POLICY IF EXISTS "admin_tareas_read" ON admin_tareas;
CREATE POLICY "admin_tareas_read" ON admin_tareas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );

-- Cualquier admin puede crear tareas (creado_por = uid)
DROP POLICY IF EXISTS "admin_tareas_insert" ON admin_tareas;
CREATE POLICY "admin_tareas_insert" ON admin_tareas
  FOR INSERT WITH CHECK (
    creado_por = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );

-- Cualquier admin puede mover/editar tareas
DROP POLICY IF EXISTS "admin_tareas_update" ON admin_tareas;
CREATE POLICY "admin_tareas_update" ON admin_tareas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );

-- Solo el creador puede eliminar (o cualquier admin si querés relajar esto)
DROP POLICY IF EXISTS "admin_tareas_delete" ON admin_tareas;
CREATE POLICY "admin_tareas_delete" ON admin_tareas
  FOR DELETE USING (
    creado_por = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );
