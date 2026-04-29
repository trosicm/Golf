const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hqxarmarhnljkkibtchy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxeGFybWFyaG5samtraWJ0Y2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDExNDgsImV4cCI6MjA5MjcxNzE0OH0.vlUD835t3WUszJlhz0lfIdjlFufnhcuOaiIADD_wPD4';
const supabase = createClient(supabaseUrl, supabaseKey);

const gameData = {
  teams: [
    {
      name: "Team 1",
      players: [
        { name: "Liam", email: "liam@greenrivals.com", handicap: -4 },
        { name: "Dani Mottillo", email: "danim@greenrivals.com", handicap: 36 }
      ],
      teamHandicap: 16
    },
    {
      name: "Team 2",
      players: [
        { name: "Eric", email: "eric@greenrivals.com", handicap: 18 },
        { name: "Dani Alonso", email: "dania@greenrivals.com", handicap: 0 }
      ],
      teamHandicap: 9
    },
    {
      name: "Team 3",
      players: [
        { name: "Mateo", email: "mateo@greenrivals.com", handicap: 1 },
        { name: "Gonzalo", email: "gonzalo@greenrivals.com", handicap: 9 }
      ],
      teamHandicap: 5
    },
    {
      name: "Team 4",
      players: [
        { name: "Leandro", email: "leandro@greenrivals.com", handicap: 2 },
        { name: "Alejandro", email: "alejandro@greenrivals.com", handicap: 8 }
      ],
      teamHandicap: 5
    }
  ],
  status: "in-progress"
};

async function createGame() {
  const userId = 'f31f129d-8025-40cd-b83e-8e91adc5f006'; // Liam's ID from previous step
  const { data, error } = await supabase
    .from('games')
    .insert([
      { 
        user_id: userId, 
        data: gameData, 
        status: 'in-progress' 
      }
    ])
    .select();

  if (error) {
    console.error('Error creating game:', error.message);
  } else {
    console.log('Game created successfully:', data[0].id);
  }
}

createGame();
