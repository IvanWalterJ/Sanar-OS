-- ═══════════════════════════════════════════════════════════════
-- MIGRACION: RPC para promover usuario a miembro del equipo (admin)
-- Fix bug: el owner no podia actualizar el rol de otro profile por RLS,
--   asi que los miembros nuevos quedaban como 'cliente' silenciosamente.
-- Correr en Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.promover_a_admin(
  p_user_id    UUID,
  p_admin_rol  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_admin_rol NOT IN ('owner', 'manager', 'staff') THEN
    RAISE EXCEPTION 'admin_rol invalido: %', p_admin_rol;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND rol = 'admin'
        AND admin_rol = 'owner'
  ) THEN
    RAISE EXCEPTION 'Solo un owner puede promover miembros del equipo';
  END IF;

  UPDATE public.profiles
    SET rol = 'admin',
        admin_rol = p_admin_rol,
        onboarding_completed = true
    WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile % no existe todavia — reintenta en unos segundos', p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promover_a_admin(UUID, TEXT) TO authenticated;
