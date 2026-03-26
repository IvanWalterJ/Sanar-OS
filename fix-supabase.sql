-- ==========================================
-- LIMPIAR POLÍTICAS ROTAS EN PROFILES
-- ==========================================
DROP POLICY IF EXISTS "Admins can bypass RLS" ON profiles;
DROP POLICY IF EXISTS "Admin by email" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- POLÍTICAS LIMPIAS SIN RECURSIÓN
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- El service_role bypassa RLS automáticamente, así que solo necesitamos pólizas para authenticated
CREATE POLICY "Authenticated users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Authenticated users can update own profile" ON profiles  
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow insert on profiles" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ==========================================
-- PERMISOS ADMIN: VER TODOS LOS DATOS
-- Admin usa una función SECURITY DEFINER para bypasear RLS
-- ==========================================

-- Función para que el admin pueda leer todos los perfiles
CREATE OR REPLACE FUNCTION get_all_profiles()
RETURNS SETOF profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM profiles WHERE rol = 'cliente' ORDER BY created_at DESC;
$$;

-- Función para que el admin pueda leer tareas de un user específico
CREATE OR REPLACE FUNCTION get_user_tasks(target_user_id UUID)
RETURNS SETOF tareas_usuario
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM tareas_usuario WHERE user_id = target_user_id;
$$;

-- Función para que el admin pueda leer entradas de diario de un user
CREATE OR REPLACE FUNCTION get_user_diary(target_user_id UUID)
RETURNS SETOF diario_entradas
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM diario_entradas WHERE user_id = target_user_id ORDER BY fecha DESC LIMIT 10;
$$;

-- Función para que el admin pueda leer métricas de un user
CREATE OR REPLACE FUNCTION get_user_metrics(target_user_id UUID)
RETURNS SETOF metricas
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM metricas WHERE user_id = target_user_id ORDER BY semana;
$$;

-- ==========================================
-- TRIGGER CREADOR DE PERFILES  
-- ==========================================
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
    COALESCE(new.raw_user_meta_data->>'nombre', 'Usuario'),
    CURRENT_DATE,
    'DWY',
    'cliente'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- SYNC USUARIOS EXISTENTES SIN PERFIL
-- ==========================================
INSERT INTO public.profiles (id, email, nombre, fecha_inicio, plan, rol)
SELECT id, email, 'Usuario', CURRENT_DATE, 'DWY', 'cliente'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- ASIGNAR ADMIN
-- ==========================================
UPDATE public.profiles 
SET rol = 'admin' 
WHERE email = 'javieremilianokatz@gmail.com';
