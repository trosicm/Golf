"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

const DEFAULT_HOLES = [
  [1, 5, 4, 50], [2, 4, 6, 50], [3, 4, 14, 45], [4, 4, 12, 45], [5, 5, 2, 70], [6, 3, 10, 55],
  [7, 4, 16, 70], [8, 4, 8, 50], [9, 3, 18, 60], [10, 4, 9, 50], [11, 5, 17, 50], [12, 4, 3, 60],
  [13, 3, 15, 60], [14, 5, 1, 70], [15, 4, 11, 45], [16, 4, 7, 50], [17, 3, 13, 60], [18, 4, 5, 60],
].map(([hole_number, par, stroke_index, base_value]) => ({ id: `fallback-${hole_number}`, hole_number, par, stroke_index, base_value }));

const n = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const money = (value: number) => `€${value.toFixed(0)}`;
const holeNo = (hole: any) => n(hole?.hole_number ?? hole?.number ?? hole?.hole);
const holeValue = (hole: any) => n(hole?.price ?? hole?.value ?? hole?.hole_value ?? hole?.base_value ?? hole?.baseValue);
const teamIdOf = (row: any) => row?.team_id ?? row?.teamId ?? row?.id;
const grossOf = (row: any) => row?.gross ?? row?.gross_score ?? row?.score;
const netOf = (row: any) => row?.net ?? row?.net_score;
const resultHoleNo = (row: any) => row?.hole_number ?? row?.holeNumber ?? row?.number;

function mergeHoles(holes: any[]) {
  return DEFAULT_HOLES.map((fallback) => {
    const saved = holes.find((hole) => holeNo(hole) === fallback.hole_number);
    return saved ? { ...fallback, ...saved } : fallback;
  }).sort((a, b) => holeNo(a) - holeNo(b));
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

      const [holesRes, gameTeamsRes, teamsRes, resultsRes, purchasesRes] = await Promise.all([
        supabase.from("holes").select("*").eq("game_id", gameId),
        supabase.from("game_teams").select("*").eq("game_id", gameId),
        supabase.from("teams").select("*"),
        supabase.from("hole_results").select("*").eq("game_id", gameId),
        supabase.from("purchases").select("*").eq("game_id", gameId),
      ]);

      const failed = [
        ["holes", holesRes], ["game_teams", gameTeamsRes], ["teams", teamsRes], ["hole_results", resultsRes], ["purchases", purchasesRes],
      ].find(([, res]: any) => res.error);
      if (failed) {
        setError(`${failed[0]}: ${(failed[1] as any).error.message}`);
        setLoading(false);
        return;
      }

      setHoles(mergeHoles(holesRes.data || []));
      setGameTeams(gameTeamsRes.data || []);
      setTeams(teamsRes.data || []);
      setHoleResults(resultsRes.data || []);
      setPurchases(purchasesRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [gameId, router]);

  const rows = useMemo(() => {
    const ids = gameTeams.map(teamIdOf).filter(Boolean);
    return ids.map((teamId) => {
      const team = teams.find((item) => item.id === teamId);
      const results = holeResults.filter((result) => teamIdOf(result) === teamId);
      const grossTotal = results.reduce((sum, result) => sum + n(grossOf(result)), 0);
      const netTotal = results.reduce((sum, result) => sum + n(netOf(result)), 0);
      const holesWon = results.filter((result) => result.is_winner || result.winner || result.winner_team_id === teamId).length;
      const spent = purchases.filter((purchase) => teamIdOf(purchase) === teamId).reduce((sum, purchase) => sum + n(purchase.amount ?? purchase.cost ?? purchase.value), 0);
      return { teamId, name: team?.name || teamId, results, grossTotal, netTotal, holesWon, spent };
    });
  }, [gameTeams, teams, holeResults, purchases]);

  const front = holes.filter((hole) => holeNo(hole) <= 9);
  const back = holes.filter((hole) => holeNo(hole) >= 10);
  const parOut = front.reduce((sum, hole) => sum + n(hole.par), 0);
  const parIn = back.reduce((sum, hole) => sum + n(hole.par), 0);
  const valueTotal = holes.reduce((sum, hole) => sum + holeValue(hole), 0);
  const playedCount = new Set(holeResults.map(resultHoleNo).filter(Boolean)).size;

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-danger whitespace-pre-wrap">{error}</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black mb-1">Scorecard</h2>
          <div className="text-sm text-[var(--gr-text-muted)]">{playedCount} holes confirmed · Total base value {money(valueTotal)}</div>
        </div>
        <div className="text-xs text-[var(--gr-text-muted)] sm:text-right"><div className="font-mono break-all">{gameId}</div><div>Role: <span className="text-white font-semibold">{invite?.role || "player"}</span></div></div>
      </div>

      <div className="card p-0 overflow-hidden bg-white text-black rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1160px] text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-black text-xs uppercase tracking-wider text-black/55">
                <th className="sticky left-0 bg-white z-10 px-3 py-3 text-left min-w-[150px]">Team</th>
                {holes.map((hole) => <th key={hole.id} className="px-2 py-3 text-center min-w-[52px]">{holeNo(hole)}</th>)}
                <th className="px-3 py-3 text-center bg-black text-white">Gross</th>
                <th className="px-3 py-3 text-center bg-black text-white">Net</th>
                <th className="px-3 py-3 text-center bg-black text-white">Won</th>
                <th className="px-3 py-3 text-center bg-black text-white">Spent</th>
              </tr>
              <tr className="border-b border-black/10 text-xs text-black/60">
                <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left">Par</th>
                {holes.map((hole) => <td key={`par-${hole.id}`} className="px-2 py-2 text-center">{hole.par ?? "-"}</td>)}
                <td className="px-3 py-2 text-center font-black bg-black/10" colSpan={4}>OUT {parOut} · IN {parIn} · TOTAL {parOut + parIn}</td>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.teamId} className="border-b border-black/10 hover:bg-black/[0.03]">
                  <th className="sticky left-0 bg-white z-10 px-3 py-4 text-left font-black">{row.name}</th>
                  {holes.map((hole) => {
                    const result = row.results.find((item) => resultHoleNo(item) === holeNo(hole) || item.hole_id === hole.id);
                    const isWinner = result?.is_winner || result?.winner || result?.winner_team_id === row.teamId;
                    return <td key={`${row.teamId}-${hole.id}`} className={`px-2 py-4 text-center font-bold ${isWinner ? "bg-green-100 text-green-800" : ""}`}>{result ? `${grossOf(result) ?? "-"}/${netOf(result) ?? "-"}` : "-"}</td>;
                  })}
                  <td className="px-3 py-4 text-center font-black bg-black text-white">{row.grossTotal || "-"}</td>
                  <td className="px-3 py-4 text-center font-black bg-black text-white">{row.netTotal || "-"}</td>
                  <td className="px-3 py-4 text-center font-black bg-black text-white">{row.holesWon}</td>
                  <td className="px-3 py-4 text-center font-black bg-black text-white">{money(row.spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-6 sm:flex-row">
        <button className="btn btn-gold w-full" onClick={() => router.push(`/game/${gameId}`)}>Back to Match</button>
        <button className="btn btn-secondary w-full" onClick={() => router.push(`/game/${gameId}/leaderboard`)}>Leaderboard</button>
      </div>
    </div>
  );
}
