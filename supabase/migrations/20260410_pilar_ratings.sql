-- ============================================================
-- Tabla de valoraciones de satisfacción por pilar completado
-- El paciente puede valorar de 1 a 5 estrellas al completar
-- cada pilar. Un rating por pilar por usuario (upsert).
-- ============================================================

CREATE TABLE IF NOT EXISTS pilar_satisfaction_ratings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pilar_numero INT         NOT NULL,
  pilar_titulo TEXT,
  rating       SMALLINT    NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Un rating por pilar por usuario
CREATE UNIQUE INDEX IF NOT EXISTS pilar_ratings_unique
  ON pilar_satisfaction_ratings (usuario_id, pilar_numero);

-- Index para queries de admin ordenadas por fecha
CREATE INDEX IF NOT EXISTS pilar_ratings_created_at_idx
  ON pilar_satisfaction_ratings (created_at DESC);

-- Index para queries por usuario
CREATE INDEX IF NOT EXISTS pilar_ratings_usuario_idx
  ON pilar_satisfaction_ratings (usuario_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE pilar_satisfaction_ratings ENABLE ROW LEVEL SECURITY;

-- Paciente puede insertar y actualizar su propio rating
CREATE POLICY "usuario puede gestionar su rating"
  ON pilar_satisfaction_ratings
  FOR ALL
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Admin puede leer todos los ratings
CREATE POLICY "admin puede leer ratings"
  ON pilar_satisfaction_ratings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );
