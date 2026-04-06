-- ─── Migración: Método CLÍNICA — ADN del Negocio ──────────────────────────────
-- Agrega las nuevas columnas del ADN del Negocio a la tabla profiles.
-- SOLO agrega columnas — no elimina ni modifica columnas existentes.
-- Compatible con datos de usuarios activos.

-- ── Sección 1: QUIÉN SOY ──────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS historia_300 text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS historia_150 text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS historia_50  text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS proposito    text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS legado       text;

-- ── Sección 3: QUÉ OFREZCO ───────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matriz_a     text; -- "El infierno" — dolores actuales
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matriz_b     text; -- "Los obstáculos" — por qué no avanzan solos
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matriz_c     text; -- "El cielo" — visión del resultado

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metodo_nombre text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metodo_pasos  text; -- JSON array como texto

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS oferta_high   text; -- JSON como texto
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS oferta_mid    text; -- JSON como texto (producto principal)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS oferta_low    text; -- JSON como texto
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lead_magnet   text; -- JSON como texto

-- ── Sección 4: CÓMO LLEGO ────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS embudo_activo         boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS script_venta          text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agenda_configurada    boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS automatizacion_activa boolean DEFAULT false;

-- ── Sección 5: CÓMO ME RECONOCEN ─────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS identidad_colores      text; -- JSON como texto
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS identidad_tipografia   text; -- JSON como texto
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS identidad_logo         text; -- URL o base64
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS identidad_tono         text;

-- ── Índice de progreso (opcional, para queries del Admin) ─────────────────────
-- El campo pilar_actual ya existe en la tabla.
-- Actualizar comentario para reflejar que ahora el rango es 0-10.
COMMENT ON COLUMN profiles.pilar_actual IS 'Pilar activo del usuario (0-10). Método CLÍNICA: 0=Onboarding, 1-3=Identidad, 4-5=Mercado, 6-8=Oferta, 9=Sistemas, 10=Visual';
