"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

type QueryResult = {
  name: string;
  data: any[];
  error: any;
};

function getHoleNumber(hole: any) {
  return hole.hole_number ?? hole.number ?? hole.hole ?? 0;
}

function getStrokeIndex(hole: any) {
  return hole.stroke_index ?? hole.strokeIndex ?? hole.si ?? "-";
}

function getGross(result: any) {
  return result?.gross ?? result?.gross_score ?? result?.score ?? "-";
}

function getNet(result: any) {
  return result?.net ?? result?.net_score ?? "-";
}

export default function ScorecardPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [holes, setHoles] = useState<any[]>([]);
  const [gameTeams, setGameTeams] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [holeResults, setHoleResults] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [invite, setInvite] = useState<any>(null);

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

      const [holesRes, gameTeamsRes, teamsRes, holeResultsRes, playersRes] = await Promise.all([
        supabase.from("holes").select("*").eq("game_id", gameId),
        supabase.from("game_teams").select("*").eq("game_id", gameId),
        supabase.from("teams").select("*"),
        supabase.from("hole_results").select("*").eq("game_id", gameId),
        supabase.from("players").select("*"),
      ]);

      const results: QueryResult[] = [
        { name: "holes", data: holesRes.data || [], error: holesRes.error },
        { name: "game_teams", data: gameTeamsRes.data || [], error: gameTeamsRes.error },
        { name: "teams", data: teamsRes.data || [], error: teamsRes.error },
        { name: "hole_results", data: holeResultsRes.data || [], error: holeResultsRes.error },
        { name: "players", data: playersRes.data || [], error: playersRes.error },
      ];

      const failed = results.find((result) => result.error);
      if (failed) {
        setError(`${failed.name}: ${failed.error.message}`);
        setLoading(false);
        return;
      }

      const sortedHoles = [...(holesRes.data || [])].sort((a, b) => getHoleNumber(a) - getHoleNumber(b));

      setHoles(sortedHoles);
      setGameTeams(gameTeamsRes.data || []);
      setTeams(teamsRes.data || []);
      setHoleResults(holeResultsRes.data || []);
      setPlayers(playersRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [gameId, router]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-danger whitespace-pre-wrap">{error}</div>;

  const teamIdFromGameTeam = (gameTeam: any) => gameTeam.team_id ?? gameTeam.teamId ?? gameTeam.id;
  const teamName = (teamId: string) => teams.find((team) => team.id === teamId)?.name || teamId;
  const playerName = (playerId: string) => players.find((player) => player.id === playerId)?.name || playerId;

  const teamPlayers = (teamId: string) => {
    const gameTeam = gameTeams.find((item) => teamIdFromGameTeam(item) === teamId);
    if (!gameTeam) return "";

    const ids = [
      gameTeam.player_1_id,
      gameTeam.player_2_id,
      gameTeam.player1_id,
      gameTeam.player2_id,
      gameTeam.player_a_id,
      gameTeam.player_b_id,
    ].filter(Boolean);

    return ids.map((id: string) => playerName(id)).join(" & ");
  };

  const getResult = (hole: any, teamId: string) => {
    const holeId = hole.id;
    const holeNumber = getHoleNumber(hole);

    return holeResults.find((result) => {
      const resultTeamId = result.team_id ?? result.teamId;
      const resultHoleId = result.hole_id ?? result.holeId;
      const resultHoleNumber = result.hole_number ?? result.holeNumber ?? result.number;
      return resultTeamId === teamId && (resultHoleId === holeId || resultHoleNumber === holeNumber);
    });
  };

  const getWinner = (hole: any) => {
    const holeId = hole.id;
    const holeNumber = getHoleNumber(hole);
    const result = holeResults.find((item) => {
      const itemHoleId = item.hole_id ?? item.holeId;
      const itemHoleNumber = item.hole_number ?? item.holeNumber ?? item.number;
      return (itemHoleId === holeId || itemHoleNumber === holeNumber) && (item.is_winner || item.winner || item.winner_team_id);
    });

    if (!result) return "";
    return teamName(result.winner_team_id ?? result.team_id ?? result.teamId);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Scorecard</h2>

      <div className="card mb-4">
        <div className="text-sm text-[var(--gr-text-muted)] mb-2">Match</div>
        <div className="font-mono text-xs break-all">{gameId}</div>
        <div className="text-xs mt-2 text-[var(--gr-text-muted)]">Role: {invite?.role || "player"}</div>
      </div>

      {holes.length === 0 ? (
        <div className="card mb-4 text-center text-[var(--gr-text-muted)]">No holes found for this match.</div>
      ) : (
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--gr-carbon)] text-[var(--gr-sand)]">
                <th className="px-2 py-1 border">Hole</th>
                <th className="px-2 py-1 border">Par</th>
                <th className="px-2 py-1 border">SI</th>
                <th className="px-2 py-1 border">Team</th>
                <th className="px-2 py-1 border">Players</th>
                <th className="px-2 py-1 border">Gross</th>
                <th className="px-2 py-1 border">Net</th>
                <th className="px-2 py-1 border">Winner</th>
              </tr>
            </thead>
            <tbody>
              {holes.flatMap((hole) =>
                gameTeams.map((gameTeam) => {
                  const teamId = teamIdFromGameTeam(gameTeam);
                  const result = getResult(hole, teamId);

                  return (
                    <tr key={`${hole.id}-${teamId}`} className="border-b border-[var(--gr-carbon)]">
                      <td className="px-2 py-1 border text-center">{getHoleNumber(hole)}</td>
                      <td className="px-2 py-1 border text-center">{hole.par ?? "-"}</td>
                      <td className="px-2 py-1 border text-center">{getStrokeIndex(hole)}</td>
                      <td className="px-2 py-1 border">{teamName(teamId)}</td>
                      <td className="px-2 py-1 border">{teamPlayers(teamId)}</td>
                      <td className="px-2 py-1 border text-center">{getGross(result)}</td>
                      <td className="px-2 py-1 border text-center">{getNet(result)}</td>
                      <td className="px-2 py-1 border text-center">{getWinner(hole)}</td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-4">
        <button className="btn btn-gold w-full" onClick={() => router.push(`/game/${gameId}`)}>
          Back to Match
        </button>
        <button className="btn btn-gold w-full" onClick={() => router.push(`/game/${gameId}/leaderboard`)}>
          Leaderboard
        </button>
      </div>
    </div>
  );
}
