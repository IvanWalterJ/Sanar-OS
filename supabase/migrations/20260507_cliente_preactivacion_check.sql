-- ═══════════════════════════════════════════════════════════════════════════
-- Cliente Pre-Activación Checklist Matrix
-- Tilde por (cliente, paso) para el checklist de pre-activación de Meta Ads.
-- Una fila existe SOLO cuando el paso está tildado (toggle OFF = DELETE).
-- Los pasos viven en src/lib/preactivacionSteps.ts (hardcoded).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cliente_preactivacion_check (
  cliente_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  step_id         TEXT        NOT NULL,
  completado_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completado_por  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  notas           TEXT,
  PRIMARY KEY (cliente_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_cliente_preactivacion_check_cliente
  ON cliente_preactivacion_check(cliente_id);

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE cliente_preactivacion_check ENABLE ROW LEVEL SECURITY;

-- Solo admins leen
DROP POLICY IF EXISTS "preactivacion_check_read" ON cliente_preactivacion_check;
CREATE POLICY "preactivacion_check_read" ON cliente_preactivacion_check
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );

-- Solo admins insertan; completado_por debe ser el caller
DROP POLICY IF EXISTS "preactivacion_check_insert" ON cliente_preactivacion_check;
CREATE POLICY "preactivacion_check_insert" ON cliente_preactivacion_check
  FOR INSERT WITH CHECK (
    completado_por = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );

-- Cualquier admin puede actualizar (notas, etc.)
DROP POLICY IF EXISTS "preactivacion_check_update" ON cliente_preactivacion_check;
CREATE POLICY "preactivacion_check_update" ON cliente_preactivacion_check
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );

-- Cualquier admin puede destildar (delete)
DROP POLICY IF EXISTS "preactivacion_check_delete" ON cliente_preactivacion_check;
CREATE POLICY "preactivacion_check_delete" ON cliente_preactivacion_check
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );
