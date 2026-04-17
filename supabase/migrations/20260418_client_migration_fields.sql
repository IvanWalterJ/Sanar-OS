-- ─── Migración: Campos de auditoría para clientes migrados ──────────────────
-- Agrega columnas que identifican clientes creados vía el wizard de migración.
-- RUN THIS BEFORE using the MigrationWizard feature in the admin panel.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS migration_source TEXT,
  ADD COLUMN IF NOT EXISTS migration_raw_json JSONB,
  ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.migration_source IS 'Fuente de la migración (ej: "admin_migration")';
COMMENT ON COLUMN profiles.migration_raw_json IS 'Texto crudo y JSON extraído por IA al momento de la migración';
COMMENT ON COLUMN profiles.migrated_at IS 'Timestamp de cuando el admin migró este cliente';
