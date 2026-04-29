"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

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
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      // 1. Obtener usuario
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        router.push("/auth/login");
        return;
      }
      const email = (userData.user.email || "").trim().toLowerCase();
      setUserEmail(email);
      // 2. Validar invite
      const { data: invites, error: inviteError } = await supabase
        .from("game_invites")
        .select("*")
        .ilike("email", email)
        .eq("game_id", gameId)
        .limit(1);
      const invite = invites?.[0];
      setInvite(invite);
      if (inviteError || !invite) {
        setError(`You are not invited to this match (email: ${email})`);
        setLoading(false);
        return;
      }
      // 3. Cargar datos de la partida
      const [holesRes, gameTeamsRes, teamsRes, holeResultsRes, playersRes] = await Promise.all([
        supabase.from("holes").select("*").eq("game_id", gameId).order("number", { ascending: true }),
        supabase.from("game_teams").select("*").eq("game_id", gameId),
        supabase.from("teams").select("*"),
        supabase.from("hole_results").select("*").eq("game_id", gameId),
        supabase.from("players").select("*"),
      ]);
      if (holesRes.error || gameTeamsRes.error || teamsRes.error || holeResultsRes.error || playersRes.error) {
        setError("Error loading scorecard data");
        setLoading(false);
        return;
      }
      setHoles(holesRes.data || []);
      setGameTeams(gameTeamsRes.data || []);
      setTeams(teamsRes.data || []);
      setHoleResults(holeResultsRes.data || []);
      setPlayers(playersRes.data || []);
      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, router]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-danger">{error}</div>;

  // Map teamId to team name
  const teamName = (teamId: string) => teams.find((t) => t.id === teamId)?.name || teamId;
  // Map playerId to player name
  const playerName = (playerId: string) => players.find((p) => p.id === playerId)?.name || playerId;

  // Map teamId to player names (for 2-player teams)
  const teamPlayers = (teamId: string) => {
    const gt = gameTeams.find((gt) => gt.team_id === teamId);
    if (!gt) return "";
    const names = [gt.player_1_id, gt.player_2_id].map(pid => playerName(pid)).filter(Boolean);
    return names.join(" & ");
  };

  // Map holeId+teamId to result
  const getResult = (holeId: string, teamId: string) =>
    holeResults.find((r) => r.hole_id === holeId && r.team_id === teamId);

  // Map holeId to winner teamId
  const getWinner = (holeId: string) => {
    const res = holeResults.find((r) => r.hole_id === holeId && r.is_winner);
    return res ? teamName(res.team_id) : "";
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Scorecard</h2>
      <div className="card mb-4">
        <div className="text-sm text-[var(--gr-text-muted)] mb-2">Match</div>
        <div className="font-mono text-xs break-all">{gameId}</div>
      </div>
      {holes.length === 0 ? (
        <div className="card mb-4 text-center text-[var(--gr-text-muted)]">No scores entered yet.</div>
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
              {holes.map((hole) => (
                gameTeams.map((gt) => {
                  const result = getResult(hole.id, gt.team_id);
                  return (
                    <tr key={hole.id + gt.team_id} className="border-b border-[var(--gr-carbon)]">
                      <td className="px-2 py-1 border text-center">{hole.number}</td>
                      <td className="px-2 py-1 border text-center">{hole.par}</td>
                      <td className="px-2 py-1 border text-center">{hole.stroke_index ?? hole.strokeIndex ?? '-'}</td>
                      <td className="px-2 py-1 border">{teamName(gt.team_id)}</td>
                      <td className="px-2 py-1 border">{teamPlayers(gt.team_id)}</td>
                      <td className="px-2 py-1 border text-center">{result?.gross ?? '-'}</td>
                      <td className="px-2 py-1 border text-center">{result?.net ?? '-'}</td>
                      <td className="px-2 py-1 border text-center">{getWinner(hole.id)}</td>
                    </tr>
                  );
                })
              ))}
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
