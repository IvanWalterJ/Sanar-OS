import { supabase, isSupabaseReady, type Profile } from './supabase';

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  if (!isSupabaseReady() || !supabase) return { error: 'Supabase no configurado' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { error: null };
}

export async function signOut(): Promise<void> {
  if (!isSupabaseReady() || !supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!isSupabaseReady() || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!isSupabaseReady() || !supabase) return null;
  const session = await getSession();
  if (!session) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return data ?? null;
}

// Crear perfil de usuario nuevo (llamado tras crear auth.user en el admin)
export async function createProfile(profile: Omit<Profile, 'created_at'>): Promise<{ error: string | null }> {
  if (!isSupabaseReady() || !supabase) return { error: 'Supabase no configurado' };
  const { error } = await supabase.from('profiles').insert(profile);
  if (error) return { error: error.message };
  return { error: null };
}

// Crear usuario via Admin API (solo desde un entorno seguro o Edge Function)
// En producción esto se llama desde una Supabase Edge Function con service_role key
export async function inviteUser(email: string, nombre: string, plan: 'DWY' | 'DFY', especialidad: string, fecha_inicio: string): Promise<{ error: string | null }> {
  if (!isSupabaseReady() || !supabase) return { error: 'Supabase no configurado' };

  // Llamar a la Edge Function que usa service_role para crear el usuario
  const { error } = await supabase.functions.invoke('invite-user', {
    body: { email, nombre, plan, especialidad, fecha_inicio }
  });

  if (error) return { error: error.message };
  return { error: null };
}

// Sincronizar perfil de Supabase → localStorage (fallback para páginas que aún leen localStorage)
export function syncProfileToLocalStorage(profile: Profile): void {
  localStorage.setItem('tcd_profile', JSON.stringify({
    nombre: profile.nombre,
    email: profile.email,
    especialidad: profile.especialidad ?? '',
    fecha_inicio: profile.fecha_inicio,
    plan: profile.plan,
  }));
}
