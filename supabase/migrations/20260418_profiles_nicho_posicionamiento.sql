-- ─── Migración: Campos de identidad faltantes en profiles ────────────────────
-- Agrega columnas usadas por el MigrationWizard que no estaban en la migración
-- original del Método CLÍNICA.
-- RUN THIS BEFORE using the MigrationWizard feature.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nicho          text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS posicionamiento text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS por_que_oficial text;
