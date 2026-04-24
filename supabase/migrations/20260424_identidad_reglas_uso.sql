-- Manual de Marca — campo para "reglas de uso" (free-text).
-- Los campos identidad_colores, identidad_tipografia e identidad_logo ya existen
-- desde 20260406_clinica_method.sql. Este campo se suma para permitir al
-- profesional definir reglas visuales innegociables (ej: "nunca fondo blanco",
-- "acento dorado siempre presente") que se inyectan en los prompts de imagen.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS identidad_reglas_uso text;

COMMENT ON COLUMN profiles.identidad_reglas_uso IS
  'Reglas de uso de marca (free-text) que se inyectan en prompts de generacion de imagenes con prioridad sobre estilo y referencias.';
