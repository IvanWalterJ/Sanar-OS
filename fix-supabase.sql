-- ==========================================
-- 1. SINCRONIZADOR AUTOMÁTICO DE USUARIOS
-- ==========================================

-- Esta función se encarga de crear el perfil automáticamente cuando agregás alguien en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, fecha_inicio, plan, rol)
  VALUES (
    new.id,
    new.email,
    'Usuario',
    CURRENT_DATE,
    'DWY',
    'cliente'
  );
  RETURN new;
END;
$$;

-- Este trigger "escucha" cada vez que creás un usuario y ejecuta la función anterior
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- 2. RECUPERAR USUARIOS YA CREADOS 
-- ==========================================
-- Esto va a meter en la tabla 'profiles' a la cuenta que creaste hace un rato 
-- y que se quedó "huérfana" (por eso no podías entrar ni cambiarle el rol)

INSERT INTO public.profiles (id, email, nombre, fecha_inicio, plan, rol)
SELECT id, email, 'Mi Cuenta', CURRENT_DATE, 'DWY', 'cliente'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- ==========================================
-- 3. ASIGNAR ROL DE ADMIN AL FUNDADOR
-- ==========================================
-- Acá pone el EMAIL REAL con el que creaste tu usuario recién:
UPDATE public.profiles 
SET rol = 'admin' 
WHERE email = 'TU_EMAIL_ACA';
