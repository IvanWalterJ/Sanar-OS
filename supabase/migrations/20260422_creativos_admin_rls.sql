-- ════════════════════════════════════════════════════════════════════════════
-- Fix: admin no podia INSERTAR/UPDATE creativos ni assets de otros usuarios.
--
-- Las policies originales solo permitian admin SELECT. Cuando el admin creaba
-- un carrusel desde el panel viendo a un cliente, el INSERT era bloqueado por
-- RLS, saveCreativo caia al fallback de localStorage y el toast mostraba
-- "Guardado" aunque no hubiera fila en la DB.
--
-- Este parche agrega un FOR ALL admin-policy en creativos, creativo_assets y
-- campanas. Mantiene compatibilidad total con clientes usando su propia app
-- (la policy _user_all sigue intacta — se evaluan en OR logico).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── creativos: admin full access ───────────────────────────────────────────
DROP POLICY IF EXISTS "creativos_admin_all" ON creativos;
CREATE POLICY "creativos_admin_all"
  ON creativos FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));

-- ─── creativo_assets: admin full access ─────────────────────────────────────
DROP POLICY IF EXISTS "creativo_assets_admin_all" ON creativo_assets;
CREATE POLICY "creativo_assets_admin_all"
  ON creativo_assets FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));

-- ─── campanas: admin full access (prevencion) ───────────────────────────────
DROP POLICY IF EXISTS "campanas_admin_all" ON campanas;
CREATE POLICY "campanas_admin_all"
  ON campanas FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));

-- ─── Storage: permitir delete y upsert de admin para cualquier carpeta ──────
-- La policy original requeria que el primer segmento del path fuera auth.uid()
-- — eso impedia al admin borrar archivos de clientes. Replicamos la policy
-- con una rama admin.
DROP POLICY IF EXISTS "creativos_assets_admin_delete" ON storage.objects;
CREATE POLICY "creativos_assets_admin_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'creativos-assets'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

DROP POLICY IF EXISTS "creativos_assets_admin_update" ON storage.objects;
CREATE POLICY "creativos_assets_admin_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'creativos-assets'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );
