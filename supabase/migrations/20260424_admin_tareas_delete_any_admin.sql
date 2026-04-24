-- ─── FIX: cualquier admin puede eliminar tareas ─────────────────────────────
-- Antes solo el creador podía borrar — genera el bug de "Tarea eliminada"
-- sin borrado real cuando otro admin intenta eliminarla (RLS silencia la DELETE).

DROP POLICY IF EXISTS "admin_tareas_delete" ON admin_tareas;

CREATE POLICY "admin_tareas_delete" ON admin_tareas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );
