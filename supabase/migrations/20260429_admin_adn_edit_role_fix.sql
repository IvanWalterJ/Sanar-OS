-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: admin_update_adn_field rechazaba al owner original con admin_rol NULL
--
-- Síntoma: el panel admin mostraba 400 al guardar la edición de un campo
-- ("Acceso denegado: se requiere rol owner o manager (actual: <ninguno>)").
-- Causa: Javier (y posiblemente otros admins originales) tienen rol='admin'
-- pero admin_rol IS NULL en DB. La UI los trata como owner por default
-- (`adminProfile.admin_rol ?? 'owner'` en Admin.tsx) pero la RPC rechazaba
-- a cualquiera sin admin_rol explícito.
--
-- Fix: aceptar admin_rol IN ('owner','manager') *o* admin_rol IS NULL cuando
-- el caller tiene rol='admin'. Sigue rechazando explícitamente a 'staff'.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_update_adn_field(
  target_user_id UUID,
  field_codigo   TEXT,
  field_label    TEXT,
  field_key      TEXT,
  new_value      JSONB,
  value_path     TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol        TEXT;
  v_admin_rol  TEXT;
  v_old_value  JSONB;
  v_new_value  JSONB;
  v_allowed_keys TEXT[] := ARRAY[
    -- Sección ID · Identidad
    'adn_linea_tiempo','historia_300','historia_150','historia_50',
    'adn_cinco_por_que','proposito','adn_carta_futuro','legado',
    -- Sección META · Onboarding
    'especialidad','adn_formulario_bienvenida',
    -- Sección IRR · Irresistible
    'adn_avatar','adn_avatar_journey','adn_nicho','adn_micronicho',
    'adn_usp','adn_transformaciones',
    'matriz_a','matriz_b','matriz_c',
    'metodo_nombre','metodo_pasos',
    -- Sección NEG · Negocio
    'adn_proceso_actual','oferta_mid','oferta_high','oferta_low',
    'lead_magnet','adn_escenarios_roas',
    -- Sección INF · Infraestructura
    'adn_landing_copy','adn_vsl_script','adn_anuncios',
    'adn_meta_config','adn_skool_setup',
    'identidad_colores','identidad_tipografia',
    'adn_templates_canva','adn_creativos_v2',
    -- Sección CAP · Captación
    'script_venta','adn_triage_audios','adn_masterclass_estructura',
    'adn_protocolo_servicio','adn_emails_nurture',
    'adn_plan_contenido_semanal','adn_retargeting_config',
    -- Sección MET · Métricas
    'adn_tablero_cierre','adn_retrospectiva',
    'adn_plan_ciclo_2','adn_masterclass_analytics'
  ];
BEGIN
  -- 1. Verificar rol del caller — owner/manager o admin original (admin_rol NULL).
  SELECT rol, admin_rol
    INTO v_rol, v_admin_rol
    FROM public.profiles
   WHERE id = auth.uid();

  IF v_rol IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado: se requiere rol admin (actual: %)', COALESCE(v_rol, '<ninguno>');
  END IF;

  IF v_admin_rol = 'staff' THEN
    RAISE EXCEPTION 'Acceso denegado: staff no puede editar el ADN';
  END IF;

  -- admin_rol = 'owner' | 'manager' | NULL → autorizado.
  IF v_admin_rol IS NOT NULL AND v_admin_rol NOT IN ('owner','manager') THEN
    RAISE EXCEPTION 'Acceso denegado: rol % no autorizado', v_admin_rol;
  END IF;

  -- 2. Whitelist del campo a editar.
  IF NOT (field_key = ANY(v_allowed_keys)) THEN
    RAISE EXCEPTION 'Campo % no editable vía admin_update_adn_field', field_key;
  END IF;

  -- 3. El target debe existir.
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Cliente target no encontrado';
  END IF;

  -- 4. Snapshot del valor actual (para audit).
  EXECUTE format('SELECT to_jsonb(%I) FROM public.profiles WHERE id = $1', field_key)
    USING target_user_id
    INTO v_old_value;

  -- 5. Aplicar el update.
  IF value_path IS NULL OR array_length(value_path, 1) IS NULL THEN
    -- Reemplazo de columna completa. jsonb_populate_record castea JSONB → tipo de columna.
    EXECUTE format(
      'UPDATE public.profiles
          SET %I = (SELECT %I FROM jsonb_populate_record(NULL::public.profiles, jsonb_build_object(%L, $1::jsonb)))
        WHERE id = $2',
      field_key, field_key, field_key
    ) USING new_value, target_user_id;
  ELSE
    -- Update nested dentro de columna JSONB.
    EXECUTE format(
      'UPDATE public.profiles
          SET %I = jsonb_set(COALESCE(%I, ''{}''::jsonb), $1, $2, true)
        WHERE id = $3',
      field_key, field_key
    ) USING value_path, new_value, target_user_id;
  END IF;

  -- 6. Releer el valor final (para audit log).
  EXECUTE format('SELECT to_jsonb(%I) FROM public.profiles WHERE id = $1', field_key)
    USING target_user_id
    INTO v_new_value;

  -- 7. Audit.
  INSERT INTO public.adn_audit_log (
    target_user_id, edited_by, field_codigo, field_label, field_key, field_path, old_value, new_value
  ) VALUES (
    target_user_id, auth.uid(), field_codigo, field_label, field_key, value_path, v_old_value, v_new_value
  );

  RETURN jsonb_build_object(
    'ok', true,
    'field_codigo', field_codigo,
    'field_key', field_key,
    'old_value', v_old_value,
    'new_value', v_new_value
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_adn_field(UUID, TEXT, TEXT, TEXT, JSONB, TEXT[]) TO authenticated;
