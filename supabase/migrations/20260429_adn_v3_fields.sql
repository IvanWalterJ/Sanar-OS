-- ═══════════════════════════════════════════════════════════════════════════
-- Columnas ADN v3 que el código TypeScript declara en ProfileV2 pero que
-- nunca se crearon en la DB. Sin esta migración, el editor de ADN del panel
-- admin (admin_update_adn_field) y la página de cliente fallan con
-- "column ... does not exist · code 42703".
--
-- Idempotente: ADD COLUMN IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════════════

-- P0.2 — Formulario de bienvenida (anios_experiencia, pacientes_actuales, etc.)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adn_formulario_bienvenida JSONB;

-- P1.2 — Línea de tiempo vital (escritura pura, sin IA)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adn_linea_tiempo TEXT;

-- P2.2 — 5 por qué encadenados
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adn_cinco_por_que TEXT[];

-- P3.2 — Carta al yo de 2036
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adn_carta_futuro TEXT;

-- P4.2 — Análisis de 3 pacientes reales
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adn_pacientes_reales TEXT;

-- P4.3 — Avatar estructurado (nombre_ficticio, edad, profesion, dolores, etc.)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adn_avatar JSONB;

-- P5.2 — Nicho
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adn_nicho TEXT;

-- P5.3 — Propuesta Única de Valor
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adn_usp TEXT;

-- P6.2 — Lista de 10 transformaciones
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adn_transformaciones TEXT;

-- P7.2 — Proceso actual documentado
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adn_proceso_actual TEXT;

-- P9A.2 — Copy completo de landing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adn_landing_copy TEXT;

-- P9A.3 — Anuncios Meta · 6 creativos N1/N2/N3
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adn_anuncios TEXT;

-- P9C.2 — Protocolo de entrega post-venta
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adn_protocolo_servicio TEXT;

-- P10.2 — Sistema completo de identidad visual
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adn_identidad_sistema TEXT;

-- ─── Comentarios para documentación ────────────────────────────────────────
COMMENT ON COLUMN public.profiles.adn_linea_tiempo IS 'P1.2 — Línea de tiempo vital (7 puntos). Escritura pura, sin IA.';
COMMENT ON COLUMN public.profiles.adn_avatar IS 'P4.3 — Avatar estructurado: { nombre_ficticio, edad, profesion, situacion, dolores[], suenos[], objeciones[], lenguaje[] }.';
COMMENT ON COLUMN public.profiles.adn_formulario_bienvenida IS 'P0.2 — Snapshot de onboarding: anios_experiencia, pacientes_actuales, facturacion_rango, frustracion_actual, vision_90_dias, horas_disponibles, experiencia_digital.';
