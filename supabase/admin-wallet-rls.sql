-- Golf Rivals Admin Wallet RLS
-- Run this file in Supabase SQL Editor.
-- Goal: let a match admin read all players/invites/wallets for the same match
-- and edit player wallets from /game/[gameId]/admin.

alter table if exists public.game_invites enable row level security;
alter table if exists public.players enable row level security;
alter table if exists public.game_player_wallets enable row level security;
alter table if exists public.wallet_transactions enable row level security;

-- Admin can read every invite from matches where their own invite role is admin.
drop policy if exists "Admins can read all invites in their match" on public.game_invites;
create policy "Admins can read all invites in their match"
on public.game_invites
for select
to authenticated
using (
  exists (
    select 1
    from public.game_invites admin_invite
    where admin_invite.game_id = game_invites.game_id
      and lower(trim(admin_invite.email)) = lower(trim(auth.jwt() ->> 'email'))
      and lower(trim(admin_invite.role)) = 'admin'
  )
);

-- Normal user can still read their own invite.
drop policy if exists "Users can read own invites" on public.game_invites;
create policy "Users can read own invites"
on public.game_invites
for select
to authenticated
using (lower(trim(email)) = lower(trim(auth.jwt() ->> 'email')));

-- Admin can read all players linked to invites in their match.
drop policy if exists "Admins can read players in their match" on public.players;
create policy "Admins can read players in their match"
on public.players
for select
to authenticated
using (
  exists (
    select 1
    from public.game_invites player_invite
    join public.game_invites admin_invite
      on admin_invite.game_id = player_invite.game_id
    where player_invite.player_id = players.id
      and lower(trim(admin_invite.email)) = lower(trim(auth.jwt() ->> 'email'))
      and lower(trim(admin_invite.role)) = 'admin'
  )
);

-- User can read their own player record.
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

-- Admin can read all wallets in their match.
drop policy if exists "Admins can read wallets in their match" on public.game_player_wallets;
create policy "Admins can read wallets in their match"
on public.game_player_wallets
for select
to authenticated
using (
  exists (
    select 1
    from public.game_invites admin_invite
    where admin_invite.game_id = game_player_wallets.game_id
      and lower(trim(admin_invite.email)) = lower(trim(auth.jwt() ->> 'email'))
      and lower(trim(admin_invite.role)) = 'admin'
  )
);

-- Player can read their own wallet.
drop policy if exists "Players can read own wallet" on public.game_player_wallets;
create policy "Players can read own wallet"
on public.game_player_wallets
for select
to authenticated
using (
  exists (
    select 1
    from public.game_invites gi
    where gi.game_id = game_player_wallets.game_id
      and gi.player_id = game_player_wallets.player_id
      and lower(trim(gi.email)) = lower(trim(auth.jwt() ->> 'email'))
  )
);

-- Admin can create wallets in their match.
drop policy if exists "Admins can create wallets in their match" on public.game_player_wallets;
create policy "Admins can create wallets in their match"
on public.game_player_wallets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.game_invites admin_invite
    where admin_invite.game_id = game_player_wallets.game_id
      and lower(trim(admin_invite.email)) = lower(trim(auth.jwt() ->> 'email'))
      and lower(trim(admin_invite.role)) = 'admin'
  )
);

-- Admin can update wallets in their match.
drop policy if exists "Admins can update wallets in their match" on public.game_player_wallets;
create policy "Admins can update wallets in their match"
on public.game_player_wallets
for update
to authenticated
using (
  exists (
    select 1
    from public.game_invites admin_invite
    where admin_invite.game_id = game_player_wallets.game_id
      and lower(trim(admin_invite.email)) = lower(trim(auth.jwt() ->> 'email'))
      and lower(trim(admin_invite.role)) = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.game_invites admin_invite
    where admin_invite.game_id = game_player_wallets.game_id
      and lower(trim(admin_invite.email)) = lower(trim(auth.jwt() ->> 'email'))
      and lower(trim(admin_invite.role)) = 'admin'
  )
);

-- Admin can insert wallet transaction logs.
drop policy if exists "Admins can insert wallet transactions in their match" on public.wallet_transactions;
create policy "Admins can insert wallet transactions in their match"
on public.wallet_transactions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.game_invites admin_invite
    where admin_invite.game_id = wallet_transactions.game_id
      and lower(trim(admin_invite.email)) = lower(trim(auth.jwt() ->> 'email'))
      and lower(trim(admin_invite.role)) = 'admin'
  )
);

-- Admin can read wallet transaction logs.
drop policy if exists "Admins can read wallet transactions in their match" on public.wallet_transactions;
create policy "Admins can read wallet transactions in their match"
on public.wallet_transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.game_invites admin_invite
    where admin_invite.game_id = wallet_transactions.game_id
      and lower(trim(admin_invite.email)) = lower(trim(auth.jwt() ->> 'email'))
      and lower(trim(admin_invite.role)) = 'admin'
  )
);
