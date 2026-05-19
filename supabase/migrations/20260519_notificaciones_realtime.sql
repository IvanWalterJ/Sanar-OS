-- ═══════════════════════════════════════════════════════════════════════════
-- Habilitar Supabase Realtime para la tabla `notificaciones`.
--
-- Sin esto, los INSERT en `notificaciones` NO se emiten por Realtime y las
-- suscripciones `postgres_changes` del cliente (NotificationBell, Topbar)
-- nunca disparan — la fila se crea en la DB pero el usuario jamás la ve
-- en tiempo real. Esto era el motivo por el cual a Lupe (y a cualquiera)
-- no le llegaban notificaciones de tareas asignadas ni de comentarios.
-- ═══════════════════════════════════════════════════════════════════════════

-- Pre-check: si la tabla no existe, esta migración no puede correr.
-- Corré primero `20260518_admin_roles_notifications.sql` que la crea.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'notificaciones'
  ) THEN
    RAISE EXCEPTION 'Falta la tabla public.notificaciones. Aplicá primero 20260518_admin_roles_notifications.sql';
  END IF;
END $$;

-- ADD TABLE es idempotente solo si la tabla NO está ya en la publication.
-- Envolvemos en DO block para que la re-ejecución no falle.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'notificaciones'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones';
  END IF;
END $$;

-- REPLICA IDENTITY FULL para que payloads de UPDATE incluyan la fila vieja
-- (útil cuando en el futuro queramos suscribirnos a UPDATE para sincronizar
-- "marcada como leída" entre pestañas). Para INSERT alcanza DEFAULT, pero FULL
-- no rompe nada.
ALTER TABLE public.notificaciones REPLICA IDENTITY FULL;
