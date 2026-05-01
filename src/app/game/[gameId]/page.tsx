"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

const DEFAULT_HOLES = [
  [1, 5, 4, 50], [2, 4, 6, 50], [3, 4, 14, 45], [4, 4, 12, 45], [5, 5, 2, 70], [6, 3, 10, 55],
  [7, 4, 16, 70], [8, 4, 8, 50], [9, 3, 18, 60], [10, 4, 9, 50], [11, 5, 17, 50], [12, 4, 3, 60],
  [13, 3, 15, 60], [14, 5, 1, 70], [15, 4, 11, 45], [16, 4, 7, 50], [17, 3, 13, 60], [18, 4, 5, 60],
].map(([hole_number, par, stroke_index, base_value]) => ({ id: `fallback-${hole_number}`, hole_number, par, stroke_index, base_value }));

type TeamResult = { teamId: string; name: string; grossScore: number; netScore: number };
type CalcResult =
  | { type: "winner"; winner: TeamResult; results: TeamResult[] }
  | { type: "tie"; tiedTeams: TeamResult[]; results: TeamResult[] }
  | { type: "error"; message: string };

const n = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const money = (value: number) => `${value > 0 ? "+" : value < 0 ? "-" : ""}€${Math.abs(value).toFixed(0)}`;
const holeNo = (row: any) => n(row?.hole_number ?? row?.holeNumber ?? row?.number ?? row?.hole);
const holeValue = (row: any) => n(row?.base_value ?? row?.value ?? row?.price ?? row?.hole_value ?? row?.baseValue);
const carryValue = (row: any) => n(row?.carry_in ?? row?.carryIn);
const teamIdOf = (row: any) => row?.team_id ?? row?.teamId ?? row?.id;
const playerIdOf = (row: any) => row?.player_id ?? row?.playerId;
const purchaseAmount = (row: any) => n(row?.amount ?? row?.cost ?? row?.value ?? row?.price);
const economicPurchaseAmount = (row: any) => {
  const type = purchaseType(row);
  if (type.includes("mulligan") && !type.includes("reverse")) return 0;
  return purchaseAmount(row);
};
const purchaseHoleNumber = (row: any) => row?.hole_number ?? row?.holeNumber ?? row?.number;
const purchaseType = (row: any) => String(row?.type ?? row?.purchase_type ?? row?.kind ?? "").toLowerCase();
const walletValue = (row: any) => n(row?.current_balance ?? row?.balance ?? row?.starting_balance ?? row?.total ?? row?.amount);
const resultType = (row: any) => String(row?.result_type ?? row?.type ?? "draft").toLowerCase();
const isWinner = (row: any, teamId: string) => row?.is_winner === true || row?.winner === true || row?.winner_team_id === teamId;
const markerTeamIdOf = (row: any) => row?.marker_team_id ?? row?.markerTeamId;
const markedTeamIdOf = (row: any) => row?.marked_team_id ?? row?.markedTeamId;
const betStatus = (row: any) => String(row?.status ?? "open").toLowerCase();

function teamPlayerIds(team: any) {
  return [team?.player_1_id, team?.player_2_id, team?.player1_id, team?.player2_id, team?.player_a_id, team?.player_b_id].filter(Boolean);
}
function playerName(player: any) {
  return player?.name ?? player?.display_name ?? player?.full_name ?? player?.nickname ?? player?.email ?? player?.id;
}
function mergeHoles(holes: any[]) {
  return DEFAULT_HOLES.map((fallback) => {
    const saved = holes.find((hole) => holeNo(hole) === fallback.hole_number);
    return saved ? { ...fallback, ...saved } : fallback;
  }).sort((a, b) => holeNo(a) - holeNo(b));
}
function safeHole(value: any) {
  return Math.min(18, Math.max(1, n(value, 1)));
}
function currentHoleStorageKey(gameId: any) {
  return `golf-rivals:${gameId}:current-hole`;
}
function quickScoreOptions(par: number) {
  return [
    { label: "Albatros", subtitle: "-3", value: Math.max(1, par - 3) },
    { label: "Eagle", subtitle: "-2", value: Math.max(1, par - 2) },
    { label: "Birdie", subtitle: "-1", value: Math.max(1, par - 1) },
    { label: "Par", subtitle: "Even", value: par },
    { label: "Bogey", subtitle: "+1", value: par + 1 },
    { label: "Doble bogey", subtitle: "+2", value: par + 2 },
    { label: "Raya", subtitle: "No puntúa", value: par + 5 },
  ];
}
async function insertWithFallback(table: string, rows: any[], fallbacks: ((row: any) => any)[]) {
  const variants = [rows, ...fallbacks.map((fn) => rows.map(fn))];
  let lastError: any = null;
  for (const variant of variants) {
    const { error } = await supabase.from(table).insert(variant);
    if (!error) return;
    lastError = error;
  }
  throw lastError;
}

export default function GameLive() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [invite, setInvite] = useState<any>(null);
  const [game, setGame] = useState<any>(null);
  const [holes, setHoles] = useState<any[]>([]);
  const [gameTeams, setGameTeams] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [gameInvites, setGameInvites] = useState<any[]>([]);
  const [teamMarkers, setTeamMarkers] = useState<any[]>([]);
  const [holeResults, setHoleResults] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [sideBets, setSideBets] = useState<any[]>([]);
  const [teamPermissions, setTeamPermissions] = useState<any[]>([]);
  const [grossScores, setGrossScores] = useState<Record<string, string>>({});
  const [calculation, setCalculation] = useState<CalcResult | null>(null);
  const [pickerTeam, setPickerTeam] = useState<any>(null);
  const [customScore, setCustomScore] = useState("");

  const resultHoleNumber = (row: any) => {
    const direct = row?.hole_number ?? row?.holeNumber ?? row?.number;
    if (direct) return n(direct);
    const holeId = row?.hole_id ?? row?.holeId;
    return holeNo(holes.find((hole) => hole.id === holeId));
  };

  const loadData = async (silent = false) => {
    if (!gameId) return;
    if (silent) setRefreshing(true); else setLoading(true);
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
      setRefreshing(false);
      return;
    }
    const inviteRow = invites?.[0];
    setInvite(inviteRow);
    if (!inviteRow) {
      setError(`You are not invited to this match. Email: ${email}`);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const [gameRes, holesRes, gameTeamsRes, teamsRes, playersRes, invitesRes, markersRes, resultsRes, purchasesRes, walletsRes, sideBetsRes] = await Promise.all([
      supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
      supabase.from("holes").select("*").eq("game_id", gameId),
      supabase.from("game_teams").select("*").eq("game_id", gameId),
      supabase.from("teams").select("*"),
      supabase.from("players").select("*"),
      supabase.from("game_invites").select("*").eq("game_id", gameId),
      supabase.from("game_team_markers").select("*").eq("game_id", gameId),
      supabase.from("hole_results").select("*").eq("game_id", gameId),
      supabase.from("purchases").select("*").eq("game_id", gameId),
      supabase.from("game_player_wallets").select("*").eq("game_id", gameId),
      supabase.from("game_bets").select("*").eq("game_id", gameId),
    ]);

    const failed = [
      ["games", gameRes], ["holes", holesRes], ["game_teams", gameTeamsRes], ["teams", teamsRes], ["players", playersRes],
      ["game_invites", invitesRes], ["game_team_markers", markersRes], ["hole_results", resultsRes], ["purchases", purchasesRes], ["game_player_wallets", walletsRes],
    ].find(([, res]: any) => res.error);

    if (failed) {
      setError(`${failed[0]}: ${(failed[1] as any).error.message}`);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setGame(gameRes.data);
    setHoles(mergeHoles(holesRes.data || []));
    setGameTeams(gameTeamsRes.data || []);
    setTeams(teamsRes.data || []);
    setPlayers(playersRes.data || []);
    setGameInvites(invitesRes.data || []);
    setTeamMarkers(markersRes.data || []);
    setHoleResults(resultsRes.data || []);
    setPurchases(purchasesRes.data || []);
    setWallets(walletsRes.data || []);
    setSideBets(sideBetsRes.error ? [] : sideBetsRes.data || []);
    const permissionsRes = await supabase
      .from("game_team_permissions")
      .select("*")
      .eq("game_id", gameId);
    setTeamPermissions(permissionsRes.error ? [] : permissionsRes.data || []);
    setLastSync(new Date());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadData(false); }, [gameId]);
  useEffect(() => { if (!gameId) return; const interval = window.setInterval(() => loadData(true), 30000); return () => window.clearInterval(interval); }, [gameId]);

  const liveData = useMemo(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(currentHoleStorageKey(gameId)) : null;
    const currentHoleNumber = safeHole(game?.current_hole ?? stored ?? 1);
    const currentHole = holes.find((hole) => holeNo(hole) === currentHoleNumber) || holes[0] || DEFAULT_HOLES[0];
    const purchaseBelongsToCurrentHole = (purchase: any) => {
      const directHoleNumber = purchaseHoleNumber(purchase);
      const numericHoleNumber = Number(directHoleNumber);

      if (Number.isFinite(numericHoleNumber) && numericHoleNumber > 0) {
        return numericHoleNumber === currentHoleNumber;
      }

      const purchaseHoleId = purchase?.hole_id ?? purchase?.holeId;
      const currentHoleId = currentHole?.id;

      if (!purchaseHoleId || !currentHoleId || String(currentHoleId).startsWith("fallback-")) {
        return false;
      }

      return purchaseHoleId === currentHoleId;
    };

    const currentPurchases = purchases.filter(purchaseBelongsToCurrentHole);
    const purchaseTotal = currentPurchases.reduce((sum, purchase) => sum + economicPurchaseAmount(purchase), 0);
    const carryIn = carryValue(currentHole);
    const baseValue = holeValue(currentHole);
    const currentPot = baseValue + carryIn + purchaseTotal;
    // Calculate reverseCost: baseValue + carryIn (pot at start of hole)
    const reverseCost = baseValue + carryIn;
    return { currentHole, currentHoleNumber, currentPurchases, purchaseTotal, carryIn, baseValue, currentPot, reverseCost };
  }, [game, holes, purchases, gameId]);

  useEffect(() => { if (!gameId || typeof window === "undefined") return; window.localStorage.setItem(currentHoleStorageKey(gameId), String(liveData.currentHoleNumber)); }, [gameId, liveData.currentHoleNumber]);

  const openHoleBets = useMemo(() => {
    return sideBets.filter((bet) => betStatus(bet) === "open" && String(bet?.scope ?? "") === "hole" && n(bet?.hole_number) === liveData.currentHoleNumber);
  }, [sideBets, liveData.currentHoleNumber]);
  const hasOpenHoleBets = openHoleBets.length > 0;

  const isAdmin = String(invite?.role || "").toLowerCase() === "admin";
  const currentPlayerId = playerIdOf(invite);
  const currentTeamId = useMemo(() => {
    if (invite?.team_id || invite?.teamId) return invite.team_id ?? invite.teamId;
    const directTeam = teams.find((team) => teamPlayerIds(team).includes(currentPlayerId));
    if (directTeam) return directTeam.id;
    const inviteIndex = gameInvites.findIndex((row) => playerIdOf(row) === currentPlayerId || String(row.email || "").toLowerCase() === String(invite?.email || "").toLowerCase());
    if (inviteIndex >= 0) return teamIdOf(gameTeams[Math.floor(inviteIndex / 2)]);
    return null;
  }, [invite, currentPlayerId, teams, gameInvites, gameTeams]);
  const markedTeamIds = useMemo(() => teamMarkers.filter((row) => markerTeamIdOf(row) === currentTeamId).map(markedTeamIdOf).filter(Boolean), [teamMarkers, currentTeamId]);

  const ownTeamPermission = useMemo(
    () => teamPermissions.find((row) => (row?.team_id ?? row?.teamId) === currentTeamId) || null,
    [teamPermissions, currentTeamId]
  );
  const canEditOwnScore = isAdmin || Boolean(ownTeamPermission?.can_edit_own_score);
  const canEditMarkedScore = isAdmin || Boolean(ownTeamPermission?.can_edit_marked_score);

  const teamRows = useMemo(() => {
    const teamCount = gameTeams.length;
    const closedHoleNumbers = [...new Set(
      holeResults
        .filter((r) => resultType(r) !== "draft")
        .map((r) => n(r?.hole_number ?? r?.holeNumber))
        .filter((num) => num > 0)
    )];
    const contributions = closedHoleNumbers.reduce((sum, holeNum) => {
      const hole = holes.find((h) => holeNo(h) === holeNum);
      return sum + (teamCount > 0 ? holeValue(hole) / teamCount : 0);
    }, 0);
    return gameTeams.map((gameTeam, index) => {
    const teamId = teamIdOf(gameTeam);
    const team = teams.find((item) => item.id === teamId);
    const fromTeam = teamPlayerIds(team);
    const fromInvites = gameInvites.filter((item) => (item.team_id ?? item.teamId) === teamId).map(playerIdOf).filter(Boolean);
    const fallbackIds = gameInvites.filter((item) => playerIdOf(item)).slice(index * 2, index * 2 + 2).map(playerIdOf).filter(Boolean);
    const playerIds = Array.from(new Set((fromTeam.length ? fromTeam : fromInvites.length ? fromInvites : fallbackIds).filter(Boolean)));
    const playerNames = playerIds.map((id) => playerName(players.find((player) => player.id === id))).filter(Boolean);
    const teamResults = holeResults.filter((result) => teamIdOf(result) === teamId);
    const currentResult = teamResults.find((result) => resultHoleNumber(result) === liveData.currentHoleNumber || (result.hole_id ?? result.holeId) === liveData.currentHole.id);
    const confirmedWins = teamResults.filter((result) => isWinner(result, teamId) && resultType(result) !== "draft");
    const won = confirmedWins.reduce((sum, result) => sum + n(result?.pot_value ?? result?.pot ?? result?.value ?? result?.amount), 0);
    const teamPurchases = purchases.filter((purchase) => teamIdOf(purchase) === teamId || playerIds.includes(playerIdOf(purchase)));
    const spent = teamPurchases.reduce((sum, purchase) => sum + economicPurchaseAmount(purchase), 0);
    const baseFunds = wallets.filter((wallet) => teamIdOf(wallet) === teamId || playerIds.includes(playerIdOf(wallet))).reduce((sum, wallet) => sum + walletValue(wallet), 0);
    const markerRow = teamMarkers.find((row) => markedTeamIdOf(row) === teamId);
    const markerTeam = teams.find((item) => item.id === markerTeamIdOf(markerRow));
    const isOwnTeamForEdit = currentTeamId === teamId;
    const isMarkedTeam = markedTeamIds.includes(teamId);
    const canEditScore =
      isAdmin ||
      (isOwnTeamForEdit && canEditOwnScore) ||
      (isMarkedTeam && canEditMarkedScore);
    // Calcular mulligans/reverses disponibles
    const mulligansAvailable = Number(gameTeam.mulligans_available) || 0;
    const reversesAvailable = Number(gameTeam.reverses_available) || 0;
    const mulligansUsed = teamPurchases.filter((purchase) => purchaseType(purchase).includes("mulligan") && !purchaseType(purchase).includes("reverse")).length;
    const reversesUsed = teamPurchases.filter((purchase) => purchaseType(purchase).includes("reverse")).length;
    const mulligansRemaining = Math.max(0, mulligansAvailable - mulligansUsed);
    const reversesRemaining = Math.max(0, reversesAvailable - reversesUsed);
    return { id: teamId, name: team?.name || `Team ${index + 1}`, players: playerNames.length ? playerNames.join(" & ") : "Players pending", score: currentResult?.gross_score ?? currentResult?.gross ?? currentResult?.score ?? "-", baseFunds, won, spent, balance: baseFunds + won - spent - contributions, canEditScore, markerName: markerTeam?.name || "Marker pending", mulligansRemaining, reversesRemaining, mulligansUsed, reversesUsed };
    });
  }, [gameTeams, teams, players, gameInvites, holeResults, purchases, wallets, liveData, teamMarkers, isAdmin, currentTeamId, markedTeamIds, canEditOwnScore, canEditMarkedScore, holes]);

  const scoringRows = useMemo(() => teamRows.map((team) => {
    const existingGross = team.score !== "-" ? String(team.score) : "";
    const grossInput = grossScores[team.id] ?? existingGross;
    const grossNumber = grossInput === "" ? NaN : Number(grossInput);
    const isOwnTeam = currentTeamId === team.id;
    const canUseMulligan = isAdmin || isOwnTeam;
    const canUseReverse = isAdmin || isOwnTeam;
    // Purchase actions are allowed for admin or the user's own team.
    return {
      ...team,
      grossInput,
      calculatedNet: Number.isFinite(grossNumber) ? grossNumber : null,
      isOwnTeam,
      canUseMulligan,
      canUseReverse,
    };
  }), [teamRows, grossScores, currentTeamId, isAdmin]);

  useEffect(() => { setGrossScores({}); setCalculation(null); setMessage(""); }, [liveData.currentHoleNumber]);

  const saveDraftScore = async (team: any, score: number | string) => {
    if (!gameId || !team.canEditScore) return;
    const grossScore = Number(score);
    if (!Number.isFinite(grossScore) || grossScore <= 0) return;
    setSaving(true); setMessage("");
    try {
      const holeId = liveData.currentHole.id?.startsWith?.("fallback-") ? null : liveData.currentHole.id;
      await supabase.from("hole_results").delete().eq("game_id", gameId).eq("hole_number", liveData.currentHoleNumber).eq("team_id", team.id);
      const row = {
        game_id: gameId,
        hole_id: holeId,
        hole_number: liveData.currentHoleNumber,
        team_id: team.id,
        score: grossScore,
        gross_score: grossScore,
        net_score: grossScore,
        strokes_received: 0,
        is_winner: false,
        is_tied: false,
        result_type: "draft",
        pot_value: 0,
        result: "draft",
      };
      const { error: insertError } = await supabase.from("hole_results").insert([row]);
      if (insertError) throw insertError;
      setGrossScores((current) => ({ ...current, [team.id]: String(grossScore) }));
      setHoleResults((current) => [...current.filter((result) => !(teamIdOf(result) === team.id && (resultHoleNumber(result) === liveData.currentHoleNumber || (result.hole_id ?? result.holeId) === holeId))), row]);
      setCalculation(null); setMessage(`Saved score for ${team.name}: ${grossScore}. Hole has not been closed.`);
    } catch (err: any) { setMessage(`Could not save score: ${err?.message || "Unknown Supabase error"}`); } finally { setSaving(false); }
  };

  const calculateWinner = () => {
    if (!isAdmin) { setCalculation({ type: "error", message: "Only admin can calculate and confirm the hole." }); return; }
    const results: TeamResult[] = [];
    for (const team of scoringRows) {
      const grossScore = Number(team.grossInput);
      if (team.grossInput === "" || !Number.isFinite(grossScore) || grossScore <= 0) { setCalculation({ type: "error", message: "All team scores must be saved before calculating." }); return; }
      results.push({ teamId: team.id, name: team.name, grossScore, netScore: grossScore });
    }
    const bestNet = Math.min(...results.map((result) => result.netScore));
    const tiedTeams = results.filter((result) => result.netScore === bestNet);
    setCalculation(tiedTeams.length === 1 ? { type: "winner", winner: tiedTeams[0], results } : { type: "tie", tiedTeams, results });
  };

  const clearExistingHoleResults = async () => {
    const holeId = liveData.currentHole.id?.startsWith?.("fallback-") ? null : liveData.currentHole.id;
    if (holeId) { const byHoleId = await supabase.from("hole_results").delete().eq("game_id", gameId).eq("hole_id", holeId); if (!byHoleId.error) return; }
    await supabase.from("hole_results").delete().eq("game_id", gameId).eq("hole_number", liveData.currentHoleNumber);
  };

  const confirmHole = async (mode: "winner" | "carry") => {
    if (hasOpenHoleBets) {
      setMessage(`Resolve ${openHoleBets.length} open side bet${openHoleBets.length === 1 ? "" : "s"} for hole ${liveData.currentHoleNumber} before closing this hole.`);
      return;
    }
    if (!isAdmin || !gameId || !calculation || calculation.type === "error") return;
    if (mode === "winner" && calculation.type !== "winner") return;
    if (mode === "carry" && calculation.type !== "tie") return;
    setSaving(true); setMessage("");
    try {
      const winnerTeamId = calculation.type === "winner" ? calculation.winner.teamId : null;
      const nextHole = Math.min(18, liveData.currentHoleNumber + 1);
      const isFinalHole = liveData.currentHoleNumber >= 18;
      const holeId = liveData.currentHole.id?.startsWith?.("fallback-") ? null : liveData.currentHole.id;
      const { error: deleteError } = await supabase
        .from("hole_results")
        .delete()
        .eq("game_id", gameId)
        .eq("hole_number", liveData.currentHoleNumber);
      if (deleteError) throw deleteError;

      const rows = calculation.results.map((result) => {
        const isWinnerRow = calculation.type === "winner" && winnerTeamId === result.teamId;
        return {
          game_id: gameId,
          hole_id: holeId,
          hole_number: liveData.currentHoleNumber,
          team_id: result.teamId,
          score: result.grossScore,
          gross_score: result.grossScore,
          net_score: result.netScore,
          strokes_received: 0,
          is_winner: winnerTeamId === result.teamId,
          is_tied: calculation.type === "tie",
          result_type: calculation.type === "winner" ? "winner" : "carry",
          pot_value: isWinnerRow ? liveData.currentPot : 0,
          result: calculation.type === "winner" ? (isWinnerRow ? "winner" : "lost") : "carry",
        };
      });
      const { error: insertError } = await supabase.from("hole_results").insert(rows);
      if (insertError) throw insertError;
      if (!isFinalHole) await supabase.from("holes").update({ carry_in: mode === "carry" ? liveData.currentPot : 0 }).eq("game_id", gameId).eq("hole_number", nextHole);
      const { error: updateError } = await supabase.from("games").update({ current_hole: nextHole, status: isFinalHole ? "completed" : game?.status ?? "draft" }).eq("id", gameId);
      if (updateError) throw updateError;
      if (typeof window !== "undefined") window.localStorage.setItem(currentHoleStorageKey(gameId), String(nextHole));
      setGrossScores({}); setCalculation(null); setMessage(mode === "winner" ? "Winner confirmed. Moving to next hole." : "Carry confirmed. Full pot moves to next hole."); await loadData(true);
    } catch (err: any) { setMessage(`Could not confirm hole: ${err?.message || "Unknown Supabase error"}`); } finally { setSaving(false); }
  };

  if (loading) return <div className="p-4">Loading live match...</div>;
  if (error) return <div className="p-4 text-danger whitespace-pre-wrap">{error}</div>;

  const matchName = game?.name ?? game?.data?.name ?? game?.data?.title ?? "Skins por Hoyos - Villamartin";
  const selectedPar = n(liveData.currentHole?.par, 4);

  return (
    <div className="p-3 max-w-3xl mx-auto">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--gr-turf)]"><span className="live-dot" /> Open Match</div>
          <h1 className="text-2xl font-black text-[var(--gr-sand)]">{matchName}</h1>
          <div className="mt-1 text-xs text-[var(--gr-gold)]">HCP 0 · Side bets must be resolved before closing a hole</div>
          {!isAdmin && <div className="mt-1 text-xs text-[var(--gr-text-muted)]">You mark {teamRows.filter((team) => markedTeamIds.includes(team.id)).map((team) => team.name).join(" & ") || "no team assigned"}</div>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link href={isAdmin ? `/game/${gameId}/admin` : `/game/${gameId}/profile`} className="rounded-full border border-[var(--gr-border)] px-3 py-2 text-xs font-black text-[var(--gr-sand)]">{isAdmin ? "Admin" : "Profile"}</Link>
          <button type="button" className="rounded-full border border-[var(--gr-border)] px-3 py-2 text-xs font-black text-[var(--gr-sand)]" disabled={refreshing || saving} onClick={() => loadData(true)}>{refreshing ? "Refreshing..." : "Refresh"}</button>
          <div className="text-[10px] text-[var(--gr-text-muted)]">Auto 30s{lastSync ? ` · ${lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</div>
        </div>
      </div>

      {hasOpenHoleBets && <section className="card mb-4 border-[var(--gr-gold)] bg-[rgba(212,174,96,0.10)]"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--gr-gold)]">Pending side bets</div><div className="text-xl font-black text-[var(--gr-sand)]">{openHoleBets.length} open bet{openHoleBets.length === 1 ? "" : "s"} for hole {liveData.currentHoleNumber}</div><div className="mt-1 text-sm text-[var(--gr-text-muted)]">Resolve or cancel them before closing this hole.</div></div><Link href={`/game/${gameId}/bets`} className="btn btn-gold">Go to BETS</Link></div><div className="mt-3 flex flex-wrap gap-2">{openHoleBets.map((bet) => <span key={bet.id} className="rounded-full border border-[var(--gr-border)] px-3 py-2 text-xs font-black text-[var(--gr-sand)]">{bet.title || bet.type}</span>)}</div></section>}

      <section className="card mb-4 p-0 overflow-hidden"><div className="grid grid-cols-3 border-b border-[var(--gr-border)]"><div className="p-4"><div className="text-xs font-bold uppercase text-[var(--gr-text-muted)]">Hole</div><div className="text-3xl font-black">{liveData.currentHoleNumber}<span className="text-base text-[var(--gr-text-muted)]"> / 18</span></div></div><div className="p-4 text-center border-x border-[var(--gr-border)]"><div className="text-xs font-bold uppercase text-[var(--gr-text-muted)]">Current Pot</div><div className="text-3xl font-black text-[var(--gr-gold)]">€{liveData.currentPot.toFixed(0)}</div></div><div className="p-4 text-right"><div className="text-xs font-bold uppercase text-[var(--gr-text-muted)]">Par / SI</div><div className="text-3xl font-black">{liveData.currentHole.par ?? "-"} / {liveData.currentHole.stroke_index ?? liveData.currentHole.si ?? "-"}</div></div></div><div className="grid grid-cols-4 gap-2 p-4 text-center text-xs sm:text-sm"><div><div className="text-[var(--gr-text-muted)]">Hole Value</div><div className="font-black text-[var(--gr-gold)]">€{liveData.baseValue.toFixed(0)}</div></div><div><div className="text-[var(--gr-text-muted)]">Carry</div><div className="font-black text-[var(--gr-warning)]">€{liveData.carryIn.toFixed(0)}</div></div><div><div className="text-[var(--gr-text-muted)]">Added</div><div className="font-black text-[var(--gr-turf)]">€{liveData.purchaseTotal.toFixed(0)}</div></div><div><div className="text-[var(--gr-text-muted)]">Reverse</div><div className="font-black text-[var(--gr-gold)]">€{liveData.reverseCost.toFixed(0)}</div></div></div></section>

      <section className="grid grid-cols-1 gap-3 mb-4">{scoringRows.map((team, index) => (
        <div key={team.id} className={`card mb-0 ${team.canEditScore ? "" : "opacity-75"}`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span className={`team-badge team-${(index % 4) + 1}`}>{team.name}</span>
              <div className="mt-2 text-sm text-[var(--gr-text-muted)]">{team.players}</div>
              <div className="mt-1 text-xs text-[var(--gr-gold)]">Marker: {team.markerName}{team.canEditScore ? " · Editable by you" : " · Read only"}</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase text-[var(--gr-text-muted)]">Balance</div>
              <div className={team.balance < 0 ? "text-2xl font-black text-danger" : "text-2xl font-black text-success"}>{money(team.balance)}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4 text-center text-xs">
            <div className="rounded-xl border border-[var(--gr-border)] p-3">
              <div className="block text-[var(--gr-text-muted)]">Gross</div>
              <button type="button" disabled={!team.canEditScore || saving} className="mt-1 w-full rounded-xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.7)] px-2 py-3 text-center text-xl font-black text-[var(--gr-sand)] outline-none disabled:opacity-50" onClick={() => { setPickerTeam(team); setCustomScore(team.grossInput || ""); }}>{team.grossInput || (team.canEditScore ? "Select" : "Locked")}</button>
              <div className="mt-1 text-[var(--gr-gold)]">Net {team.calculatedNet ?? "-"}</div>
            </div>
            <div className="rounded-xl border border-[var(--gr-border)] p-3">
              <div className="text-[var(--gr-text-muted)]">HCP</div>
              <div className="text-xl font-black">0</div>
            </div>
            <div className="rounded-xl border border-[var(--gr-border)] p-3 flex flex-col gap-2">
              <div className="text-[var(--gr-text-muted)]">Mulligans</div>
              <div className="text-xl font-black">{team.mulligansRemaining} / {team.mulligansUsed}</div>
              {team.canUseMulligan ? (
                <button
                  className="btn btn-gold mt-2"
                  disabled={saving || team.mulligansRemaining <= 0}
                  onClick={async () => {
                    if (!team.canUseMulligan) return;
                    setSaving(true);
                    setError("");
                    setMessage("");
                      try {
                        const amount = 0;
                      const row = {
                        game_id: gameId,
                        hole_id: liveData.currentHole.id || null,
                        hole_number: liveData.currentHoleNumber,
                        team_id: team.id,
                        type: "mulligan",
                        purchase_type: "mulligan",
                        amount,
                        value: amount,
                      };
                      await insertWithFallback("purchases", [row], [({ hole_id, ...rest }) => rest, ({ purchase_type, value, ...rest }) => rest, ({ hole_id, purchase_type, value, ...rest }) => rest, ({ hole_id, hole_number, purchase_type, value, ...rest }) => rest]);
                      setMessage("Mulligan usado");
                      await loadData(true);
                    } catch (err: any) {
                      setError(`No se pudo usar mulligan: ${err?.message || "Unknown Supabase error"}`);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >Usar Mulligan</button>
              ) : null}
            </div>
            <div className="rounded-xl border border-[var(--gr-border)] p-3 flex flex-col gap-2">
              <div className="text-[var(--gr-text-muted)]">Reverse</div>
              <div className="text-xl font-black">{team.reversesRemaining} / {team.reversesUsed}</div>
              {team.canUseReverse ? (
                <button
                  className="btn btn-gold mt-2"
                  disabled={
                    saving ||
                    team.reversesRemaining <= 0 ||
                    purchases.some(
                      (p) => teamIdOf(p) === team.id && purchaseType(p).includes("reverse") && (purchaseHoleNumber(p) === liveData.currentHoleNumber || p?.hole_id === liveData.currentHole.id)
                    )
                  }
                  onClick={async () => {
                    if (!team.canUseReverse) return;
                    setSaving(true);
                    setError("");
                    setMessage("");
                    try {
                      const amount = liveData.reverseCost;
                      const row = {
                        game_id: gameId,
                        hole_id: liveData.currentHole.id || null,
                        hole_number: liveData.currentHoleNumber,
                        team_id: team.id,
                        type: "reverse_mulligan",
                        purchase_type: "reverse_mulligan",
                        amount,
                        value: amount,
                      };
                      await insertWithFallback("purchases", [row], [({ hole_id, ...rest }) => rest, ({ purchase_type, value, ...rest }) => rest, ({ hole_id, purchase_type, value, ...rest }) => rest, ({ hole_id, hole_number, purchase_type, value, ...rest }) => rest]);
                      setMessage("Reverse usado");
                      await loadData(true);
                    } catch (err: any) {
                      setError(`No se pudo usar reverse: ${err?.message || "Unknown Supabase error"}`);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >Usar Reverse (€{liveData.reverseCost.toFixed(0)})</button>
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--gr-text-muted)]">
            <span>Won <b className="text-success">€{team.won.toFixed(0)}</b></span>
            <span>Spent <b className="text-danger">€{team.spent.toFixed(0)}</b></span>
            <span>Bank <b className="text-[var(--gr-sand)]">€{team.baseFunds.toFixed(0)}</b></span>
          </div>
        </div>
      ))}</section>

      <section className="card"><div className="mb-3 flex items-center justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Hole Control</div><div className="font-black">Close this hole</div></div><div className="text-right text-xs text-[var(--gr-text-muted)]">Pot: <span className="font-black text-[var(--gr-gold)]">€{liveData.currentPot.toFixed(0)}</span></div></div>{message && <div className={`mb-3 rounded-2xl border border-[var(--gr-border)] p-3 text-sm font-bold ${message.startsWith("Could not") || message.includes("Resolve") || message.includes("Only") ? "text-danger" : "text-success"}`}>{message}</div>}{calculation && <div className="mb-3 rounded-2xl border border-[var(--gr-border)] p-3 text-sm">{calculation.type === "error" && <div className="font-bold text-danger">{calculation.message}</div>}{calculation.type === "winner" && <div><div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Provisional winner</div><div className="text-xl font-black text-success">{calculation.winner.name}</div></div>}{calculation.type === "tie" && <div><div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Tie / Carry</div><div className="text-xl font-black text-[var(--gr-warning)]">{calculation.tiedTeams.map((team) => team.name).join(" vs ")}</div><div className="text-[var(--gr-text-muted)]">Full pot moves to next hole.</div></div>}</div>}<div className="grid grid-cols-2 gap-2"><button className="btn btn-gold col-span-2" type="button" onClick={calculateWinner} disabled={saving || !isAdmin}>Calculate Winner</button><button className="btn btn-secondary" type="button" disabled={saving || !isAdmin || hasOpenHoleBets || !calculation || calculation.type !== "winner"} onClick={() => confirmHole("winner")}>Confirm Winner</button><button className="btn btn-secondary" type="button" disabled={saving || !isAdmin || hasOpenHoleBets || !calculation || calculation.type !== "tie"} onClick={() => confirmHole("carry")}>Push / Carry</button></div>{hasOpenHoleBets && <Link href={`/game/${gameId}/bets`} className="btn btn-gold mt-3 w-full">Resolve pending BETS</Link>}{!isAdmin && <div className="mt-3 text-xs text-[var(--gr-text-muted)]">Only admin can close holes.</div>}</section>

      {pickerTeam && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"><div className="w-full max-w-md rounded-3xl border border-[var(--gr-border)] bg-[var(--gr-carbon)] p-4 shadow-2xl"><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-gold)]">Select result</div><div className="text-xl font-black text-[var(--gr-sand)]">{pickerTeam.name}</div><div className="text-sm text-[var(--gr-text-muted)]">Hole {liveData.currentHoleNumber} · Par {selectedPar}</div></div><button className="rounded-full border border-[var(--gr-border)] px-3 py-2 text-sm font-bold" type="button" onClick={() => setPickerTeam(null)}>Close</button></div><div className="grid grid-cols-2 gap-2">{quickScoreOptions(selectedPar).map((option) => <button key={option.label} type="button" className="rounded-2xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.7)] p-3 text-left" onClick={() => { saveDraftScore(pickerTeam, option.value); setPickerTeam(null); }}><div className="text-base font-black text-[var(--gr-sand)]">{option.label}</div><div className="text-xs text-[var(--gr-text-muted)]">{option.subtitle}</div><div className="mt-1 text-lg font-black text-[var(--gr-gold)]">{option.value}</div></button>)}</div><div className="mt-3 rounded-2xl border border-[var(--gr-border)] p-3"><div className="mb-2 text-sm font-black">Otro resultado</div><div className="flex gap-2"><input type="number" inputMode="numeric" min="1" className="w-full rounded-xl border border-[var(--gr-border)] bg-transparent px-3 py-3 text-lg font-black outline-none" value={customScore} onChange={(event) => setCustomScore(event.target.value)} placeholder="Write score" /><button type="button" className="btn btn-gold whitespace-nowrap" onClick={() => { const value = Number(customScore); if (!Number.isFinite(value) || value <= 0) return; saveDraftScore(pickerTeam, value); setPickerTeam(null); }}>Set</button></div></div></div></div>}
    </div>
  );
}
