-- ============================================================================
-- full_agent_access: permite a clientes antiguos usar todos los agentes
-- sin restricciones de pilar. Se activa desde el panel de admin.
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_agent_access boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.full_agent_access
  IS 'Cuando true, el cliente puede usar todos los agentes IA sin haber completado los pilares requeridos.';

-- ============================================================================
-- RPC: toggle_full_agent_access (solo admins, SECURITY DEFINER para bypass RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION toggle_full_agent_access(target_user_id UUID, new_value BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE profiles
    SET full_agent_access = new_value
    WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_full_agent_access(UUID, BOOLEAN) TO authenticated;
