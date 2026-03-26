import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vjgnmlwabttnkvctkoxp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqZ25tbHdhYnR0bmt2Y3Rrb3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDk2NjUsImV4cCI6MjA4MTcyNTY2NX0.2IYZji_AVStd1teVj1AigrSOWt9cBcoSTRa2l_Y4mOA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing Supabase Connection...');
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles:', profiles, 'Error:', pErr);

  const { data: tareas, error: tErr } = await supabase.from('tareas_template').select('*').limit(1);
  console.log('Tareas template:', tareas, 'Error:', tErr);

  const { data: tu, error: tuErr } = await supabase.from('tareas_usuario').select('*').limit(1);
  console.log('Tareas usuario:', tu, 'Error:', tuErr);
}

test();
