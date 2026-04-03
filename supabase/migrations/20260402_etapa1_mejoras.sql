-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN ETAPA 1 — Correr en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Agregar campo `status` a profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE'
    CHECK (status IN ('ONBOARDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CHURNED'));

-- 2. Agregar campo `onboarding_completed` a profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- 3. Agregar campo `plan_label` para soporte de plan IMPLEMENTACION
--    (los valores DWY/DFY existentes se preservan)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan_label TEXT;

-- Todos los usuarios existentes quedan como ACTIVE + onboarding completado
UPDATE profiles
  SET status = 'ACTIVE', onboarding_completed = true
  WHERE status IS NULL OR onboarding_completed IS NULL;

-- 4. Tabla de notas internas (solo admin puede leer/escribir)
CREATE TABLE IF NOT EXISTS admin_notes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  author_id  UUID REFERENCES profiles(id) NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RLS para admin_notes
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solo admins pueden gestionar notas" ON admin_notes;
CREATE POLICY "Solo admins pueden gestionar notas" ON admin_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- 6. RPC para que admins puedan leer notas de un cliente (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_client_notes(target_client_id UUID)
RETURNS TABLE (
  id         UUID,
  client_id  UUID,
  author_id  UUID,
  content    TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo admins pueden llamar esta función
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
    SELECT n.id, n.client_id, n.author_id, n.content, n.created_at
    FROM admin_notes n
    WHERE n.client_id = target_client_id
    ORDER BY n.created_at DESC;
END;
$$;

-- 7. RPC para cambiar status de un usuario (solo admins)
CREATE OR REPLACE FUNCTION update_client_status(target_user_id UUID, new_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE profiles
    SET status = new_status
    WHERE id = target_user_id;
END;
$$;

-- 8. RPC para insertar notas internas (solo admins)
CREATE OR REPLACE FUNCTION insert_client_note(target_client_id UUID, note_content TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO admin_notes (client_id, author_id, content)
  VALUES (target_client_id, auth.uid(), note_content);
END;
$$;
