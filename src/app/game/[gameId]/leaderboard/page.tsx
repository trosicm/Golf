"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

const n = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const money = (value: number) => `${value > 0 ? "+" : value < 0 ? "-" : ""}€${Math.abs(value).toFixed(0)}`;
const teamIdOf = (row: any) => row?.team_id ?? row?.teamId ?? row?.id;
const playerIdOf = (row: any) => row?.player_id ?? row?.playerId;
const resultHoleNo = (row: any) => row?.hole_number ?? row?.holeNumber ?? row?.number ?? row?.hole_id ?? row?.holeId;
const purchaseAmount = (row: any) => n(row?.amount ?? row?.cost ?? row?.value ?? row?.price);
const potValue = (row: any) => n(row?.pot_value ?? row?.pot ?? row?.value ?? row?.amount);
const walletValue = (row: any) => n(row?.current_balance ?? row?.balance ?? row?.starting_balance ?? row?.total ?? row?.amount);
const isWinningResult = (row: any, teamId: string) => row?.is_winner === true || row?.winner === true || row?.winner_team_id === teamId;

function getTeamPlayerIds(team: any) {
  return [team?.player_1_id, team?.player_2_id, team?.player1_id, team?.player2_id, team?.player_a_id, team?.player_b_id].filter(Boolean);
}
function playerName(player: any) {
  return player?.name ?? player?.display_name ?? player?.full_name ?? player?.nickname ?? player?.email ?? player?.id;
}
function amountClass(value: number) {
  if (value > 0) return "text-success";
  if (value < 0) return "text-danger";
  return "text-[var(--gr-text-muted)]";
}

export default function LeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState<any>(null);
  const [gameTeams, setGameTeams] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [gameInvites, setGameInvites] = useState<any[]>([]);
  const [holeResults, setHoleResults] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError("");

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      router.push("/auth/login");
      return;
    }

    const email = (userData.user.email || "").trim().toLowerCase();
    const { data: invites, error: inviteError } = await supabase
      .from("game_invites")
      .select("*")
      .ilike("email", email)
      .eq("game_id", gameId)
      .limit(1);

    if (inviteError) {
      setError(`Could not check invitation: ${inviteError.message}`);
      setLoading(false);
      return;
    }

    const inviteRow = invites?.[0];
    setInvite(inviteRow);

    if (!inviteRow) {
      setError(`You are not invited to this match. Email: ${email}`);
      setLoading(false);
      return;
    }

    const [gameTeamsRes, teamsRes, playersRes, invitesRes, resultsRes, purchasesRes, walletsRes] = await Promise.all([
      supabase.from("game_teams").select("*").eq("game_id", gameId),
      supabase.from("teams").select("*"),
      supabase.from("players").select("*"),
      supabase.from("game_invites").select("*").eq("game_id", gameId),
      supabase.from("hole_results").select("*").eq("game_id", gameId),
      supabase.from("purchases").select("*").eq("game_id", gameId),
      supabase.from("game_player_wallets").select("*").eq("game_id", gameId),
    ]);

    const failed = [
      ["game_teams", gameTeamsRes],
      ["teams", teamsRes],
      ["players", playersRes],
      ["game_invites", invitesRes],
      ["hole_results", resultsRes],
      ["purchases", purchasesRes],
      ["game_player_wallets", walletsRes],
    ].find(([, res]: any) => res.error);

    if (failed) {
      setError(`${failed[0]}: ${(failed[1] as any).error.message}`);
      setLoading(false);
      return;
    }

    setGameTeams(gameTeamsRes.data || []);
    setTeams(teamsRes.data || []);
    setPlayers(playersRes.data || []);
    setGameInvites(invitesRes.data || []);
    setHoleResults(resultsRes.data || []);
    setPurchases(purchasesRes.data || []);
    setWallets(walletsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [gameId, router]);

  const rows = useMemo(() => {
    const calculated = gameTeams.map((gameTeam, index) => {
      const teamId = teamIdOf(gameTeam);
      const team = teams.find((item) => item.id === teamId);
      const fromTeam = getTeamPlayerIds(team);
      const fromInvites = gameInvites.filter((item) => (item.team_id ?? item.teamId) === teamId).map(playerIdOf).filter(Boolean);
      const fallbackIds = gameInvites.filter((item) => playerIdOf(item)).slice(index * 2, index * 2 + 2).map(playerIdOf).filter(Boolean);
      const playerIds = Array.from(new Set((fromTeam.length ? fromTeam : fromInvites.length ? fromInvites : fallbackIds).filter(Boolean)));
      const playerNames = playerIds.map((id) => playerName(players.find((player) => player.id === id))).filter(Boolean).join(" & ");
      const results = holeResults.filter((result) => teamIdOf(result) === teamId);
      const holesPlayed = new Set(results.map(resultHoleNo).filter(Boolean)).size;
      const winnerResults = results.filter((result) => isWinningResult(result, teamId));
      const won = winnerResults.reduce((sum, result) => sum + potValue(result), 0);
      const spent = purchases.filter((purchase) => teamIdOf(purchase) === teamId || playerIds.includes(playerIdOf(purchase))).reduce((sum, purchase) => sum + purchaseAmount(purchase), 0);
      const baseFunds = wallets.filter((wallet) => teamIdOf(wallet) === teamId || playerIds.includes(playerIdOf(wallet))).reduce((sum, wallet) => sum + walletValue(wallet), 0);
      const balance = baseFunds + won - spent;
      return {
        id: teamId,
        position: 0,
        name: team?.name || `Team ${index + 1}`,
        players: playerNames || "Players pending",
        baseFunds,
        holesWon: winnerResults.length,
        thru: holesPlayed || "-",
        won,
        spent,
        balance,
        movement: balance > baseFunds ? "+1" : balance < baseFunds ? "-1" : "-",
      };
    });

    return calculated.sort((a, b) => b.balance - a.balance || b.holesWon - a.holesWon).map((row, index) => ({ ...row, position: index + 1 }));
  }, [gameTeams, teams, players, gameInvites, holeResults, purchases, wallets]);

  const totalBank = rows.reduce((sum, row) => sum + n(row.baseFunds), 0);
  const totalWon = rows.reduce((sum, row) => sum + n(row.won), 0);
  const totalSpent = rows.reduce((sum, row) => sum + n(row.spent), 0);
  const leaders = rows.slice(0, 4);

  if (loading) return <div className="p-4 text-[var(--gr-sand)]">Loading leaderboard...</div>;
  if (error) return <div className="p-4 text-danger whitespace-pre-wrap">{error}</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--gr-turf)]"><span className="live-dot" /> Live Leaderboard</div>
          <h1 className="text-3xl font-black text-[var(--gr-sand)]">Leaderboard</h1>
          <div className="text-sm text-[var(--gr-text-muted)]">Bank · winnings · purchases · balance</div>
        </div>
        <div className="text-xs text-[var(--gr-text-muted)] sm:text-right">
          <div className="font-mono break-all">{gameId}</div>
          <div>Role: <span className="font-semibold text-[var(--gr-sand)]">{invite?.role || "player"}</span></div>
        </div>
      </div>

      <section className="card mb-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--gr-gold)]">Current leaders</div>
            <div className="text-sm text-[var(--gr-text-muted)]">Ordered by current balance</div>
          </div>
          <div className="rounded-full bg-black px-4 py-2 text-sm font-black text-[var(--gr-sand)]">BANK {money(totalBank)}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {leaders.map((row) => (
            <div key={row.id} className="flex items-center gap-2 rounded-full border border-[var(--gr-border)] bg-[rgba(20,68,55,0.55)] px-3 py-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--gr-gold)] text-xs font-black text-[var(--gr-carbon)]">{row.position}</span>
              <span className="text-sm font-black text-[var(--gr-sand)]">{row.name}</span>
              <span className={`text-sm font-black ${amountClass(row.balance)}`}>{money(row.balance)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-4 flex flex-wrap gap-3">
        <button className="btn btn-secondary">Bank {money(totalBank)}</button>
        <button className="btn btn-secondary">Won {money(totalWon)}</button>
        <button className="btn btn-secondary">Spent {money(totalSpent)}</button>
        <button className="btn btn-secondary" onClick={fetchData}>Refresh</button>
      </div>

      <section className="card p-0 overflow-hidden">
        <div className="border-b border-[var(--gr-border)] px-5 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--gr-text-muted)]">Golf Rivals</div>
          <div className="text-2xl font-black text-[var(--gr-sand)]">Match Leaderboard</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--gr-border)] text-left text-xs uppercase tracking-wider text-[var(--gr-text-muted)]">
                <th className="px-3 py-3">Pos</th>
                <th className="px-3 py-3">Team</th>
                <th className="px-3 py-3 text-center">Thru</th>
                <th className="px-3 py-3 text-center">Bank</th>
                <th className="px-3 py-3 text-center">Holes Won</th>
                <th className="px-3 py-3 text-center">Won</th>
                <th className="px-3 py-3 text-center">Spent</th>
                <th className="px-3 py-3 text-center">Balance</th>
                <th className="px-3 py-3 text-center">Move</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--gr-border)] hover:bg-[rgba(239,232,218,0.04)]">
                  <td className="px-3 py-4">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gr-gold)] text-xs font-black text-[var(--gr-carbon)]">{row.position}</span>
                  </td>
                  <td className="px-3 py-4"><div className="font-black text-[var(--gr-sand)]">{row.name}</div><div className="text-xs text-[var(--gr-text-muted)]">{row.players}</div></td>
                  <td className="px-3 py-4 text-center font-bold text-[var(--gr-sand)]">{row.thru}</td>
                  <td className="px-3 py-4 text-center font-bold text-[var(--gr-sand)]">{money(row.baseFunds)}</td>
                  <td className="px-3 py-4 text-center font-bold text-[var(--gr-sand)]">{row.holesWon}</td>
                  <td className="px-3 py-4 text-center font-black text-success">{money(row.won)}</td>
                  <td className="px-3 py-4 text-center font-black text-danger">{money(row.spent)}</td>
                  <td className={`px-3 py-4 text-center text-lg font-black ${amountClass(row.balance)}`}>{money(row.balance)}</td>
                  <td className={`px-3 py-4 text-center font-black ${row.movement === "+1" ? "text-success" : row.movement === "-1" ? "text-danger" : "text-[var(--gr-text-muted)]"}`}>{row.movement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
