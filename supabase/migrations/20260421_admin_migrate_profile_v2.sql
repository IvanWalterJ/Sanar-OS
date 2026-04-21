-- ============================================================================
-- admin_migrate_profile v2: igual que v1 + auto-crea el profile si no existe
-- (cubre el caso donde el trigger on_auth_user_created fue lento o falló).
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_migrate_profile(
  target_user_id UUID,
  updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row profiles%ROWTYPE;
  allowed_keys TEXT[] := ARRAY[
    -- Config básica
    'plan', 'especialidad', 'fecha_inicio', 'status',
    'onboarding_completed', 'pilar_actual',
    -- Audit
    'migration_source', 'migrated_at', 'migration_raw_json',
    -- ADN — historia / identidad
    'historia_300', 'historia_150', 'historia_50',
    'proposito', 'legado', 'nicho', 'posicionamiento', 'por_que_oficial',
    -- ADN — matriz
    'matriz_a', 'matriz_b', 'matriz_c',
    -- ADN — método / ofertas
    'metodo_nombre', 'metodo_pasos',
    'oferta_high', 'oferta_mid', 'oferta_low', 'lead_magnet',
    -- ADN — identidad visual
    'identidad_colores', 'identidad_tipografia',
    'identidad_logo', 'identidad_tono'
  ];
  filtered JSONB;
  key TEXT;
BEGIN
  -- Verificar admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: el usuario actual no tiene rol=admin en profiles. Pedile al owner que corra promover_a_admin() con tu user_id.';
  END IF;

  -- Verificar que el usuario existe en auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'El usuario % no existe en auth.users', target_user_id;
  END IF;

  -- Auto-crear el profile si el trigger fue lento o falló
  INSERT INTO profiles (id, nombre, email, status, onboarding_completed, plan, fecha_inicio)
  SELECT
    au.id,
    COALESCE(au.raw_user_meta_data->>'nombre', ''),
    COALESCE(au.email, ''),
    'ACTIVE',
    true,
    'DWY',
    CURRENT_DATE
  FROM auth.users au
  WHERE au.id = target_user_id
  ON CONFLICT (id) DO NOTHING;

  -- Filtrar sólo las keys permitidas (whitelist)
  filtered := '{}'::jsonb;
  FOREACH key IN ARRAY allowed_keys LOOP
    IF updates ? key THEN
      filtered := filtered || jsonb_build_object(key, updates -> key);
    END IF;
  END LOOP;

  IF filtered = '{}'::jsonb THEN
    RAISE EXCEPTION 'No valid fields to update';
  END IF;

  -- UPDATE dinámico via whitelist
  UPDATE profiles
     SET
       plan                   = COALESCE(filtered->>'plan', plan),
       especialidad           = COALESCE(filtered->>'especialidad', especialidad),
       fecha_inicio           = COALESCE((filtered->>'fecha_inicio')::date, fecha_inicio),
       status                 = COALESCE(filtered->>'status', status),
       onboarding_completed   = COALESCE((filtered->>'onboarding_completed')::boolean, onboarding_completed),
       pilar_actual           = COALESCE((filtered->>'pilar_actual')::int, pilar_actual),
       migration_source       = COALESCE(filtered->>'migration_source', migration_source),
       migrated_at            = COALESCE((filtered->>'migrated_at')::timestamptz, migrated_at),
       migration_raw_json     = COALESCE(filtered->'migration_raw_json', migration_raw_json),
       historia_300           = COALESCE(filtered->>'historia_300', historia_300),
       historia_150           = COALESCE(filtered->>'historia_150', historia_150),
       historia_50            = COALESCE(filtered->>'historia_50', historia_50),
       proposito              = COALESCE(filtered->>'proposito', proposito),
       legado                 = COALESCE(filtered->>'legado', legado),
       nicho                  = COALESCE(filtered->>'nicho', nicho),
       posicionamiento        = COALESCE(filtered->>'posicionamiento', posicionamiento),
       por_que_oficial        = COALESCE(filtered->>'por_que_oficial', por_que_oficial),
       matriz_a               = COALESCE(filtered->>'matriz_a', matriz_a),
       matriz_b               = COALESCE(filtered->>'matriz_b', matriz_b),
       matriz_c               = COALESCE(filtered->>'matriz_c', matriz_c),
       metodo_nombre          = COALESCE(filtered->>'metodo_nombre', metodo_nombre),
       metodo_pasos           = COALESCE(filtered->>'metodo_pasos', metodo_pasos),
       oferta_high            = COALESCE(filtered->>'oferta_high', oferta_high),
       oferta_mid             = COALESCE(filtered->>'oferta_mid', oferta_mid),
       oferta_low             = COALESCE(filtered->>'oferta_low', oferta_low),
       lead_magnet            = COALESCE(filtered->>'lead_magnet', lead_magnet),
       identidad_colores      = COALESCE(filtered->>'identidad_colores', identidad_colores),
       identidad_tipografia   = COALESCE(filtered->>'identidad_tipografia', identidad_tipografia),
       identidad_logo         = COALESCE(filtered->>'identidad_logo', identidad_logo),
       identidad_tono         = COALESCE(filtered->>'identidad_tono', identidad_tono)
   WHERE id = target_user_id
   RETURNING * INTO updated_row;

  RETURN jsonb_build_object(
    'id', updated_row.id,
    'email', updated_row.email,
    'updated_fields', (SELECT array_agg(k) FROM jsonb_object_keys(filtered) AS k)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_migrate_profile(UUID, JSONB) TO authenticated;

COMMENT ON FUNCTION admin_migrate_profile(UUID, JSONB)
  IS 'Admin-only v2: actualiza campos ADN/migración. Auto-crea profile si el trigger fue lento. Bypass RLS con whitelist.';
