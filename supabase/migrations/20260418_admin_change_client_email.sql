-- ============================================================================
-- admin_change_client_email: permite a admins cambiar el email de login de
-- un cliente (actualiza auth.users.email + profiles.email en una sola
-- transacción). Marca email_confirmed_at para saltear la doble confirmación
-- de Supabase (el admin ya validó el email offline).
--
-- Flujo típico: el admin migra clientes con emails placeholder durante QA,
-- y una vez listos cambia a los emails reales antes de enviar la app.
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_change_client_email(
  target_user_id UUID,
  new_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized TEXT;
BEGIN
  -- Verificar admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  normalized := lower(trim(new_email));

  -- Validaciones básicas
  IF normalized IS NULL OR normalized = '' THEN
    RAISE EXCEPTION 'Email no puede estar vacío';
  END IF;

  IF position('@' in normalized) = 0 OR position('.' in split_part(normalized, '@', 2)) = 0 THEN
    RAISE EXCEPTION 'Email inválido';
  END IF;

  -- Verificar target existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;

  -- Verificar que el email no esté ya en uso por OTRO usuario
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = normalized AND id <> target_user_id
  ) THEN
    RAISE EXCEPTION 'El email % ya está en uso por otro usuario', normalized;
  END IF;

  -- Actualizar auth.users (fuente de verdad del login)
  UPDATE auth.users
     SET email = normalized,
         email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
         updated_at = NOW()
   WHERE id = target_user_id;

  -- Espejar en profiles.email (columna de display)
  UPDATE profiles
     SET email = normalized
   WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'id', target_user_id,
    'email', normalized
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_change_client_email(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION admin_change_client_email(UUID, TEXT)
  IS 'Admin-only: cambia email de login de un cliente (auth.users + profiles) sin requerir confirmación del cliente.';
