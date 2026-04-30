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
const resultTypeOf = (row: any) => String(row?.result_type ?? row?.type ?? "draft").toLowerCase();
const isWinner = (row: any, teamId: string) => row?.is_winner === true || row?.winner === true || row?.winner_team_id === teamId;

function resultBadge(type: string) {
  if (type === "winner") return "text-success";
  if (type === "carry") return "text-[var(--gr-gold)]";
  return "text-[var(--gr-text-muted)]";
}

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

  if (loading) return <div className="p-4 text-[var(--gr-sand)]">Loading scorecard...</div>;
  if (error) return <div className="p-4 text-danger whitespace-pre-wrap">{error}</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--gr-turf)]"><span className="live-dot" /> Match Card</div>
          <h1 className="text-3xl font-black text-[var(--gr-sand)]">Scorecard</h1>
          <div className="text-xs text-[var(--gr-text-muted)] font-mono break-all">{gameId}</div>
          <div className="mt-1 text-sm text-[var(--gr-text-muted)]">Role: <span className="text-[var(--gr-sand)] font-semibold">{invite?.role || "player"}</span></div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={loadData}>Refresh</button>
          <Link href={`/game/${gameId}`} className="btn btn-gold">Back to Match</Link>
        </div>
      </div>

      <section className="card p-0 overflow-hidden">
        <div className="border-b border-[var(--gr-border)] px-5 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--gr-text-muted)]">Golf Rivals</div>
          <div className="text-2xl font-black text-[var(--gr-sand)]">Hole by hole results</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--gr-border)] text-left text-xs uppercase tracking-wider text-[var(--gr-text-muted)]">
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
                  <tr key={hole.hole_number} className="border-b border-[var(--gr-border)] hover:bg-[rgba(239,232,218,0.04)]">
                    <td className="px-3 py-4">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(212,174,96,0.18)] text-sm font-black text-[var(--gr-gold)]">{hole.hole_number}</span>
                    </td>
                    <td className="px-3 py-4 text-center font-bold text-[var(--gr-sand)]">{hole.par ?? "-"}</td>
                    <td className="px-3 py-4 text-center font-bold text-[var(--gr-sand)]">{hole.stroke_index ?? hole.si ?? "-"}</td>
                    <td className="px-3 py-4 text-center font-black text-[var(--gr-gold)]">€{n(hole.base_value ?? hole.value ?? hole.price).toFixed(0)}</td>
                    {teamRows.map((team) => {
                      const result = holeResults.find((item: any) => teamIdOf(item) === team.id);
                      const type = result ? resultTypeOf(result) : "";
                      return (
                        <td key={team.id} className="px-3 py-4 text-center">
                          {result ? (
                            <div className="rounded-2xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.34)] px-2 py-2">
                              <div className="text-lg font-black text-[var(--gr-sand)]">{grossOf(result)}</div>
                              <div className="text-xs text-[var(--gr-text-muted)]">Net {netOf(result) || "-"}</div>
                              <div className={`text-[10px] font-black uppercase ${resultBadge(type)}`}>{type}</div>
                            </div>
                          ) : <span className="text-[var(--gr-text-muted)]">-</span>}
                        </td>
                      );
                    })}
                    <td className={`px-3 py-4 text-center font-black ${winner ? "text-success" : carry ? "text-[var(--gr-gold)]" : "text-[var(--gr-text-muted)]"}`}>{winner ? winner.name : carry ? "Carry" : "-"}</td>
                    <td className="px-3 py-4 text-center font-black text-[var(--gr-gold)]">{pot ? `€${pot.toFixed(0)}` : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
