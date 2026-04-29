const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hqxarmarhnljkkibtchy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxeGFybWFyaG5samtraWJ0Y2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDExNDgsImV4cCI6MjA5MjcxNzE0OH0.vlUD835t3WUszJlhz0lfIdjlFufnhcuOaiIADD_wPD4';
const supabase = createClient(supabaseUrl, supabaseKey);

const users = [
  { email: 'liam@lafinca.com', password: 'password123' },
  { email: 'danim@lafinca.com', password: 'password123' },
  { email: 'eric@lafinca.com', password: 'password123' }
];

async function signUpUsers() {
  for (const user of users) {
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
    });
    if (error) {
      console.error('Error signing up ' + user.email + ':', error.message);
    } else {
      console.log('Successfully signed up:', user.email, 'ID:', data.user.id);
    }
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

signUpUsers();
