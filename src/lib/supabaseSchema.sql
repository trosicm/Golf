-- Tabla de usuarios: gestionada por Supabase Auth
-- Tabla de partidas asociadas a usuario
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null,
  status text default 'in-progress',
  created_at timestamp with time zone default timezone('utc', now())
);

-- Helper de políticas para la fase de auth.
-- Ejecutar en Supabase SQL Editor si los usuarios no pueden leer sus invitaciones o perfiles.

alter table if exists public.game_invites enable row level security;
alter table if exists public.players enable row level security;
alter table if exists public.profiles enable row level security;

drop policy if exists "Users can read own invites" on public.game_invites;
create policy "Users can read own invites"
on public.game_invites
for select
to authenticated
using (lower(trim(email)) = lower(trim(auth.jwt() ->> 'email')));

drop policy if exists "Users can read invited players" on public.players;
create policy "Users can read invited players"
on public.players
for select
to authenticated
using (
  exists (
    select 1
    from public.game_invites gi
    where gi.player_id = players.id
      and lower(trim(gi.email)) = lower(trim(auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can upsert own profile" on public.profiles;
create policy "Users can upsert own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
