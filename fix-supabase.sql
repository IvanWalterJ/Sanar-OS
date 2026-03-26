-- Reparar infinite recursion en perfiles (borrar todas las políticas de profiles)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING ( auth.uid() = id );

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING ( auth.uid() = id );

-- Reparación rápida de permisos compartidos básicos
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- TABLAS ADICIONALES (CREACIÓN SEGURA)
-- Asegurarnos de que existan para el nuevo GPS
-- ==========================================

-- Tabla de Tareas (Roadmap)
CREATE TABLE IF NOT EXISTS tareas_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tarea_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tareas_usuario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their tasks" ON tareas_usuario;
DROP POLICY IF EXISTS "Users can insert their tasks" ON tareas_usuario;
DROP POLICY IF EXISTS "Users can update their tasks" ON tareas_usuario;
CREATE POLICY "Users can view their tasks" ON tareas_usuario FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their tasks" ON tareas_usuario FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their tasks" ON tareas_usuario FOR UPDATE USING (auth.uid() = user_id);

-- Tabla Diario del Fundador (Check-in Semanal)
CREATE TABLE IF NOT EXISTS diario_entradas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    respuestas JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE diario_entradas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their diary" ON diario_entradas;
DROP POLICY IF EXISTS "Users can insert their diary" ON diario_entradas;
DROP POLICY IF EXISTS "Users can update their diary" ON diario_entradas;
CREATE POLICY "Users can view their diary" ON diario_entradas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their diary" ON diario_entradas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their diary" ON diario_entradas FOR UPDATE USING (auth.uid() = user_id);

-- Tabla de Métricas (Negocio)
CREATE TABLE IF NOT EXISTS metricas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    leads INTEGER DEFAULT 0,
    calls INTEGER DEFAULT 0,
    sales INTEGER DEFAULT 0,
    revenue NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE metricas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their metrics" ON metricas;
DROP POLICY IF EXISTS "Users can insert their metrics" ON metricas;
DROP POLICY IF EXISTS "Users can update their metrics" ON metricas;
CREATE POLICY "Users can view their metrics" ON metricas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their metrics" ON metricas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their metrics" ON metricas FOR UPDATE USING (auth.uid() = user_id);
