-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Campanas & Creativos
-- Tablas para gestion de campanas Meta Ads y generacion de creativos con IA
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Tabla: campanas ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campanas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  objetivo TEXT NOT NULL CHECK (objetivo IN ('trafico_perfil', 'mensajes_retargeting', 'clientes_potenciales')),
  -- Segmentacion de audiencia
  nicho TEXT,
  ubicacion TEXT,
  edad_min INTEGER DEFAULT 25,
  edad_max INTEGER DEFAULT 55,
  genero TEXT DEFAULT 'todos' CHECK (genero IN ('todos', 'mujeres', 'hombres')),
  intereses TEXT[],
  -- Presupuesto
  presupuesto_diario NUMERIC(10,2),
  duracion_dias INTEGER DEFAULT 7,
  -- Campos especificos para Clientes Potenciales (Lead Gen)
  monto_inversion_filtro NUMERIC(10,2),  -- umbral filtro conversion API ($500 default)
  url_landing TEXT,
  url_vsl TEXT,
  -- Guia de configuracion generada por IA
  guia_configuracion TEXT,
  -- Estado
  estado TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'configurada', 'activa', 'pausada', 'completada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campanas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campanas_user_all"
  ON campanas FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "campanas_admin_select"
  ON campanas FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));

CREATE INDEX idx_campanas_usuario ON campanas(usuario_id, created_at DESC);

-- ─── Tabla: creativos ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creativos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campana_id UUID REFERENCES campanas(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('imagen_single', 'carrusel')),
  angulo TEXT NOT NULL CHECK (angulo IN (
    'contraintuitivo', 'directo', 'emocional',
    'curiosidad', 'autoridad', 'dolor', 'deseo'
  )),
  -- Copy Meta Ads
  texto_principal TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  cta_texto TEXT,
  -- Metadata
  nombre TEXT,
  estado TEXT DEFAULT 'generado' CHECK (estado IN ('generado', 'aprobado', 'descartado')),
  prompt_imagen TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE creativos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creativos_user_all"
  ON creativos FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "creativos_admin_select"
  ON creativos FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));

CREATE INDEX idx_creativos_usuario ON creativos(usuario_id, created_at DESC);
CREATE INDEX idx_creativos_campana ON creativos(campana_id);

-- ─── Tabla: creativo_assets ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creativo_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creativo_id UUID NOT NULL REFERENCES creativos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slide_orden INTEGER DEFAULT 1,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  mime_type TEXT DEFAULT 'image/png',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE creativo_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creativo_assets_user_all"
  ON creativo_assets FOR ALL
  USING (auth.uid() = usuario_id);

CREATE INDEX idx_creativo_assets_creativo ON creativo_assets(creativo_id, slide_orden);

-- ─── Storage bucket para assets de creativos ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('creativos-assets', 'creativos-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "creativos_assets_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'creativos-assets' AND auth.role() = 'authenticated');

CREATE POLICY "creativos_assets_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'creativos-assets');

CREATE POLICY "creativos_assets_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'creativos-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
