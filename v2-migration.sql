-- ============================================================
-- SANAR OS — Migración v2.0 — Método CLÍNICA
-- Correr este SQL en el SQL Editor de Supabase Dashboard
-- Es seguro: usa IF NOT EXISTS en todos los cambios
-- ============================================================

-- ============================================================
-- 1. AMPLIAR TABLA profiles
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nivel_avatar INT DEFAULT 1;         -- 1-5
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nicho TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_cliente TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS posicionamiento TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS historia_origen TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creencias_reformuladas JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS programas_inconscientes JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS carta_dia91 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS por_que_oficial TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS progreso_porcentaje INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pilar_actual INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suscripcion_activa BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dia_programa INT DEFAULT 1;          -- día 1-90 (calculado automáticamente desde fecha_inicio)

-- ============================================================
-- 2. AMPLIAR TABLA diario_entradas (de 5-6 preguntas a 7 + módulo energético)
-- ============================================================
ALTER TABLE diario_entradas ADD COLUMN IF NOT EXISTS energia_nivel INT;            -- 1-10
ALTER TABLE diario_entradas ADD COLUMN IF NOT EXISTS emocion TEXT;
ALTER TABLE diario_entradas ADD COLUMN IF NOT EXISTS pensamiento_dominante TEXT;
ALTER TABLE diario_entradas ADD COLUMN IF NOT EXISTS aprendizaje TEXT;
ALTER TABLE diario_entradas ADD COLUMN IF NOT EXISTS accion_manana TEXT;
ALTER TABLE diario_entradas ADD COLUMN IF NOT EXISTS modulo_energetico JSONB;      -- {durmio_bien, comio_bien, movio_cuerpo, aire_libre}

-- ============================================================
-- 3. NUEVA TABLA: hoja_de_ruta (9 pilares con METAs)
-- Reemplaza la lógica de tareas_usuario para v2
-- tareas_usuario se preserva para backward compatibility
-- ============================================================
CREATE TABLE IF NOT EXISTS hoja_de_ruta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pilar_numero INT NOT NULL,           -- 0-8
  meta_codigo TEXT NOT NULL,           -- ej: 'O.A', '1.A', '2.B', '7.C'
  completada BOOLEAN DEFAULT false,
  es_estrella BOOLEAN DEFAULT false,   -- tareas ★ que desbloquean el siguiente pilar
  output_generado JSONB,               -- para QA del Pilar 7 (qa_points_green)
  fecha_completada DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (usuario_id, pilar_numero, meta_codigo)
);

-- RLS para hoja_de_ruta
ALTER TABLE hoja_de_ruta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own hoja_de_ruta" ON hoja_de_ruta
  FOR ALL USING (auth.uid() = usuario_id);

-- ============================================================
-- 4. NUEVA TABLA: ventas_registradas (desbloquea Pilar 4)
-- ============================================================
CREATE TABLE IF NOT EXISTS ventas_registradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  monto DECIMAL(10,2),
  canal TEXT,                          -- 'DM' | 'email' | 'llamada' | 'referido'
  protocolo_cierre_generado TEXT,      -- generado por el Agente de Llamada de Venta
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para ventas_registradas
ALTER TABLE ventas_registradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ventas" ON ventas_registradas
  FOR ALL USING (auth.uid() = usuario_id);

-- ============================================================
-- 5. NUEVA TABLA: herramientas_outputs (Biblioteca: outputs de 40+ herramientas IA)
-- ============================================================
CREATE TABLE IF NOT EXISTS herramientas_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  herramienta_id TEXT NOT NULL,        -- ej: 'A1', 'A2', 'B1', 'C3', 'D2', 'E1'
  output JSONB NOT NULL,               -- contenido generado por Gemini
  version INT DEFAULT 1,               -- para permitir regeneraciones
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (usuario_id, herramienta_id)  -- un output por herramienta por usuario (se sobreescribe)
);

-- RLS para herramientas_outputs
ALTER TABLE herramientas_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own herramientas_outputs" ON herramientas_outputs
  FOR ALL USING (auth.uid() = usuario_id);

-- ============================================================
-- 6. FUNCIÓN: calcular día del programa automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_dia_programa(fecha_inicio DATE)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEAST(90, GREATEST(1, (CURRENT_DATE - fecha_inicio) + 1));
$$;

-- ============================================================
-- 7. FUNCIÓN: verificar desbloqueo de pilar
-- ============================================================
CREATE OR REPLACE FUNCTION check_pilar_unlock(uid UUID, pilar INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  estrellas_completadas INT;
  tiene_venta BOOLEAN;
  qa_completo BOOLEAN;
BEGIN
  CASE pilar
    WHEN 0 THEN
      -- Pilar 0 (Onboarding): siempre desbloqueado al crear cuenta
      RETURN true;

    WHEN 1 THEN
      -- Pilar 1: requiere completar todas las tareas ★ del Pilar 0
      SELECT COUNT(*) INTO estrellas_completadas
      FROM hoja_de_ruta
      WHERE usuario_id = uid AND pilar_numero = 0 AND es_estrella = true AND completada = true;
      RETURN estrellas_completadas >= 1;

    WHEN 2 THEN
      -- Pilar 2: requiere 6 tareas ★ del Pilar 1
      SELECT COUNT(*) INTO estrellas_completadas
      FROM hoja_de_ruta
      WHERE usuario_id = uid AND pilar_numero = 1 AND es_estrella = true AND completada = true;
      RETURN estrellas_completadas >= 6;

    WHEN 3 THEN
      -- Pilar 3: requiere 6 tareas ★ del Pilar 2
      SELECT COUNT(*) INTO estrellas_completadas
      FROM hoja_de_ruta
      WHERE usuario_id = uid AND pilar_numero = 2 AND es_estrella = true AND completada = true;
      RETURN estrellas_completadas >= 6;

    WHEN 4 THEN
      -- Pilar 4: DESBLOQUEO ESPECIAL — requiere al menos 1 venta real
      SELECT COUNT(*) > 0 INTO tiene_venta
      FROM ventas_registradas
      WHERE usuario_id = uid;
      RETURN tiene_venta;

    WHEN 5 THEN
      -- Pilar 5: requiere 5 tareas ★ del Pilar 4
      SELECT COUNT(*) INTO estrellas_completadas
      FROM hoja_de_ruta
      WHERE usuario_id = uid AND pilar_numero = 4 AND es_estrella = true AND completada = true;
      RETURN estrellas_completadas >= 5;

    WHEN 6 THEN
      -- Pilar 6: requiere 4 tareas ★ del Pilar 5
      SELECT COUNT(*) INTO estrellas_completadas
      FROM hoja_de_ruta
      WHERE usuario_id = uid AND pilar_numero = 5 AND es_estrella = true AND completada = true;
      RETURN estrellas_completadas >= 4;

    WHEN 7 THEN
      -- Pilar 7: DESBLOQUEO ESPECIAL — requiere QA con 24 puntos verdes en tarea 6.7
      SELECT EXISTS(
        SELECT 1 FROM hoja_de_ruta
        WHERE usuario_id = uid
          AND pilar_numero = 6
          AND meta_codigo = '6.B'
          AND output_generado->>'qa_points_green' = '24'
      ) INTO qa_completo;
      RETURN qa_completo;

    WHEN 8 THEN
      -- Pilar 8: requiere 7 tareas ★ del Pilar 7
      SELECT COUNT(*) INTO estrellas_completadas
      FROM hoja_de_ruta
      WHERE usuario_id = uid AND pilar_numero = 7 AND es_estrella = true AND completada = true;
      RETURN estrellas_completadas >= 7;

    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- ============================================================
-- 8. FUNCIÓN: calcular semáforo de usuario (verde/amarillo/rojo)
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_semaforo(uid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dias_sin_diario INT;
  tareas_completadas INT;
  total_tareas INT;
  progreso DECIMAL;
  dia_prog INT;
BEGIN
  -- Días sin entrada en el diario
  SELECT COALESCE(
    (CURRENT_DATE - MAX(fecha::DATE)),
    999
  ) INTO dias_sin_diario
  FROM diario_entradas
  WHERE user_id = uid;

  -- Progreso de tareas en hoja_de_ruta
  SELECT
    COUNT(*) FILTER (WHERE completada = true),
    COUNT(*)
  INTO tareas_completadas, total_tareas
  FROM hoja_de_ruta
  WHERE usuario_id = uid;

  IF total_tareas > 0 THEN
    progreso := tareas_completadas::DECIMAL / total_tareas;
  ELSE
    progreso := 0;
  END IF;

  -- Día del programa
  SELECT calcular_dia_programa(fecha_inicio::DATE) INTO dia_prog
  FROM profiles WHERE id = uid;

  -- Lógica del semáforo
  IF dias_sin_diario >= 5 OR progreso < 0.3 THEN
    RETURN 'rojo';
  ELSIF dias_sin_diario >= 3 OR progreso < 0.6 THEN
    RETURN 'amarillo';
  ELSE
    RETURN 'verde';
  END IF;
END;
$$;

-- ============================================================
-- 9. FUNCIÓN ADMIN: obtener datos de hoja_de_ruta de un usuario
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_hoja_de_ruta(target_user_id UUID)
RETURNS SETOF hoja_de_ruta
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM hoja_de_ruta WHERE usuario_id = target_user_id ORDER BY pilar_numero, meta_codigo;
$$;

-- ============================================================
-- 10. FUNCIÓN ADMIN: obtener ventas de un usuario
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_ventas(target_user_id UUID)
RETURNS SETOF ventas_registradas
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM ventas_registradas WHERE usuario_id = target_user_id ORDER BY fecha DESC;
$$;

-- ============================================================
-- 11. FUNCIÓN ADMIN: métricas globales del programa
-- ============================================================
CREATE OR REPLACE FUNCTION get_metricas_globales()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resultado JSON;
BEGIN
  SELECT json_build_object(
    'usuarios_activos', (
      SELECT COUNT(*) FROM profiles
      WHERE rol = 'cliente' AND suscripcion_activa = true
        AND calcular_dia_programa(fecha_inicio::DATE) BETWEEN 1 AND 90
    ),
    'racha_promedio_diario', (
      SELECT ROUND(AVG(racha), 1)
      FROM (
        SELECT user_id, COUNT(*) as racha
        FROM diario_entradas
        WHERE fecha::DATE >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY user_id
      ) sub
    ),
    'total_ventas_registradas', (SELECT COUNT(*) FROM ventas_registradas),
    'completitud_por_pilar', (
      SELECT json_agg(json_build_object(
        'pilar', pilar_numero,
        'tasa', ROUND(AVG(CASE WHEN completada THEN 1.0 ELSE 0.0 END) * 100, 1)
      ) ORDER BY pilar_numero)
      FROM hoja_de_ruta
      GROUP BY pilar_numero
    )
  ) INTO resultado;
  RETURN resultado;
END;
$$;

-- ============================================================
-- 12. TRIGGER: actualizar updated_at en herramientas_outputs
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS herramientas_outputs_updated_at ON herramientas_outputs;
CREATE TRIGGER herramientas_outputs_updated_at
  BEFORE UPDATE ON herramientas_outputs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 13. TRIGGER: actualizar progreso_porcentaje en profiles
--     Se ejecuta cuando se completa una tarea en hoja_de_ruta
-- ============================================================
CREATE OR REPLACE FUNCTION sync_progreso_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total INT;
  completadas INT;
  pct INT;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE completada = true)
  INTO total, completadas
  FROM hoja_de_ruta WHERE usuario_id = NEW.usuario_id;

  IF total > 0 THEN
    pct := ROUND((completadas::DECIMAL / total) * 100);
  ELSE
    pct := 0;
  END IF;

  UPDATE profiles
  SET progreso_porcentaje = pct,
      dia_programa = calcular_dia_programa(fecha_inicio::DATE)
  WHERE id = NEW.usuario_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_progreso_on_hoja_ruta_update ON hoja_de_ruta;
CREATE TRIGGER sync_progreso_on_hoja_ruta_update
  AFTER INSERT OR UPDATE ON hoja_de_ruta
  FOR EACH ROW EXECUTE FUNCTION sync_progreso_usuario();

-- ============================================================
-- 14. ÍNDICES de rendimiento
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_hoja_de_ruta_usuario ON hoja_de_ruta (usuario_id);
CREATE INDEX IF NOT EXISTS idx_hoja_de_ruta_pilar ON hoja_de_ruta (usuario_id, pilar_numero);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario ON ventas_registradas (usuario_id);
CREATE INDEX IF NOT EXISTS idx_herramientas_usuario ON herramientas_outputs (usuario_id);
CREATE INDEX IF NOT EXISTS idx_diario_usuario_fecha ON diario_entradas (user_id, fecha);

-- ============================================================
-- FIN DE LA MIGRACIÓN v2.0
-- Verificar con:
--   SELECT * FROM herramientas_outputs LIMIT 1;
--   SELECT * FROM ventas_registradas LIMIT 1;
--   SELECT * FROM hoja_de_ruta LIMIT 1;
--   SELECT check_pilar_unlock(auth.uid(), 0);
-- ============================================================
