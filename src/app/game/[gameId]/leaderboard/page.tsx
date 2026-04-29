"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

const FALLBACK_ROWS = [
  { id: "fallback-1", position: 1, name: "Team 1", players: "Player 1 & Player 2", holesWon: 0, thru: "-", won: 0, spent: 0, balance: 0, movement: "-" },
  { id: "fallback-2", position: 2, name: "Team 2", players: "Player 3 & Player 4", holesWon: 0, thru: "-", won: 0, spent: 0, balance: 0, movement: "-" },
  { id: "fallback-3", position: 3, name: "Team 3", players: "Player 5 & Player 6", holesWon: 0, thru: "-", won: 0, spent: 0, balance: 0, movement: "-" },
  { id: "fallback-4", position: 4, name: "Team 4", players: "Player 7 & Player 8", holesWon: 0, thru: "-", won: 0, spent: 0, balance: 0, movement: "-" },
];

const n = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const money = (value: number) => `${value > 0 ? "+" : value < 0 ? "-" : ""}€${Math.abs(value).toFixed(0)}`;
const teamIdOf = (row: any) => row?.team_id ?? row?.teamId ?? row?.id;
const resultHoleNo = (row: any) => row?.hole_number ?? row?.holeNumber ?? row?.number ?? row?.hole_id ?? row?.holeId;
const purchaseAmount = (row: any) => n(row?.amount ?? row?.cost ?? row?.value ?? row?.price);
const potValue = (row: any) => n(row?.pot_value ?? row?.pot ?? row?.value ?? row?.amount);
const isWinningResult = (row: any, teamId: string) => row?.is_winner === true || row?.winner === true || row?.winner_team_id === teamId;
function getTeamPlayerIds(team: any) { return [team?.player_1_id, team?.player_2_id, team?.player1_id, team?.player2_id, team?.player_a_id, team?.player_b_id].filter(Boolean); }
function playerName(player: any) { return player?.name ?? player?.display_name ?? player?.full_name ?? player?.nickname ?? player?.email ?? player?.id; }

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
  const [holeResults, setHoleResults] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        router.push("/auth/login");
        return;
      }

      const email = (userData.user.email || "").trim().toLowerCase();
      const { data: invites, error: inviteError } = await supabase.from("game_invites").select("*").ilike("email", email).eq("game_id", gameId).limit(1);
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

      const [gameTeamsRes, teamsRes, playersRes, resultsRes, purchasesRes] = await Promise.all([
        supabase.from("game_teams").select("*").eq("game_id", gameId),
        supabase.from("teams").select("*"),
        supabase.from("players").select("*"),
        supabase.from("hole_results").select("*").eq("game_id", gameId),
        supabase.from("purchases").select("*").eq("game_id", gameId),
      ]);

      const failed = [
        ["game_teams", gameTeamsRes], ["teams", teamsRes], ["players", playersRes], ["hole_results", resultsRes], ["purchases", purchasesRes],
      ].find(([, res]: any) => res.error);
      if (failed) {
        setError(`${failed[0]}: ${(failed[1] as any).error.message}`);
        setLoading(false);
        return;
      }

      setGameTeams(gameTeamsRes.data || []);
      setTeams(teamsRes.data || []);
      setPlayers(playersRes.data || []);
      setHoleResults(resultsRes.data || []);
      setPurchases(purchasesRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [gameId, router]);

  const rows = useMemo(() => {
    if (gameTeams.length === 0) return FALLBACK_ROWS;

    const calculated = gameTeams.map((gameTeam) => {
      const teamId = teamIdOf(gameTeam);
      const team = teams.find((item) => item.id === teamId);
      const playerIds = getTeamPlayerIds(team).length ? getTeamPlayerIds(team) : getTeamPlayerIds(gameTeam);
      const playerNames = playerIds.map((id) => playerName(players.find((player) => player.id === id))).filter(Boolean).join(" & ");
      const results = holeResults.filter((result) => teamIdOf(result) === teamId);
      const holesPlayed = new Set(results.map(resultHoleNo).filter(Boolean)).size;
      const winnerResults = results.filter((result) => isWinningResult(result, teamId));
      const wonFromResults = winnerResults.reduce((sum, result) => sum + potValue(result), 0);
      const spent = purchases.filter((purchase) => teamIdOf(purchase) === teamId).reduce((sum, purchase) => sum + purchaseAmount(purchase), 0);
      const balance = wonFromResults - spent;
      return {
        id: teamId,
        position: 0,
        name: team?.name || teamId,
        players: playerNames || "Players pending",
        holesWon: winnerResults.length,
        thru: holesPlayed || "-",
        won: wonFromResults,
        spent,
        balance,
        movement: balance > 0 ? "+1" : balance < 0 ? "-1" : "-",
      };
    });

    return calculated.sort((a, b) => b.balance - a.balance || b.holesWon - a.holesWon).map((row, index) => ({ ...row, position: index + 1 }));
  }, [gameTeams, teams, players, holeResults, purchases]);

  const positivePot = rows.reduce((sum, row) => sum + Math.max(n(row.won), 0), 0);
  const totalSpent = rows.reduce((sum, row) => sum + n(row.spent), 0);
  const leaders = rows.slice(0, 4);

  if (loading) return <div className="p-4">Loading leaderboard...</div>;
  if (error) return <div className="p-4 text-danger whitespace-pre-wrap">{error}</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black mb-1">Leaderboard</h2>
          <div className="text-sm text-[var(--gr-text-muted)]">Real results · Purchases · Team balance</div>
        </div>
        <div className="text-xs text-[var(--gr-text-muted)] sm:text-right"><div className="font-mono break-all">{gameId}</div><div>Role: <span className="text-white font-semibold">{invite?.role || "player"}</span></div></div>
      </div>

      <div className="mb-5 rounded-2xl border border-[var(--gr-border)] bg-[rgba(239,232,218,0.08)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded bg-[var(--gr-danger)] px-2 py-1 text-xs font-black text-white">LIVE</span>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Current leaders</span>
          <div className="flex flex-wrap items-center gap-3">
            {leaders.map((row) => (
              <div key={row.id} className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--gr-gold)] text-xs font-black text-[var(--gr-carbon)]">{row.position}</span>
                <span className="text-sm font-bold text-[var(--gr-sand)]">{row.name} · {money(n(row.balance))}</span>
              </div>
            ))}
          </div>
          <div className="ml-auto rounded-full bg-black px-4 py-2 text-sm font-black text-white">SPENT {money(totalSpent)}</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <button className="btn btn-secondary">All Teams</button>
        <button className="btn btn-secondary">Won Pot {money(positivePot)}</button>
        <button className="btn btn-secondary">Purchases {money(totalSpent)}</button>
      </div>

      <div className="card p-0 overflow-hidden bg-white text-black rounded-2xl">
        <div className="border-b border-black/10 px-5 py-4"><div className="text-xs uppercase tracking-[0.18em] text-black/50">Golf Rivals</div><div className="text-2xl font-black">Match Leaderboard</div></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead><tr className="border-b-2 border-black text-left text-xs uppercase tracking-wider text-black/55"><th className="px-3 py-3">Pos</th><th className="px-3 py-3">Team</th><th className="px-3 py-3 text-center">Thru</th><th className="px-3 py-3 text-center">Holes Won</th><th className="px-3 py-3 text-center">Won</th><th className="px-3 py-3 text-center">Spent</th><th className="px-3 py-3 text-center">Balance</th><th className="px-3 py-3 text-center">Move</th></tr></thead>
            <tbody>{rows.map((row) => (<tr key={row.id} className="border-b border-black/10 hover:bg-black/[0.03]"><td className="px-3 py-4 font-black">{row.position}</td><td className="px-3 py-4"><div className="font-black text-black">{row.name}</div><div className="text-xs text-black/50">{row.players}</div></td><td className="px-3 py-4 text-center font-bold">{row.thru}</td><td className="px-3 py-4 text-center font-bold">{row.holesWon}</td><td className="px-3 py-4 text-center font-bold text-[var(--gr-turf)]">{money(n(row.won))}</td><td className="px-3 py-4 text-center font-bold text-[var(--gr-danger)]">{money(n(row.spent))}</td><td className={`px-3 py-4 text-center font-black ${n(row.balance) < 0 ? "text-[var(--gr-danger)]" : "text-[var(--gr-turf)]"}`}>{money(n(row.balance))}</td><td className={`px-3 py-4 text-center font-black ${row.movement === "+1" ? "text-[var(--gr-turf)]" : row.movement === "-1" ? "text-[var(--gr-danger)]" : "text-black/50"}`}>{row.movement}</td></tr>))}</tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-6 sm:flex-row"><button className="btn btn-gold w-full" onClick={() => router.push(`/game/${gameId}`)}>Back to Match</button><button className="btn btn-secondary w-full" onClick={() => router.push(`/game/${gameId}/scorecard`)}>Scorecard</button></div>
    </div>
  );
}
