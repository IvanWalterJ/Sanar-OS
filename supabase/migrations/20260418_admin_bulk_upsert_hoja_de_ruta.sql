-- ============================================================================
-- admin_bulk_upsert_hoja_de_ruta: permite a admins poblar la hoja_de_ruta
-- de un cliente durante la migración. Necesario porque la RLS default
-- (`auth.uid() = usuario_id`) bloquea que el admin inserte filas en nombre
-- de otro usuario.
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_bulk_upsert_hoja_de_ruta(
  target_user_id UUID,
  rows_data JSONB
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r JSONB;
  affected_count INT := 0;
BEGIN
  -- Verificar admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Verificar target existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target profile not found';
  END IF;

  -- Validar que rows_data es un array
  IF jsonb_typeof(rows_data) <> 'array' THEN
    RAISE EXCEPTION 'rows_data must be a JSONB array';
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(rows_data) LOOP
    INSERT INTO hoja_de_ruta (
      usuario_id,
      pilar_numero,
      meta_codigo,
      completada,
      es_estrella,
      output_generado,
      fecha_completada
    )
    VALUES (
      target_user_id,
      (r->>'pilar_numero')::int,
      r->>'meta_codigo',
      COALESCE((r->>'completada')::boolean, false),
      COALESCE((r->>'es_estrella')::boolean, false),
      r->'output_generado',
      CASE
        WHEN r->>'fecha_completada' IS NULL OR r->>'fecha_completada' = ''
          THEN NULL
        ELSE (r->>'fecha_completada')::date
      END
    )
    ON CONFLICT (usuario_id, pilar_numero, meta_codigo) DO UPDATE SET
      completada       = EXCLUDED.completada,
      es_estrella      = EXCLUDED.es_estrella,
      output_generado  = COALESCE(EXCLUDED.output_generado, hoja_de_ruta.output_generado),
      fecha_completada = COALESCE(EXCLUDED.fecha_completada, hoja_de_ruta.fecha_completada);

    affected_count := affected_count + 1;
  END LOOP;

  RETURN affected_count;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_bulk_upsert_hoja_de_ruta(UUID, JSONB) TO authenticated;

COMMENT ON FUNCTION admin_bulk_upsert_hoja_de_ruta(UUID, JSONB)
  IS 'Admin-only: upsert bulk de filas en hoja_de_ruta. Usado por MigrationWizard para sembrar el progreso de un cliente migrado.';
