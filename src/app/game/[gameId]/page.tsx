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
  const [error, setError] = useState("");
  const [invite, setInvite] = useState<any>(null);
  const [game, setGame] = useState<any>(null);
  const [holes, setHoles] = useState<any[]>([]);
  const [gameTeams, setGameTeams] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [holeResults, setHoleResults] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
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

      const [gameRes, holesRes, gameTeamsRes, teamsRes, playersRes, holeResultsRes, walletsRes, purchasesRes] = await Promise.all([
        supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
        supabase.from("holes").select("*").eq("game_id", gameId),
        supabase.from("game_teams").select("*").eq("game_id", gameId),
        supabase.from("teams").select("*"),
        supabase.from("players").select("*"),
        supabase.from("hole_results").select("*").eq("game_id", gameId),
        supabase.from("game_player_wallets").select("*").eq("game_id", gameId),
        supabase.from("purchases").select("*").eq("game_id", gameId),
      ]);

      const results: QueryResult[] = [
        { name: "holes", data: holesRes.data || [], error: holesRes.error },
        { name: "game_teams", data: gameTeamsRes.data || [], error: gameTeamsRes.error },
        { name: "teams", data: teamsRes.data || [], error: teamsRes.error },
        { name: "players", data: playersRes.data || [], error: playersRes.error },
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
      setHoleResults(holeResultsRes.data || []);
      setWallets(walletsRes.data || []);
      setPurchases(purchasesRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [gameId, router]);

  const liveData = useMemo(() => {
    const playedHoleNumbers = new Set(
      holeResults
        .map((result) => result.hole_number ?? result.holeNumber ?? result.number)
        .filter((value) => typeof value === "number"),
    );

    const currentHole = holes.find((hole) => !playedHoleNumbers.has(getHoleNumber(hole))) || holes[0] || DEFAULT_HOLES[0];
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
  }, [holes, holeResults, purchases]);

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

    const getTeamName = (teamId: string) => teams.find((team) => team.id === teamId)?.name || teamId;
    const getPlayerName = (playerId: string) => players.find((player) => player.id === playerId)?.name || playerId;

    return gameTeams.map((gameTeam, index) => {
      const teamId = getTeamId(gameTeam);
      const playerIds = getPlayerIds(gameTeam);
      const teamResults = holeResults.filter((result) => (result.team_id ?? result.teamId) === teamId);
      const currentResult = teamResults.find((result) => {
        const resultHoleNumber = result.hole_number ?? result.holeNumber ?? result.number;
        const resultHoleId = result.hole_id ?? result.holeId;
        return resultHoleNumber === liveData.currentHoleNumber || resultHoleId === liveData.currentHole.id;
      });
      const holesWon = teamResults.filter((result) => result.is_winner || result.winner || result.winner_team_id === teamId).length;
      const teamPurchases = purchases.filter((purchase) => (purchase.team_id ?? purchase.teamId) === teamId);
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

      return {
        id: teamId,
        position: index + 1,
        name: getTeamName(teamId),
        players: playerIds.map((playerId) => getPlayerName(playerId)).join(" & ") || "Players pending",
        handicap: gameTeam.handicap ?? gameTeam.hcp ?? "-",
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
  }, [gameTeams, teams, players, holeResults, wallets, purchases, liveData]);

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
        {teamRows.map((team, index) => (
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
                <div className="text-[var(--gr-text-muted)]">Score</div>
                <div className="text-xl font-black">{team.score}</div>
                <div className="text-[var(--gr-gold)]">Net {team.net}</div>
              </div>
              <div className="rounded-xl border border-[var(--gr-border)] p-3">
                <div className="text-[var(--gr-text-muted)]">Won</div>
                <div className="text-xl font-black text-success">{team.holesWon}</div>
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
              <span>HCP <b className="text-[var(--gr-sand)]">{team.handicap}</b></span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-gold" type="button">Buy Mulligan</button>
              <button className="btn btn-secondary" type="button">Use Reverse</button>
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Actions</div>
            <div className="font-black">Confirm this hole</div>
          </div>
          <div className="text-right text-xs text-[var(--gr-text-muted)]">
            Economic impact: <span className="font-black text-[var(--gr-gold)]">€{liveData.currentPot.toFixed(0)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-secondary" type="button">Mark Winner</button>
          <button className="btn btn-secondary" type="button">Push / Carry</button>
          <button className="btn btn-gold col-span-2" type="button">Confirm Result</button>
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
