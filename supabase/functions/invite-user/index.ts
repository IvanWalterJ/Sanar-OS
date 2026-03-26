// Supabase Edge Function — invite-user
// Usa service_role para crear un usuario en Supabase Auth y su perfil en la tabla profiles.
// Se despliega con: supabase functions deploy invite-user
// O pegando este código en el dashboard de Supabase → Edge Functions.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, nombre, plan, especialidad, fecha_inicio } = await req.json();

    if (!email || !nombre) {
      return new Response(
        JSON.stringify({ error: 'email y nombre son requeridos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Cliente con service_role (bypasses RLS, puede crear auth users)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar que quien llama es un admin
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
      if (caller) {
        const { data: callerProfile } = await supabaseAdmin
          .from('profiles')
          .select('rol')
          .eq('id', caller.id)
          .single();
        if (callerProfile?.rol !== 'admin') {
          return new Response(
            JSON.stringify({ error: 'Acceso denegado: solo admins pueden invitar usuarios' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          );
        }
      }
    }

    // Crear usuario en Supabase Auth y enviar email de invitación
    const { data: { user }, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { data: { nombre, plan: plan ?? 'DWY' } }
    );

    if (inviteError) {
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'No se pudo crear el usuario' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Crear perfil en la tabla profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        nombre,
        email,
        plan: plan ?? 'DWY',
        especialidad: especialidad ?? null,
        fecha_inicio: fecha_inicio ?? new Date().toISOString().split('T')[0],
        rol: 'cliente',
      });

    if (profileError) {
      // Si falla el perfil, eliminar el usuario para no dejarlo huérfano
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return new Response(
        JSON.stringify({ error: `Error creando perfil: ${profileError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ user_id: user.id, message: `Invitación enviada a ${email}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
