"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

type QueryResult = {
  name: string;
  data: any[];
  error: any;
};

const FALLBACK_ROWS = [
  { id: "fallback-1", position: 1, name: "Team 1", players: "Player 1 & Player 2", total: "E", thru: "-", round: "-", pot: 0, balance: 0, movement: "-" },
  { id: "fallback-2", position: 2, name: "Team 2", players: "Player 3 & Player 4", total: "E", thru: "-", round: "-", pot: 0, balance: 0, movement: "-" },
  { id: "fallback-3", position: 3, name: "Team 3", players: "Player 5 & Player 6", total: "E", thru: "-", round: "-", pot: 0, balance: 0, movement: "-" },
  { id: "fallback-4", position: 4, name: "Team 4", players: "Player 7 & Player 8", total: "E", thru: "-", round: "-", pot: 0, balance: 0, movement: "-" },
];

function formatMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}€${Math.abs(value).toFixed(0)}`;
}

function getTeamId(gameTeam: any) {
  return gameTeam.team_id ?? gameTeam.teamId ?? gameTeam.id;
}

function getPlayerIds(gameTeam: any) {
  return [
    gameTeam.player_1_id,
    gameTeam.player_2_id,
    gameTeam.player1_id,
    gameTeam.player2_id,
    gameTeam.player_a_id,
    gameTeam.player_b_id,
  ].filter(Boolean);
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
  const [holeResults, setHoleResults] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);

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

      const { data: invites, error: inviteError } = await supabase
        .from("game_invites")
        .select("*")
        .ilike("email", email)
        .eq("game_id", gameId)
        .limit(1);

      const inviteRow = invites?.[0];
      setInvite(inviteRow);

      if (inviteError) {
        setError(`Could not check invitation: ${inviteError.message}`);
        setLoading(false);
        return;
      }

      if (!inviteRow) {
        setError(`You are not invited to this match. Email: ${email}`);
        setLoading(false);
        return;
      }

      const [gameTeamsRes, teamsRes, playersRes, holeResultsRes, walletsRes] = await Promise.all([
        supabase.from("game_teams").select("*").eq("game_id", gameId),
        supabase.from("teams").select("*"),
        supabase.from("players").select("*"),
        supabase.from("hole_results").select("*").eq("game_id", gameId),
        supabase.from("game_player_wallets").select("*").eq("game_id", gameId),
      ]);

      const results: QueryResult[] = [
        { name: "game_teams", data: gameTeamsRes.data || [], error: gameTeamsRes.error },
        { name: "teams", data: teamsRes.data || [], error: teamsRes.error },
        { name: "players", data: playersRes.data || [], error: playersRes.error },
        { name: "hole_results", data: holeResultsRes.data || [], error: holeResultsRes.error },
        { name: "game_player_wallets", data: walletsRes.data || [], error: walletsRes.error },
      ];

      const failed = results.find((result) => result.error);
      if (failed) {
        setError(`${failed.name}: ${failed.error.message}`);
        setLoading(false);
        return;
      }

      setGameTeams(gameTeamsRes.data || []);
      setTeams(teamsRes.data || []);
      setPlayers(playersRes.data || []);
      setHoleResults(holeResultsRes.data || []);
      setWallets(walletsRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [gameId, router]);

  const rows = useMemo(() => {
    if (gameTeams.length === 0) return FALLBACK_ROWS;

    const getTeamName = (teamId: string) => teams.find((team) => team.id === teamId)?.name || teamId;
    const getPlayerName = (playerId: string) => players.find((player) => player.id === playerId)?.name || playerId;

    const calculatedRows = gameTeams.map((gameTeam) => {
      const teamId = getTeamId(gameTeam);
      const teamResults = holeResults.filter((result) => (result.team_id ?? result.teamId) === teamId);
      const holesPlayed = teamResults.length;
      const scoreTotal = teamResults.reduce((sum, result) => {
        const net = Number(result.net ?? result.net_score ?? result.gross ?? result.gross_score ?? result.score);
        return Number.isFinite(net) ? sum + net : sum;
      }, 0);
      const holesWon = teamResults.filter((result) => result.is_winner || result.winner || result.winner_team_id === teamId).length;

      const teamWallets = wallets.filter((wallet) => {
        const walletTeamId = wallet.team_id ?? wallet.teamId;
        const walletPlayerId = wallet.player_id ?? wallet.playerId;
        return walletTeamId === teamId || getPlayerIds(gameTeam).includes(walletPlayerId);
      });

      const balance = teamWallets.reduce((sum, wallet) => {
        const value = Number(wallet.balance ?? wallet.amount ?? wallet.current_balance ?? wallet.total ?? 0);
        return Number.isFinite(value) ? sum + value : sum;
      }, 0);

      const playerNames = getPlayerIds(gameTeam).map((playerId) => getPlayerName(playerId)).filter(Boolean).join(" & ");

      return {
        id: teamId,
        position: 0,
        name: getTeamName(teamId),
        players: playerNames || "Players pending",
        total: holesPlayed > 0 ? scoreTotal : "E",
        thru: holesPlayed > 0 ? holesPlayed : "-",
        round: holesWon > 0 ? holesWon : "-",
        pot: holesWon,
        balance,
        movement: balance > 0 ? "+1" : balance < 0 ? "-1" : "-",
      };
    });

    return calculatedRows
      .sort((a, b) => Number(b.balance) - Number(a.balance))
      .map((row, index) => ({ ...row, position: index + 1 }));
  }, [gameTeams, teams, players, holeResults, wallets]);

  const totalPot = rows.reduce((sum, row) => sum + Math.max(Number(row.balance || 0), 0), 0);
  const playersOnRange = rows.slice(0, 5);

  if (loading) return <div className="p-4">Loading leaderboard...</div>;
  if (error) return <div className="p-4 text-danger whitespace-pre-wrap">{error}</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black mb-1">Leaderboard</h2>
          <div className="text-sm text-[var(--gr-text-muted)]">Every Hole Has a Price.</div>
        </div>
        <div className="text-xs text-[var(--gr-text-muted)] sm:text-right">
          <div className="font-mono break-all">{gameId}</div>
          <div>Role: <span className="text-white font-semibold">{invite?.role || "player"}</span></div>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-[var(--gr-border)] bg-[rgba(239,232,218,0.08)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded bg-[var(--gr-danger)] px-2 py-1 text-xs font-black text-white">LIVE</span>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Players on range</span>
          <div className="flex flex-wrap items-center gap-3">
            {playersOnRange.map((row) => (
              <div key={row.id} className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--gr-gold)] text-xs font-black text-[var(--gr-carbon)]">
                  {row.position}
                </span>
                <span className="text-sm font-bold text-[var(--gr-sand)]">{row.name}</span>
              </div>
            ))}
          </div>
          <div className="ml-auto rounded-full bg-black px-4 py-2 text-sm font-black text-white">RANGE</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <button className="btn btn-secondary">View</button>
        <button className="btn btn-secondary">All Teams</button>
        <button className="btn btn-secondary">Round 1</button>
        <button className="btn btn-secondary">Live Pot {formatMoney(totalPot)}</button>
      </div>

      <div className="card p-0 overflow-hidden bg-white text-black rounded-2xl">
        <div className="border-b border-black/10 px-5 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-black/50">All Teams</div>
          <div className="text-2xl font-black">Match Leaderboard</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black text-left text-xs uppercase tracking-wider text-black/55">
                <th className="px-3 py-3">Pos</th>
                <th className="px-3 py-3">Team</th>
                <th className="px-3 py-3 text-center">Total</th>
                <th className="px-3 py-3 text-center">Thru</th>
                <th className="px-3 py-3 text-center">Won</th>
                <th className="px-3 py-3 text-center">Pot</th>
                <th className="px-3 py-3 text-center">Balance</th>
                <th className="px-3 py-3 text-center">Move</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-black/10 hover:bg-black/[0.03]">
                  <td className="px-3 py-4 font-black">{row.position}</td>
                  <td className="px-3 py-4">
                    <div className="font-black text-black">{row.name}</div>
                    <div className="text-xs text-black/50">{row.players}</div>
                  </td>
                  <td className="px-3 py-4 text-center font-black">{row.total}</td>
                  <td className="px-3 py-4 text-center font-bold">{row.thru}</td>
                  <td className="px-3 py-4 text-center font-bold">{row.round}</td>
                  <td className="px-3 py-4 text-center font-bold">{row.pot}</td>
                  <td className={`px-3 py-4 text-center font-black ${Number(row.balance) < 0 ? "text-[var(--gr-danger)]" : "text-[var(--gr-turf)]"}`}>
                    {formatMoney(Number(row.balance || 0))}
                  </td>
                  <td className={`px-3 py-4 text-center font-black ${row.movement === "+1" ? "text-[var(--gr-turf)]" : row.movement === "-1" ? "text-[var(--gr-danger)]" : "text-black/50"}`}>
                    {row.movement}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-6 sm:flex-row">
        <button className="btn btn-gold w-full" onClick={() => router.push(`/game/${gameId}`)}>
          Back to Match
        </button>
        <button className="btn btn-secondary w-full" onClick={() => router.push(`/game/${gameId}/scorecard`)}>
          Scorecard
        </button>
      </div>
    </div>
  );
}
