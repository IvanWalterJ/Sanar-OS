-- ==========================================
-- PASO 1: LIMPIAR TODAS LAS POLÍTICAS ROTAS
-- ==========================================
DROP POLICY IF EXISTS "Admins can bypass RLS" ON profiles;
DROP POLICY IF EXISTS "Admin by email" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- ==========================================
-- PASO 2: POLÍTICAS SIMPLES (SIN RECURSIÓN)
-- ==========================================
-- Cada usuario puede ver su propia fila únicamente.
-- NO se chequea la tabla profiles para saber si es admin (eso causaba la recursión).
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Cada usuario puede editar su propia fila.
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Permitir insertar (para el trigger automático de nuevos usuarios)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PASO 3: TRIGGER CREADOR DE PERFILES
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
-- PASO 4: RECUPERAR USUARIOS HUÉRFANOS
-- (los que existen en Auth pero no en profiles)
-- ==========================================
INSERT INTO public.profiles (id, email, nombre, fecha_inicio, plan, rol)
SELECT id, email, 'Usuario', CURRENT_DATE, 'DWY', 'cliente'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- PASO 5: ASIGNAR ROL ADMIN
-- (cambia el email por el tuyo)
-- ==========================================
UPDATE public.profiles 
SET rol = 'admin' 
WHERE email = 'javieremilianokatz@gmail.com';
