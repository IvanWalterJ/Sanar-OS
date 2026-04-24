-- RPC para actualizar el Manual de Marca (paleta, tipografia, reglas de uso)
-- de un cliente desde el dashboard admin.
--
-- Por que: la policy RLS de profiles es "auth.uid() = id", asi que cuando el
-- admin hace UPDATE del perfil de un cliente, la policy filtra la fila y no
-- se actualiza NADA — sin tirar error. Este RPC es SECURITY DEFINER y autoriza
-- explicitamente: el usuario es admin O actualiza su propio perfil.
--
-- Ambito: solo los 3 campos del manual de marca. Cualquier otra edicion sigue
-- pasando por las policies normales.

CREATE OR REPLACE FUNCTION update_brand_manual(
  target_user_id UUID,
  p_identidad_colores TEXT,
  p_identidad_tipografia TEXT,
  p_identidad_reglas_uso TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
  affected_row profiles%ROWTYPE;
BEGIN
  -- Autorizacion: admin O dueno del perfil
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND rol = 'admin'
  ) INTO is_admin;

  IF NOT is_admin AND auth.uid() <> target_user_id THEN
    RAISE EXCEPTION 'Access denied: you can only update your own brand manual';
  END IF;

  UPDATE profiles
     SET identidad_colores      = p_identidad_colores,
         identidad_tipografia   = p_identidad_tipografia,
         identidad_reglas_uso   = p_identidad_reglas_uso
   WHERE id = target_user_id
  RETURNING * INTO affected_row;

  IF affected_row.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user_id: %', target_user_id;
  END IF;

  RETURN jsonb_build_object(
    'id', affected_row.id,
    'identidad_colores', affected_row.identidad_colores,
    'identidad_tipografia', affected_row.identidad_tipografia,
    'identidad_reglas_uso', affected_row.identidad_reglas_uso
  );
END;
$$;

-- Autenticados pueden llamar al RPC; la funcion autoriza internamente
GRANT EXECUTE ON FUNCTION update_brand_manual(UUID, TEXT, TEXT, TEXT) TO authenticated;
