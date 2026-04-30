"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../../lib/supabaseClient";

const n = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const holeNo = (row: any) => n(row?.hole_number ?? row?.holeNumber ?? row?.number ?? row?.hole);
const teamIdOf = (row: any) => row?.team_id ?? row?.teamId ?? row?.id;
const grossOf = (row: any) => row?.gross_score ?? row?.gross ?? row?.score ?? "";
const netOf = (row: any) => row?.net_score ?? row?.net ?? "";
const potOf = (row: any) => n(row?.pot_value ?? row?.pot ?? row?.value ?? row?.amount);
const resultTypeOf = (row: any) => String(row?.result_type ?? row?.type ?? "draft");
const isWinner = (row: any, teamId: string) => row?.is_winner === true || row?.winner === true || row?.winner_team_id === teamId;

export default function ScorecardPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState<any>(null);
  const [holes, setHoles] = useState<any[]>([]);
  const [gameTeams, setGameTeams] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);

  const loadData = async () => {
    if (!gameId) return;
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

    const [holesRes, gameTeamsRes, teamsRes, resultsRes] = await Promise.all([
      supabase.from("holes").select("*").eq("game_id", gameId),
      supabase.from("game_teams").select("*").eq("game_id", gameId),
      supabase.from("teams").select("*"),
      supabase.from("hole_results").select("*").eq("game_id", gameId),
    ]);

    const failed = [
      ["holes", holesRes],
      ["game_teams", gameTeamsRes],
      ["teams", teamsRes],
      ["hole_results", resultsRes],
    ].find(([, res]: any) => res.error);

    if (failed) {
      setError(`${failed[0]}: ${(failed[1] as any).error.message}`);
      setLoading(false);
      return;
    }

    const holeRows = (holesRes.data || []).sort((a, b) => holeNo(a) - holeNo(b));
    setHoles(holeRows.length ? holeRows : Array.from({ length: 18 }, (_, index) => ({ hole_number: index + 1, par: "-", stroke_index: "-", base_value: 0 })));
    setGameTeams(gameTeamsRes.data || []);
    setTeams(teamsRes.data || []);
    setResults(resultsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [gameId]);

  const teamRows = useMemo(() => {
    return gameTeams.map((gameTeam, index) => {
      const teamId = teamIdOf(gameTeam);
      const team = teams.find((item) => item.id === teamId);
      return { id: teamId, name: team?.name || `Team ${index + 1}` };
    });
  }, [gameTeams, teams]);

  const holeRows = useMemo(() => {
    return holes.map((hole) => {
      const number = holeNo(hole);
      const rowResults = results.filter((result) => holeNo(result) === number || (result.hole_id && result.hole_id === hole.id));
      return { ...hole, hole_number: number, results: rowResults };
    });
  }, [holes, results]);

  if (loading) return <div className="p-4">Loading scorecard...</div>;
  if (error) return <div className="p-4 text-danger whitespace-pre-wrap">{error}</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black">Scorecard</h1>
          <div className="text-xs text-[var(--gr-text-muted)] font-mono break-all">{gameId}</div>
          <div className="mt-1 text-sm text-[var(--gr-text-muted)]">Role: {invite?.role || "player"}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={loadData}>Refresh</button>
          <Link href={`/game/${gameId}`} className="btn btn-gold">Back to Match</Link>
        </div>
      </div>

      <div className="card p-0 overflow-hidden bg-white text-black rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black text-left text-xs uppercase tracking-wider text-black/55">
                <th className="px-3 py-3">Hole</th>
                <th className="px-3 py-3 text-center">Par</th>
                <th className="px-3 py-3 text-center">SI</th>
                <th className="px-3 py-3 text-center">Value</th>
                {teamRows.map((team) => (
                  <th key={team.id} className="px-3 py-3 text-center">{team.name}</th>
                ))}
                <th className="px-3 py-3 text-center">Winner / Carry</th>
                <th className="px-3 py-3 text-center">Pot</th>
              </tr>
            </thead>
            <tbody>
              {holeRows.map((hole) => {
                const holeResults = hole.results || [];
                const winner = teamRows.find((team) => holeResults.some((result: any) => isWinner(result, team.id)));
                const carry = holeResults.some((result: any) => result?.is_tied === true || resultTypeOf(result) === "carry");
                const pot = holeResults.reduce((max: number, result: any) => Math.max(max, potOf(result)), 0);
                return (
                  <tr key={hole.hole_number} className="border-b border-black/10 hover:bg-black/[0.03]">
                    <td className="px-3 py-4 font-black">{hole.hole_number}</td>
                    <td className="px-3 py-4 text-center font-bold">{hole.par ?? "-"}</td>
                    <td className="px-3 py-4 text-center font-bold">{hole.stroke_index ?? hole.si ?? "-"}</td>
                    <td className="px-3 py-4 text-center font-bold">€{n(hole.base_value ?? hole.value ?? hole.price).toFixed(0)}</td>
                    {teamRows.map((team) => {
                      const result = holeResults.find((item: any) => teamIdOf(item) === team.id);
                      return (
                        <td key={team.id} className="px-3 py-4 text-center">
                          {result ? (
                            <div>
                              <div className="font-black">{grossOf(result)}</div>
                              <div className="text-xs text-black/50">Net {netOf(result) || "-"}</div>
                              <div className="text-[10px] uppercase text-black/40">{resultTypeOf(result)}</div>
                            </div>
                          ) : <span className="text-black/25">-</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-4 text-center font-black">{winner ? winner.name : carry ? "Carry" : "-"}</td>
                    <td className="px-3 py-4 text-center font-black">{pot ? `€${pot.toFixed(0)}` : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
