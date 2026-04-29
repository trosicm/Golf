const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hqxarmarhnljkkibtchy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxeGFybWFyaG5samtraWJ0Y2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDExNDgsImV4cCI6MjA5MjcxNzE0OH0.vlUD835t3WUszJlhz0lfIdjlFufnhcuOaiIADD_wPD4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const { data, error } = await supabase.rpc('get_tables');
  if (error) {
    console.log('Error calling rpc:', error.message);
    // Try another way if RPC fails - common pattern for checking table existence
    const { data: d2, error: e2 } = await supabase.from('profiles').select('*').limit(1);
    if (e2) console.log('Profiles table check error:', e2.message);
    else console.log('Profiles table exists');
  } else {
    console.log('Tables:', data);
  }
}

checkTables();
