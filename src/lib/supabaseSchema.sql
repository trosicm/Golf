-- Tabla de usuarios: gestionada por Supabase Auth
-- Tabla de partidas asociadas a usuario
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null,
  status text default 'in-progress',
  created_at timestamp with time zone default timezone('utc', now())
);
