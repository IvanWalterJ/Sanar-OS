-- ═══════════════════════════════════════════════════════════════
-- MIGRACION: RPCs para que el OWNER elimine clientes y miembros
-- del equipo. Ambas son SECURITY DEFINER (se ejecutan como postgres).
--
-- Sin DECLARE/variables para evitar parser issues del SQL Editor.
-- Correr TODO el archivo en Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

-- ─── Eliminar cliente ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_cliente(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol = 'admin' AND admin_rol = 'owner'
  ) THEN
    RAISE EXCEPTION 'Solo el owner puede eliminar clientes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Usuario no existe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_user_id AND rol = 'cliente'
  ) THEN
    RAISE EXCEPTION 'El usuario no es un cliente';
  END IF;

  -- FKs sin CASCADE sobre profiles(id): limpiar manualmente.
  DELETE FROM public.mensajes WHERE emisor_id = p_user_id OR receptor_id = p_user_id;
  DELETE FROM public.admin_notes WHERE author_id = p_user_id;

  DELETE FROM auth.users WHERE id = p_user_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.admin_delete_cliente(UUID) TO authenticated;

-- ─── Eliminar miembro del equipo ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_team_member(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol = 'admin' AND admin_rol = 'owner'
  ) THEN
    RAISE EXCEPTION 'Solo el owner puede eliminar miembros del equipo';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No podes eliminar tu propia cuenta de owner';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Usuario no existe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_user_id AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'El usuario no es un miembro del equipo';
  END IF;

  -- FKs sin CASCADE sobre profiles(id): limpiar manualmente.
  DELETE FROM public.mensajes WHERE emisor_id = p_user_id OR receptor_id = p_user_id;
  DELETE FROM public.admin_notes WHERE author_id = p_user_id;

  DELETE FROM auth.users WHERE id = p_user_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.admin_delete_team_member(UUID) TO authenticated;
