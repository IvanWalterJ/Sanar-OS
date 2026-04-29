-- ═══════════════════════════════════════════════════════════════════════════
-- Editor de ADN para el equipo (owner / manager)
--
-- Permite que owner y manager vean y editen los 56 campos del ADN del
-- Negocio de cualquier cliente desde el panel admin. Cada edición queda
-- registrada en `adn_audit_log` (quién, cuándo, qué cambió).
--
-- Notas de diseño:
--   · Staff queda excluido a propósito — solo lectura desde el panel.
--   · Solo se editan columnas de `profiles` (incluyendo paths nested dentro
--     de columnas JSONB). Los outputs de `hoja_de_ruta` quedan intactos como
--     historial de lo que el cliente generó originalmente.
--   · La función usa `jsonb_populate_record(NULL::profiles, …)` para castear
--     JSONB al tipo correcto de cada columna (text, jsonb, text[], etc.).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Tabla de auditoría ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.adn_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edited_by       UUID NOT NULL REFERENCES auth.users(id),
  field_codigo    TEXT NOT NULL,    -- ej. "ID.historia_larga_300"
  field_label     TEXT,             -- snapshot del label visible (para historial legible)
  field_key       TEXT NOT NULL,    -- columna en profiles, ej. "historia_300"
  field_path      TEXT[],           -- path nested cuando se edita JSONB, ej. ARRAY['dolores']
  old_value       JSONB,
  new_value       JSONB,
  edited_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS adn_audit_log_target_idx
  ON public.adn_audit_log (target_user_id, edited_at DESC);

CREATE INDEX IF NOT EXISTS adn_audit_log_editor_idx
  ON public.adn_audit_log (edited_by, edited_at DESC);

ALTER TABLE public.adn_audit_log ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier miembro del equipo puede ver el historial.
DROP POLICY IF EXISTS "adn_audit_log_read" ON public.adn_audit_log;
CREATE POLICY "adn_audit_log_read" ON public.adn_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid()
         AND (
           p.rol = 'admin'
           OR p.admin_rol IN ('owner','manager','staff')
         )
    )
  );

-- Escritura: solo vía la RPC SECURITY DEFINER de abajo, no se permite INSERT directo.

-- ─── 2. RPC: admin_update_adn_field ─────────────────────────────────────────
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
  v_caller_rol TEXT;
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
  -- 1. Verificar rol del caller — solo owner / manager.
  SELECT admin_rol INTO v_caller_rol
    FROM public.profiles
   WHERE id = auth.uid();

  IF v_caller_rol IS NULL OR v_caller_rol NOT IN ('owner','manager') THEN
    RAISE EXCEPTION 'Acceso denegado: se requiere rol owner o manager (actual: %)', COALESCE(v_caller_rol, '<ninguno>');
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

COMMENT ON FUNCTION public.admin_update_adn_field(UUID, TEXT, TEXT, TEXT, JSONB, TEXT[])
  IS 'Owner/manager: edita un campo del ADN del cliente. Whitelist de columnas. Loguea en adn_audit_log.';

COMMENT ON TABLE public.adn_audit_log
  IS 'Historial de ediciones del ADN hechas desde el panel admin (owner/manager). Inmutable: solo INSERT vía RPC.';
