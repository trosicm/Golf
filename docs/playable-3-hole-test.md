# Golf Rivals · 3-hole playable test

Use this checklist to validate the Saturday playable flow without changing code during the round.

## Test target

Game:

```txt
8e108d63-5e6e-49a2-bec2-4b11fc6418f2
```

Expected real teams:

```txt
Eric & Dani Alonso
Mateo & Gonzalo
Leandro & Alejandro
Liam & Dani Mottillo
```

## Before starting

Confirm in Supabase:

```sql
select id, name, status, current_hole
from games
where id = '8e108d63-5e6e-49a2-bec2-4b11fc6418f2';
```

Expected:

```txt
status: draft or in-progress
current_hole: 1
```

If needed, reset only the playable test data:

```sql
delete from purchases where game_id = '8e108d63-5e6e-49a2-bec2-4b11fc6418f2';
delete from hole_results where game_id = '8e108d63-5e6e-49a2-bec2-4b11fc6418f2';
update holes set carry_in = 0 where game_id = '8e108d63-5e6e-49a2-bec2-4b11fc6418f2';
update games
set current_hole = 1, status = 'draft'
where id = '8e108d63-5e6e-49a2-bec2-4b11fc6418f2';
```

## Hole 1 · Winner flow

1. Open `/game/8e108d63-5e6e-49a2-bec2-4b11fc6418f2`.
2. Confirm the screen shows Hole 1.
3. Enter gross scores for all 4 teams.
4. Make one team clearly win on net.
5. Click `Calculate Winner`.
6. Confirm provisional winner appears.
7. Click `Confirm Winner`.
8. Expected result:

```txt
current_hole moves to 2
hole_results has 4 rows for hole_number = 1
only one row has is_winner = true
```

Check:

```sql
select hole_number, team_id, gross_score, net_score, is_winner, pot_value
from hole_results
where game_id = '8e108d63-5e6e-49a2-bec2-4b11fc6418f2'
  and hole_number = 1
order by net_score asc;
```

## Hole 2 · Carry flow

1. Confirm the screen shows Hole 2.
2. Enter gross scores so at least 2 teams tie on best net.
3. Click `Calculate Winner`.
4. Confirm Tie / Carry appears.
5. Click `Push / Carry`.
6. Expected result:

```txt
current_hole moves to 3
hole_results has 4 rows for hole_number = 2
hole 3 carry_in should contain the Hole 2 pot
```

Check:

```sql
select hole_number, team_id, gross_score, net_score, is_winner, is_tied, pot_value
from hole_results
where game_id = '8e108d63-5e6e-49a2-bec2-4b11fc6418f2'
  and hole_number = 2
order by net_score asc;

select hole_number, carry_in
from holes
where game_id = '8e108d63-5e6e-49a2-bec2-4b11fc6418f2'
  and hole_number = 3;
```

## Hole 3 · Mulligan and reverse flow

1. Confirm the screen shows Hole 3.
2. Click `Buy Mulligan` for one team.
3. Confirm current pot increases by 50 €.
4. Confirm that same team cannot buy another mulligan on the same hole.
5. Click `Use Reverse` for one team.
6. Confirm current pot increases by the current hole value at that moment.
7. Confirm no other reverse can be used on the same hole.
8. Enter gross scores for all teams.
9. Click `Calculate Winner`.
10. Click `Confirm Winner` or `Push / Carry` depending on result.

Check purchases:

```sql
select hole_number, team_id, type, purchase_type, amount, cost, value
from purchases
where game_id = '8e108d63-5e6e-49a2-bec2-4b11fc6418f2'
order by hole_number, created_at nulls last;
```

## Scorecard validation

Open:

```txt
/game/8e108d63-5e6e-49a2-bec2-4b11fc6418f2/scorecard
```

Expected:

```txt
All 4 real teams appear
Hole 1, 2 and 3 results appear as gross/net
Winner cells are highlighted when is_winner exists
Totals show gross, net, holes won and spent
```

## Leaderboard validation

Open:

```txt
/game/8e108d63-5e6e-49a2-bec2-4b11fc6418f2/leaderboard
```

Expected:

```txt
All 4 real teams appear
Won shows pot won from confirmed holes
Spent shows mulligan/reverse purchases
Balance = won - spent unless wallet balance exists
Teams are ordered by balance
```

## If something fails

Most likely causes:

```txt
RLS still enabled on holes, hole_results, purchases, game_player_wallets or wallet_transactions
A Supabase column name differs from the fallback insert variants
current_hole update blocked by RLS on games
```

Temporary Saturday development fix:

```sql
alter table holes disable row level security;
alter table hole_results disable row level security;
alter table purchases disable row level security;
alter table game_player_wallets disable row level security;
alter table wallet_transactions disable row level security;
```
