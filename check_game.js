const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hqxarmarhnljkkibtchy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxeGFybWFyaG5samtraWJ0Y2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDExNDgsImV4cCI6MjA5MjcxNzE0OH0.vlUD835t3WUszJlhz0lfIdjlFufnhcuOaiIADD_wPD4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGame() {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching game:', error.message);
  } else {
    console.log('Game Data:', JSON.stringify(data, null, 2));
  }
}

checkGame();
