-- ============================================================================
-- full_agent_access: permite a clientes antiguos usar todos los agentes
-- sin restricciones de pilar. Se activa desde el panel de admin.
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_agent_access boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.full_agent_access
  IS 'Cuando true, el cliente puede usar todos los agentes IA sin haber completado los pilares requeridos.';
