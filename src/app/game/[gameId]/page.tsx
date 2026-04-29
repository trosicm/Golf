"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

const DEFAULT_HOLES = [
  { id: "fallback-1", hole_number: 1, par: 5, stroke_index: 4, base_value: 50 },
  { id: "fallback-2", hole_number: 2, par: 4, stroke_index: 6, base_value: 50 },
  { id: "fallback-3", hole_number: 3, par: 4, stroke_index: 14, base_value: 45 },
  { id: "fallback-4", hole_number: 4, par: 4, stroke_index: 12, base_value: 45 },
  { id: "fallback-5", hole_number: 5, par: 5, stroke_index: 2, base_value: 75 },
  { id: "fallback-6", hole_number: 6, par: 3, stroke_index: 10, base_value: 60 },
  { id: "fallback-7", hole_number: 7, par: 4, stroke_index: 16, base_value: 80 },
  { id: "fallback-8", hole_number: 8, par: 4, stroke_index: 8, base_value: 50 },
  { id: "fallback-9", hole_number: 9, par: 3, stroke_index: 18, base_value: 60 },
  { id: "fallback-10", hole_number: 10, par: 4, stroke_index: 9, base_value: 50 },
  { id: "fallback-11", hole_number: 11, par: 5, stroke_index: 17, base_value: 50 },
  { id: "fallback-12", hole_number: 12, par: 4, stroke_index: 3, base_value: 65 },
  { id: "fallback-13", hole_number: 13, par: 3, stroke_index: 15, base_value: 60 },
  { id: "fallback-14", hole_number: 14, par: 5, stroke_index: 1, base_value: 80 },
  { id: "fallback-15", hole_number: 15, par: 4, stroke_index: 11, base_value: 45 },
  { id: "fallback-16", hole_number: 16, par: 4, stroke_index: 7, base_value: 50 },
  { id: "fallback-17", hole_number: 17, par: 3, stroke_index: 13, base_value: 70 },
  { id: "fallback-18", hole_number: 18, par: 4, stroke_index: 5, base_value: 65 },
];

const FALLBACK_TEAMS = [
  { id: "fallback-team-1", name: "Team 1", players: "Player 1 & Player 2", handicap: 10 },
  { id: "fallback-team-2", name: "Team 2", players: "Player 3 & Player 4", handicap: 12 },
  { id: "fallback-team-3", name: "Team 3", players: "Player 5 & Player 6", handicap: 14 },
  { id: "fallback-team-4", name: "Team 4", players: "Player 7 & Player 8", handicap: 16 },
];

type QueryResult = {
  name: string;
  data: any[];
  error: any;
};

type CalculatedTeamResult = {
  teamId: string;
  name: string;
  grossScore: number;
  strokesReceived: number;
  netScore: number;
};

type ProvisionalResult =
  | { type: "winner"; winner: CalculatedTeamResult; results: CalculatedTeamResult[] }
  | { type: "tie"; tiedTeams: CalculatedTeamResult[]; results: CalculatedTeamResult[] }
  | { type: "error"; message: string };

function formatMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}€${Math.abs(value).toFixed(0)}`;
}

function getHoleNumber(hole: any) {
  return hole.hole_number ?? hole.number ?? hole.hole ?? 0;
}

function getHoleValue(hole: any) {
  return Number(hole.price ?? hole.value ?? hole.hole_value ?? hole.base_value ?? hole.baseValue ?? 0);
}

function getStrokeIndex(hole: any) {
  return hole.stroke_index ?? hole.strokeIndex ?? hole.si ?? "-";
}

function getGameTeamId(gameTeam: any) {
  return gameTeam.team_id ?? gameTeam.teamId ?? gameTeam.id;
}

function getTeamPlayerIds(team: any) {
  return [
    team?.player_1_id,
    team?.player_2_id,
    team?.player1_id,
    team?.player2_id,
    team?.player_a_id,
    team?.player_b_id,
  ].filter(Boolean);
}

function getPlayerDisplayName(player: any) {
  return player?.name ?? player?.display_name ?? player?.full_name ?? player?.nickname ?? player?.email ?? player?.id;
}

function calculateStrokesReceived(combinedHandicap: any, strokeIndex: any) {
  const handicap = Number(combinedHandicap);
  const si = Number(strokeIndex);

  if (!Number.isFinite(handicap) || !Number.isFinite(si) || si < 1) {
    return 0;
  }

  const baseStrokes = Math.floor(handicap / 18);
  const extraStrokes = Math.floor(handicap % 18);

  return baseStrokes + (si <= extraStrokes ? 1 : 0);
}

function mergeHolesWithDefaults(holes: any[]) {
  return DEFAULT_HOLES.map((defaultHole) => {
    const savedHole = holes.find((hole) => getHoleNumber(hole) === defaultHole.hole_number);
    return savedHole ? { ...defaultHole, ...savedHole } : defaultHole;
  });
}

export default function GameLive() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [invite, setInvite] = useState<any>(null);
  const [game, setGame] = useState<any>(null);
  const [holes, setHoles] = useState<any[]>([]);
  const [gameTeams, setGameTeams] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [gameInvites, setGameInvites] = useState<any[]>([]);
  const [holeResults, setHoleResults] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [grossScores, setGrossScores] = useState<Record<string, string>>({});
  const [provisionalResult, setProvisionalResult] = useState<ProvisionalResult | null>(null);

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

      const [gameRes, holesRes, gameTeamsRes, teamsRes, playersRes, allInvitesRes, holeResultsRes, walletsRes, purchasesRes] = await Promise.all([
        supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
        supabase.from("holes").select("*").eq("game_id", gameId),
        supabase.from("game_teams").select("*").eq("game_id", gameId),
        supabase.from("teams").select("*"),
        supabase.from("players").select("*"),
        supabase.from("game_invites").select("*").eq("game_id", gameId),
        supabase.from("hole_results").select("*").eq("game_id", gameId),
        supabase.from("game_player_wallets").select("*").eq("game_id", gameId),
        supabase.from("purchases").select("*").eq("game_id", gameId),
      ]);

      const results: QueryResult[] = [
        { name: "holes", data: holesRes.data || [], error: holesRes.error },
        { name: "game_teams", data: gameTeamsRes.data || [], error: gameTeamsRes.error },
        { name: "teams", data: teamsRes.data || [], error: teamsRes.error },
        { name: "players", data: playersRes.data || [], error: playersRes.error },
        { name: "game_invites", data: allInvitesRes.data || [], error: allInvitesRes.error },
        { name: "hole_results", data: holeResultsRes.data || [], error: holeResultsRes.error },
        { name: "game_player_wallets", data: walletsRes.data || [], error: walletsRes.error },
        { name: "purchases", data: purchasesRes.data || [], error: purchasesRes.error },
      ];

      if (gameRes.error) {
        setError(`games: ${gameRes.error.message}`);
        setLoading(false);
        return;
      }

      const failed = results.find((result) => result.error);
      if (failed) {
        setError(`${failed.name}: ${failed.error.message}`);
        setLoading(false);
        return;
      }

      setGame(gameRes.data);
      setHoles(mergeHolesWithDefaults(holesRes.data || []).sort((a, b) => getHoleNumber(a) - getHoleNumber(b)));
      setGameTeams(gameTeamsRes.data || []);
      setTeams(teamsRes.data || []);
      setPlayers(playersRes.data || []);
      setGameInvites(allInvitesRes.data || []);
      setHoleResults(holeResultsRes.data || []);
      setWallets(walletsRes.data || []);
      setPurchases(purchasesRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [gameId, router]);

  const liveData = useMemo(() => {
    const requestedHoleNumber = Number(game?.current_hole ?? 1);
    const safeHoleNumber = Number.isFinite(requestedHoleNumber)
      ? Math.min(18, Math.max(1, requestedHoleNumber))
      : 1;

    const currentHole = holes.find((hole) => getHoleNumber(hole) === safeHoleNumber) || holes[0] || DEFAULT_HOLES[0];
    const currentHoleNumber = getHoleNumber(currentHole);
    const baseValue = getHoleValue(currentHole);

    const currentPurchases = purchases.filter((purchase) => {
      const purchaseHoleNumber = purchase.hole_number ?? purchase.holeNumber ?? purchase.number;
      const purchaseHoleId = purchase.hole_id ?? purchase.holeId;
      return purchaseHoleNumber === currentHoleNumber || purchaseHoleId === currentHole.id;
    });

    const purchaseTotal = currentPurchases.reduce((sum, purchase) => {
      const value = Number(purchase.cost ?? purchase.amount ?? purchase.value ?? 0);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);

    const carryIn = Number(currentHole.carry_in ?? currentHole.carryIn ?? 0);
    const currentPot = baseValue + carryIn + purchaseTotal;
    const totalPot = holes.reduce((sum, hole) => sum + getHoleValue(hole), 0) + purchases.reduce((sum, purchase) => {
      const value = Number(purchase.cost ?? purchase.amount ?? purchase.value ?? 0);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);

    return { currentHole, currentHoleNumber, baseValue, carryIn, purchaseTotal, currentPot, totalPot };
  }, [game, holes, purchases]);

  const teamRows = useMemo(() => {
    if (gameTeams.length === 0) {
      return FALLBACK_TEAMS.map((team, index) => ({
        ...team,
        position: index + 1,
        score: "-",
        net: "-",
        holesWon: 0,
        mulligansLeft: 5,
        reversesLeft: 2,
        spent: 0,
        won: 0,
        balance: 0,
      }));
    }

    const getPlayerName = (playerId: string) => getPlayerDisplayName(players.find((player) => player.id === playerId)) || playerId;

    return gameTeams.map((gameTeam, index) => {
      const teamId = getGameTeamId(gameTeam);
      const teamRecord = teams.find((team) => team.id === teamId);
      const playerIdsFromTeam = getTeamPlayerIds(teamRecord);
      const invitedPlayerIds = gameInvites
        .filter((gameInvite) => (gameInvite.team_id ?? gameInvite.teamId) === teamId)
        .map((gameInvite) => gameInvite.player_id ?? gameInvite.playerId)
        .filter(Boolean);
      const fallbackInvitePlayerIds = gameInvites
        .filter((gameInvite) => gameInvite.player_id || gameInvite.playerId)
        .slice(index * 2, index * 2 + 2)
        .map((gameInvite) => gameInvite.player_id ?? gameInvite.playerId)
        .filter(Boolean);
      const playerIds = Array.from(new Set([...(playerIdsFromTeam.length ? playerIdsFromTeam : invitedPlayerIds.length ? invitedPlayerIds : fallbackInvitePlayerIds)].filter(Boolean)));

      const teamResults = holeResults.filter((result) => (result.team_id ?? result.teamId) === teamId);
      const currentResult = teamResults.find((result) => {
        const resultHoleNumber = result.hole_number ?? result.holeNumber ?? result.number;
        const resultHoleId = result.hole_id ?? result.holeId;
        return resultHoleNumber === liveData.currentHoleNumber || resultHoleId === liveData.currentHole.id;
      });
      const holesWon = teamResults.filter((result) => result.is_winner || result.winner || result.winner_team_id === teamId).length;
      const teamPurchases = purchases.filter((purchase) => (purchase.team_id ?? purchase.teamId) === teamId || playerIds.includes(purchase.player_id ?? purchase.playerId));
      const spent = teamPurchases.reduce((sum, purchase) => {
        const value = Number(purchase.cost ?? purchase.amount ?? purchase.value ?? 0);
        return Number.isFinite(value) ? sum + value : sum;
      }, 0);
      const won = holesWon * 0;
      const walletBalance = wallets
        .filter((wallet) => {
          const walletTeamId = wallet.team_id ?? wallet.teamId;
          const walletPlayerId = wallet.player_id ?? wallet.playerId;
          return walletTeamId === teamId || playerIds.includes(walletPlayerId);
        })
        .reduce((sum, wallet) => {
          const value = Number(wallet.balance ?? wallet.amount ?? wallet.current_balance ?? wallet.total ?? 0);
          return Number.isFinite(value) ? sum + value : sum;
        }, 0);
      const balance = walletBalance || won - spent;
      const playerNames = playerIds.map((playerId) => getPlayerName(playerId)).filter(Boolean);

      return {
        id: teamId,
        position: index + 1,
        name: teamRecord?.name || `Team ${index + 1}`,
        players: playerNames.length > 0 ? playerNames.join(" & ") : "Players pending",
        handicap: teamRecord?.combined_handicap ?? gameTeam.handicap ?? gameTeam.hcp ?? "-",
        score: currentResult?.gross ?? currentResult?.gross_score ?? currentResult?.score ?? "-",
        net: currentResult?.net ?? currentResult?.net_score ?? "-",
        holesWon,
        mulligansLeft: gameTeam.mulligans_left ?? gameTeam.mulligansAvailable ?? 5,
        reversesLeft: gameTeam.reverses_left ?? gameTeam.reverseMulligansAvailable ?? 2,
        spent,
        won,
        balance,
      };
    });
  }, [gameTeams, teams, players, gameInvites, holeResults, wallets, purchases, liveData]);

  const scoringRows = useMemo(() => {
    const strokeIndex = getStrokeIndex(liveData.currentHole);

    return teamRows.map((team) => {
      const existingGross = team.score !== "-" ? String(team.score) : "";
      const grossInput = grossScores[team.id] ?? existingGross;
      const grossNumber = grossInput === "" ? NaN : Number(grossInput);
      const strokesReceived = calculateStrokesReceived(team.handicap, strokeIndex);
      const calculatedNet = Number.isFinite(grossNumber) ? grossNumber - strokesReceived : null;

      return {
        ...team,
        grossInput,
        strokesReceived,
        calculatedNet,
      };
    });
  }, [teamRows, grossScores, liveData.currentHole]);

  useEffect(() => {
    setGrossScores({});
    setProvisionalResult(null);
    setSaveMessage("");
  }, [liveData.currentHoleNumber]);

  const calculateWinner = () => {
    const results: CalculatedTeamResult[] = [];

    for (const team of scoringRows) {
      const grossScore = Number(team.grossInput);

      if (team.grossInput === "" || !Number.isFinite(grossScore) || grossScore <= 0) {
        setProvisionalResult({ type: "error", message: "Enter a valid gross score for every team before calculating." });
        return;
      }

      results.push({
        teamId: team.id,
        name: team.name,
        grossScore,
        strokesReceived: team.strokesReceived,
        netScore: grossScore - team.strokesReceived,
      });
    }

    const bestNet = Math.min(...results.map((result) => result.netScore));
    const tiedTeams = results.filter((result) => result.netScore === bestNet);

    if (tiedTeams.length === 1) {
      setProvisionalResult({ type: "winner", winner: tiedTeams[0], results });
      return;
    }

    setProvisionalResult({ type: "tie", tiedTeams, results });
  };

  const insertHoleResultsWithFallback = async (rows: any[]) => {
    const variants = [
      rows,
      rows.map(({ result_type, is_tied, pot_value, ...row }) => row),
      rows.map(({ hole_id, result_type, is_tied, pot_value, strokes_received, ...row }) => row),
    ];

    let lastError: any = null;

    for (const variant of variants) {
      const { error: insertError } = await supabase.from("hole_results").insert(variant);

      if (!insertError) return;
      lastError = insertError;
    }

    throw lastError;
  };

  const confirmHole = async (mode: "winner" | "carry") => {
    if (!gameId || !provisionalResult || provisionalResult.type === "error") return;

    if (mode === "winner" && provisionalResult.type !== "winner") return;
    if (mode === "carry" && provisionalResult.type !== "tie") return;

    setSaving(true);
    setSaveMessage("");

    try {
      const winnerTeamId = provisionalResult.type === "winner" ? provisionalResult.winner.teamId : null;
      const nextHole = Math.min(18, liveData.currentHoleNumber + 1);
      const isFinalHole = liveData.currentHoleNumber >= 18;

      await supabase
        .from("hole_results")
        .delete()
        .eq("game_id", gameId)
        .eq("hole_number", liveData.currentHoleNumber);

      const rows = provisionalResult.results.map((result) => ({
        game_id: gameId,
        hole_id: liveData.currentHole.id?.startsWith?.("fallback-") ? null : liveData.currentHole.id,
        hole_number: liveData.currentHoleNumber,
        team_id: result.teamId,
        gross_score: result.grossScore,
        strokes_received: result.strokesReceived,
        net_score: result.netScore,
        is_winner: winnerTeamId === result.teamId,
        is_tied: provisionalResult.type === "tie",
        result_type: provisionalResult.type === "winner" ? "winner" : "carry",
        pot_value: liveData.currentPot,
      }));

      await insertHoleResultsWithFallback(rows);

      if (mode === "carry" && !isFinalHole) {
        await supabase
          .from("holes")
          .update({ carry_in: liveData.currentPot })
          .eq("game_id", gameId)
          .eq("hole_number", nextHole);
      }

      const { error: gameUpdateError } = await supabase
        .from("games")
        .update({ current_hole: nextHole, status: isFinalHole ? "completed" : game?.status ?? "draft" })
        .eq("id", gameId);

      if (gameUpdateError) throw gameUpdateError;

      setHoleResults((current) => [
        ...current.filter((result) => (result.hole_number ?? result.holeNumber ?? result.number) !== liveData.currentHoleNumber),
        ...rows,
      ]);
      setGame((current: any) => ({ ...current, current_hole: nextHole, status: isFinalHole ? "completed" : current?.status ?? "draft" }));
      setSaveMessage(mode === "winner" ? "Winner confirmed. Moving to next hole." : "Carry confirmed. Pot moves to next hole.");
      setGrossScores({});
      setProvisionalResult(null);
    } catch (confirmError: any) {
      setSaveMessage(`Could not confirm hole: ${confirmError?.message || "Unknown Supabase error"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading live match...</div>;
  if (error) return <div className="p-4 text-danger whitespace-pre-wrap">{error}</div>;

  const matchName = game?.name ?? game?.data?.name ?? game?.data?.title ?? "Skins por Hoyos - Villamartin";

  return (
    <div className="p-3 max-w-3xl mx-auto">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--gr-turf)]">
            <span className="live-dot" /> Live Hole
          </div>
          <h1 className="text-2xl font-black text-[var(--gr-sand)]">{matchName}</h1>
          <div className="text-xs text-[var(--gr-text-muted)] font-mono break-all">{gameId}</div>
        </div>
        <div className="rounded-full border border-[var(--gr-border)] px-3 py-2 text-xs font-bold text-[var(--gr-text-muted)]">
          {invite?.role || "player"}
        </div>
      </div>

      <section className="card mb-4 p-0 overflow-hidden">
        <div className="grid grid-cols-3 border-b border-[var(--gr-border)]">
          <div className="p-4">
            <div className="text-xs font-bold uppercase text-[var(--gr-text-muted)]">Hole</div>
            <div className="text-3xl font-black">{liveData.currentHoleNumber}<span className="text-base text-[var(--gr-text-muted)]"> / 18</span></div>
          </div>
          <div className="p-4 text-center border-x border-[var(--gr-border)]">
            <div className="text-xs font-bold uppercase text-[var(--gr-text-muted)]">Current Pot</div>
            <div className="text-3xl font-black text-[var(--gr-gold)]">€{liveData.currentPot.toFixed(0)}</div>
          </div>
          <div className="p-4 text-right">
            <div className="text-xs font-bold uppercase text-[var(--gr-text-muted)]">Par / SI</div>
            <div className="text-3xl font-black">{liveData.currentHole.par ?? "-"} / {getStrokeIndex(liveData.currentHole)}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 p-4 text-center text-xs sm:text-sm">
          <div>
            <div className="text-[var(--gr-text-muted)]">Hole Value</div>
            <div className="font-black text-[var(--gr-gold)]">€{liveData.baseValue.toFixed(0)}</div>
          </div>
          <div>
            <div className="text-[var(--gr-text-muted)]">Carried Over</div>
            <div className="font-black text-[var(--gr-warning)]">€{liveData.carryIn.toFixed(0)}</div>
          </div>
          <div>
            <div className="text-[var(--gr-text-muted)]">Added</div>
            <div className="font-black text-[var(--gr-turf)]">€{liveData.purchaseTotal.toFixed(0)}</div>
          </div>
          <div>
            <div className="text-[var(--gr-text-muted)]">Total Pot</div>
            <div className="font-black text-[var(--gr-gold)]">€{liveData.totalPot.toFixed(0)}</div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 mb-4">
        {scoringRows.map((team, index) => (
          <div key={team.id} className="card mb-0">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className={`team-badge team-${(index % 4) + 1}`}>{team.name}</span>
                <div className="mt-2 text-sm text-[var(--gr-text-muted)]">{team.players}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase text-[var(--gr-text-muted)]">Balance</div>
                <div className={Number(team.balance) < 0 ? "text-2xl font-black text-danger" : "text-2xl font-black text-success"}>
                  {formatMoney(Number(team.balance || 0))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4 text-center text-xs">
              <div className="rounded-xl border border-[var(--gr-border)] p-3">
                <label className="block text-[var(--gr-text-muted)]" htmlFor={`gross-${team.id}`}>Gross</label>
                <input
                  id={`gross-${team.id}`}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={team.grossInput}
                  onChange={(event) => {
                    setGrossScores((current) => ({ ...current, [team.id]: event.target.value }));
                    setProvisionalResult(null);
                    setSaveMessage("");
                  }}
                  className="mt-1 w-full rounded-xl border border-[var(--gr-border)] bg-transparent px-2 py-2 text-center text-xl font-black text-[var(--gr-sand)] outline-none"
                  placeholder="-"
                />
                <div className="mt-1 text-[var(--gr-gold)]">Net {team.calculatedNet ?? "-"}</div>
              </div>
              <div className="rounded-xl border border-[var(--gr-border)] p-3">
                <div className="text-[var(--gr-text-muted)]">Strokes</div>
                <div className="text-xl font-black">{team.strokesReceived}</div>
                <div className="text-[var(--gr-gold)]">HCP {team.handicap}</div>
              </div>
              <div className="rounded-xl border border-[var(--gr-border)] p-3">
                <div className="text-[var(--gr-text-muted)]">Mulligans</div>
                <div className="text-xl font-black">{team.mulligansLeft}</div>
              </div>
              <div className="rounded-xl border border-[var(--gr-border)] p-3">
                <div className="text-[var(--gr-text-muted)]">Reverses</div>
                <div className="text-xl font-black">{team.reversesLeft}</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--gr-text-muted)] mb-3">
              <span>Spent <b className="text-danger">€{Number(team.spent || 0).toFixed(0)}</b></span>
              <span>Won <b className="text-success">€{Number(team.won || 0).toFixed(0)}</b></span>
              <span>Previous <b className="text-[var(--gr-sand)]">{team.score} / {team.net}</b></span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-gold" type="button">Buy Mulligan</button>
              <button className="btn btn-secondary" type="button">Use Reverse</button>
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Actions</div>
            <div className="font-black">Calculate this hole</div>
          </div>
          <div className="text-right text-xs text-[var(--gr-text-muted)]">
            Economic impact: <span className="font-black text-[var(--gr-gold)]">€{liveData.currentPot.toFixed(0)}</span>
          </div>
        </div>

        {saveMessage && (
          <div className={`mb-3 rounded-2xl border border-[var(--gr-border)] p-3 text-sm font-bold ${saveMessage.startsWith("Could not") ? "text-danger" : "text-success"}`}>
            {saveMessage}
          </div>
        )}

        {provisionalResult && (
          <div className="mb-3 rounded-2xl border border-[var(--gr-border)] p-3 text-sm">
            {provisionalResult.type === "error" && (
              <div className="font-bold text-danger">{provisionalResult.message}</div>
            )}
            {provisionalResult.type === "winner" && (
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Provisional winner</div>
                <div className="text-xl font-black text-success">{provisionalResult.winner.name}</div>
                <div className="text-[var(--gr-text-muted)]">
                  Gross {provisionalResult.winner.grossScore} · Strokes {provisionalResult.winner.strokesReceived} · Net {provisionalResult.winner.netScore}
                </div>
              </div>
            )}
            {provisionalResult.type === "tie" && (
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Tie / Carry</div>
                <div className="text-xl font-black text-[var(--gr-warning)]">
                  {provisionalResult.tiedTeams.map((team) => team.name).join(" vs ")}
                </div>
                <div className="text-[var(--gr-text-muted)]">
                  Same best net: {provisionalResult.tiedTeams[0]?.netScore}. Push / Carry moves this pot to the next hole.
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-gold col-span-2" type="button" onClick={calculateWinner} disabled={saving}>Calculate Winner</button>
          <button className="btn btn-secondary" type="button" disabled={saving || !provisionalResult || provisionalResult.type !== "winner"} onClick={() => confirmHole("winner")}>Confirm Winner</button>
          <button className="btn btn-secondary" type="button" disabled={saving || !provisionalResult || provisionalResult.type !== "tie"} onClick={() => confirmHole("carry")}>Push / Carry</button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <Link href={`/game/${gameId}/scorecard`} className="btn btn-secondary">Scorecard</Link>
        <Link href={`/game/${gameId}/leaderboard`} className="btn btn-secondary">Leaderboard</Link>
        <Link href={`/game/${gameId}/summary`} className="btn btn-gold col-span-2">View Final Summary</Link>
      </div>
    </div>
  );
}
