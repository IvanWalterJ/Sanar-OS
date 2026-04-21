-- ─── Migración: ADN v7 — 16 campos nuevos del documento maestro ───────────────
-- Agrega los campos del ADN v7 agrupados en las 4 secciones (IRR / NEG / INF / CAP) + MET.
-- Ver src/lib/adnSchema.ts para el mapping completo y src/lib/supabase.ts (ProfileV2).
-- SOLO agrega columnas — no elimina ni modifica columnas existentes.
-- Idempotente: se puede correr varias veces sin efectos secundarios.

-- ── Sección IRR · Irresistible · P4-P7 ────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_avatar_journey text;          -- P4.3
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_micronicho     text;          -- P5.2 (crítico Día 45)

-- ── Sección NEG · Negocio · P7-P8 ─────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_escenarios_roas text;         -- P8.6 — 3 escenarios 3x/5x/7x

-- ── Sección INF · Infraestructura · P9A + P10 ────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_vsl_script       text;        -- P9A.2
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_meta_config      jsonb;       -- P9A.4 (Messages/Leads config)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_skool_setup      jsonb;       -- P9A.5 (Free + Paid $297)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_templates_canva  text;        -- P10.3 — 10-15 templates
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_creativos_v2     text;        -- P10.4 — creativos v2 con identidad

-- ── Sección CAP · Captación · P9B-P9C ─────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_triage_audios           text; -- P9B.2 — 5 audios WhatsApp
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_masterclass_estructura  text; -- P9B.4 — 90 min / 5 bloques
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_emails_nurture          text; -- P9C.2 — secuencia 6/28
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_plan_contenido_semanal  text; -- P9C.3 — Mar N1 / Jue N2 / Sáb N3
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_retargeting_config      jsonb; -- P9C.4 — activa tras primera venta

-- ── Sección MET · Métricas · P11 ──────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_tablero_cierre        text;   -- P11.1
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_retrospectiva         text;   -- P11.2
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_plan_ciclo_2          text;   -- P11.3 (Consolidar/Optimizar/Escalar)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adn_masterclass_analytics text;   -- P11.4

-- ── Comentarios para documentación ────────────────────────────────────────────
COMMENT ON COLUMN profiles.adn_micronicho IS 'Micronicho específico (ej: "mujeres 40+ con ansiedad post-menopausia"). Crítico Día 45.';
COMMENT ON COLUMN profiles.adn_escenarios_roas IS '3 escenarios: conservador 3x (~$3.300) / bueno 5x (~$2.000) / excepcional 7x+ (~$1.400).';
COMMENT ON COLUMN profiles.adn_meta_config IS 'Config Meta Ads. Optimizar Messages/Leads — NO Purchases (tickets $1.5K+ no salen de Learning Phase).';
