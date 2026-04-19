-- ═══════════════════════════════════════════════════════════════
-- MIGRACION: RPC para que el owner/admin liste todos los miembros
-- del equipo (rol='admin'). La RLS de profiles solo deja ver el
-- propio profile, asi que sin esto el panel de Equipo solo se
-- mostraba a si mismo.
-- Correr en Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_team_members()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo admins pueden listar el equipo';
  END IF;

  RETURN QUERY
    SELECT *
      FROM public.profiles
      WHERE rol = 'admin'
      ORDER BY created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_members() TO authenticated;
