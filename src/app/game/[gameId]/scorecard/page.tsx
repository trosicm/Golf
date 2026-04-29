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

function getHoleValue(hole: any) {
  return Number(hole.price ?? hole.value ?? hole.hole_value ?? hole.base_value ?? hole.baseValue ?? 65);
}

function getGross(result: any) {
  return result?.gross ?? result?.gross_score ?? result?.score ?? "-";
}

function formatMoney(value: number) {
  return `€${value.toFixed(0)}`;
}

function getFrontNine(holes: any[]) {
  return holes.filter((hole) => getHoleNumber(hole) >= 1 && getHoleNumber(hole) <= 9);
}

function getBackNine(holes: any[]) {
  return holes.filter((hole) => getHoleNumber(hole) >= 10 && getHoleNumber(hole) <= 18);
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

  const frontNine = getFrontNine(holes);
  const backNine = getBackNine(holes);
  const orderedHoles = [...frontNine, ...backNine];

  const parOut = frontNine.reduce((sum, hole) => sum + Number(hole.par || 0), 0);
  const parIn = backNine.reduce((sum, hole) => sum + Number(hole.par || 0), 0);
  const parTotal = parOut + parIn;

  const valueOut = frontNine.reduce((sum, hole) => sum + getHoleValue(hole), 0);
  const valueIn = backNine.reduce((sum, hole) => sum + getHoleValue(hole), 0);
  const valueTotal = valueOut + valueIn;

  const firstTeamId = gameTeams[0]?.team_id ?? gameTeams[0]?.teamId ?? gameTeams[0]?.id;

  const getResultForHole = (hole: any) => {
    const holeId = hole.id;
    const holeNumber = getHoleNumber(hole);

    return holeResults.find((result) => {
      const resultHoleId = result.hole_id ?? result.holeId;
      const resultHoleNumber = result.hole_number ?? result.holeNumber ?? result.number;
      const resultTeamId = result.team_id ?? result.teamId;
      return (resultHoleId === holeId || resultHoleNumber === holeNumber) && (!firstTeamId || resultTeamId === firstTeamId);
    });
  };

  const scoreOut = frontNine.reduce((sum, hole) => {
    const gross = Number(getGross(getResultForHole(hole)));
    return Number.isFinite(gross) ? sum + gross : sum;
  }, 0);

  const scoreIn = backNine.reduce((sum, hole) => {
    const gross = Number(getGross(getResultForHole(hole)));
    return Number.isFinite(gross) ? sum + gross : sum;
  }, 0);

  const scoreTotal = scoreOut + scoreIn;
  const hasScores = holeResults.length > 0;
  const firstTeamName = teams.find((team) => team.id === firstTeamId)?.name || "Score";

  const renderHoleCells = (rowType: "hole" | "par" | "value" | "score" | "status") => {
    const cells = orderedHoles.map((hole) => {
      const holeNumber = getHoleNumber(hole);
      const result = getResultForHole(hole);
      const isFrontEnd = holeNumber === 9;
      const isBackEnd = holeNumber === 18;

      let value: string | number = "-";
      if (rowType === "hole") value = holeNumber;
      if (rowType === "par") value = hole.par ?? "-";
      if (rowType === "value") value = formatMoney(getHoleValue(hole));
      if (rowType === "score") value = getGross(result);
      if (rowType === "status") value = result?.status ?? "-";

      const extraCells = [];
      if (isFrontEnd) {
        extraCells.push(
          <td key={`${rowType}-out`} className="px-3 py-3 text-center font-black bg-white/10 text-white border-l border-white/10">
            {rowType === "hole" && "OUT"}
            {rowType === "par" && parOut}
            {rowType === "value" && formatMoney(valueOut)}
            {rowType === "score" && (hasScores ? scoreOut || "-" : "-")}
            {rowType === "status" && "-"}
          </td>,
        );
      }
      if (isBackEnd) {
        extraCells.push(
          <td key={`${rowType}-in`} className="px-3 py-3 text-center font-black bg-white/10 text-white border-l border-white/10">
            {rowType === "hole" && "IN"}
            {rowType === "par" && parIn}
            {rowType === "value" && formatMoney(valueIn)}
            {rowType === "score" && (hasScores ? scoreIn || "-" : "-")}
            {rowType === "status" && "-"}
          </td>,
          <td key={`${rowType}-tot`} className="px-3 py-3 text-center font-black bg-white/15 text-white border-l border-white/10">
            {rowType === "hole" && "TOT"}
            {rowType === "par" && parTotal}
            {rowType === "value" && formatMoney(valueTotal)}
            {rowType === "score" && (hasScores ? scoreTotal || "-" : "-")}
            {rowType === "status" && (hasScores ? "" : "E")}
          </td>,
        );
      }

      return [
        <td
          key={`${rowType}-${hole.id}`}
          className={`px-3 py-3 text-center min-w-[58px] ${holeNumber === 1 ? "bg-black text-white font-black" : ""}`}
        >
          {value}
        </td>,
        ...extraCells,
      ];
    });

    return cells.flat();
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black mb-1">Scorecard</h2>
          <div className="text-lg font-bold text-white/90">Round 1</div>
        </div>
        <div className="text-xs text-[var(--gr-text-muted)] sm:text-right">
          <div className="font-mono break-all">{gameId}</div>
          <div>Role: <span className="text-white font-semibold">{invite?.role || "player"}</span></div>
        </div>
      </div>

      {holes.length === 0 ? (
        <div className="card mb-4 text-center text-[var(--gr-text-muted)]">No holes found for this match.</div>
      ) : (
        <div className="card p-0 overflow-hidden bg-white text-black rounded-2xl">
          <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-black/50">Golf Rivals</div>
              <div className="text-xl font-black">Round 1</div>
            </div>
            <div className="text-right text-xs text-black/50">
              <div>{firstTeamName}</div>
              <div>Total value: <span className="font-black text-black">{formatMoney(valueTotal)}</span></div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm border-collapse">
              <tbody>
                <tr className="border-b border-black/10 text-black/60 uppercase text-xs tracking-wider">
                  <th className="sticky left-0 bg-white z-10 px-3 py-3 text-left min-w-[84px]">Hole</th>
                  {renderHoleCells("hole")}
                </tr>
                <tr className="border-b border-black/10 text-black/70">
                  <th className="sticky left-0 bg-white z-10 px-3 py-3 text-left uppercase text-xs tracking-wider">Par</th>
                  {renderHoleCells("par")}
                </tr>
                <tr className="border-b border-black/10 text-black/70">
                  <th className="sticky left-0 bg-white z-10 px-3 py-3 text-left uppercase text-xs tracking-wider">Value</th>
                  {renderHoleCells("value")}
                </tr>
                <tr className="border-b border-black/10 font-black text-black">
                  <th className="sticky left-0 bg-white z-10 px-3 py-3 text-left uppercase text-xs tracking-wider">Score</th>
                  {renderHoleCells("score")}
                </tr>
                <tr className="text-black/80">
                  <th className="sticky left-0 bg-white z-10 px-3 py-3 text-left uppercase text-xs tracking-wider">Status</th>
                  {renderHoleCells("status")}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-6 sm:flex-row">
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
