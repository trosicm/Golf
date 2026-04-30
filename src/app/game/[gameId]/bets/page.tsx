"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import {
  getSideBetPresetsByCategory,
  SIDE_BET_CATEGORY_LABELS,
  SIDE_BET_CATEGORY_ORDER,
  SIDE_BET_PRESETS,
  type SideBetCategory,
} from "../../../../lib/golfrivals/sideBets";

const n = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const money = (value: number) => `${value > 0 ? "+" : value < 0 ? "-" : ""}€${Math.abs(value).toFixed(0)}`;
const teamIdOf = (row: any) => row?.team_id ?? row?.teamId ?? row?.id;
const playerIdOf = (row: any) => row?.player_id ?? row?.playerId;
const walletValue = (row: any) => n(row?.current_balance ?? row?.balance ?? row?.starting_balance ?? row?.total ?? row?.amount);
const betAmount = (row: any) => n(row?.amount ?? row?.stake ?? row?.value);
const betStatus = (row: any) => String(row?.status ?? "open").toLowerCase();

function teamPlayerIds(team: any) {
  return [team?.player_1_id, team?.player_2_id, team?.player1_id, team?.player2_id, team?.player_a_id, team?.player_b_id].filter(Boolean);
}
function playerName(player: any) {
  return player?.name ?? player?.display_name ?? player?.full_name ?? player?.nickname ?? player?.email ?? player?.id;
}

export default function BetsPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<Exclude<SideBetCategory, "quick"> | "quick">("quick");
  const [invite, setInvite] = useState<any>(null);
  const [gameTeams, setGameTeams] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [gameInvites, setGameInvites] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [bets, setBets] = useState<any[]>([]);
  const [betTransactions, setBetTransactions] = useState<any[]>([]);

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

    const baseQueries = await Promise.all([
      supabase.from("game_teams").select("*").eq("game_id", gameId),
      supabase.from("teams").select("*"),
      supabase.from("players").select("*"),
      supabase.from("game_invites").select("*").eq("game_id", gameId),
      supabase.from("game_player_wallets").select("*").eq("game_id", gameId),
    ]);

    const [gameTeamsRes, teamsRes, playersRes, invitesRes, walletsRes] = baseQueries;
    const failed = [["game_teams", gameTeamsRes], ["teams", teamsRes], ["players", playersRes], ["game_invites", invitesRes], ["game_player_wallets", walletsRes]].find(([, res]: any) => res.error);
    if (failed) {
      setError(`${failed[0]}: ${(failed[1] as any).error.message}`);
      setLoading(false);
      return;
    }

    setGameTeams(gameTeamsRes.data || []);
    setTeams(teamsRes.data || []);
    setPlayers(playersRes.data || []);
    setGameInvites(invitesRes.data || []);
    setWallets(walletsRes.data || []);

    const betsRes = await supabase.from("game_bets").select("*").eq("game_id", gameId);
    if (!betsRes.error) setBets(betsRes.data || []);

    const betTransactionsRes = await supabase.from("game_bet_transactions").select("*").eq("game_id", gameId);
    if (!betTransactionsRes.error) setBetTransactions(betTransactionsRes.data || []);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [gameId]);

  const isAdmin = String(invite?.role || "").toLowerCase() === "admin";

  const teamRows = useMemo(() => {
    return gameTeams.map((gameTeam, index) => {
      const teamId = teamIdOf(gameTeam);
      const team = teams.find((item) => item.id === teamId);
      const playerIds = teamPlayerIds(team);
      const fallbackIds = gameInvites.filter((item) => playerIdOf(item)).slice(index * 2, index * 2 + 2).map(playerIdOf).filter(Boolean);
      const resolvedPlayerIds = playerIds.length ? playerIds : fallbackIds;
      const playerNames = resolvedPlayerIds.map((id) => playerName(players.find((player) => player.id === id))).filter(Boolean);
      const baseFunds = wallets.filter((wallet) => teamIdOf(wallet) === teamId || resolvedPlayerIds.includes(playerIdOf(wallet))).reduce((sum, wallet) => sum + walletValue(wallet), 0);
      const betsNet = betTransactions.filter((row) => teamIdOf(row) === teamId).reduce((sum, row) => sum + n(row.amount ?? row.value), 0);
      return {
        id: teamId,
        name: team?.name || `Team ${index + 1}`,
        players: playerNames.length ? playerNames.join(" & ") : "Players pending",
        baseFunds,
        betsNet,
        bettingBalance: baseFunds + betsNet,
      };
    });
  }, [gameTeams, teams, players, gameInvites, wallets, betTransactions]);

  const openBets = bets.filter((bet) => betStatus(bet) === "open");
  const presetRows = getSideBetPresetsByCategory(activeCategory);
  const totalPresetCount = SIDE_BET_PRESETS.length;

  if (loading) return <div className="p-4 text-[var(--gr-sand)]">Loading bets...</div>;
  if (error) return <div className="p-4 text-danger whitespace-pre-wrap">{error}</div>;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--gr-turf)]"><span className="live-dot" /> Side Bets</div>
          <h1 className="text-3xl font-black text-[var(--gr-sand)]">BETS</h1>
          <div className="text-sm text-[var(--gr-text-muted)]">Independent side bets · separate from hole pots · {totalPresetCount} official presets</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={loadData}>Refresh</button>
          {isAdmin && <Link href={`/game/${gameId}/admin`} className="btn btn-gold">Admin</Link>}
        </div>
      </div>

      <section className="card mb-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-gold)]">Betting wallets</div>
            <div className="text-sm text-[var(--gr-text-muted)]">Bets affect team balance, not the hole pot.</div>
          </div>
          <div className="rounded-full bg-black px-4 py-2 text-sm font-black text-[var(--gr-sand)]">Open bets {openBets.length}</div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {teamRows.map((team) => (
            <div key={team.id} className="rounded-2xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.35)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-[var(--gr-sand)]">{team.name}</div>
                  <div className="text-xs text-[var(--gr-text-muted)]">{team.players}</div>
                </div>
                <div className={`text-right text-2xl font-black ${team.bettingBalance >= 0 ? "text-success" : "text-danger"}`}>{money(team.bettingBalance)}</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-xl border border-[var(--gr-border)] p-3"><div className="text-[var(--gr-text-muted)]">Base wallet</div><div className="font-black text-[var(--gr-sand)]">{money(team.baseFunds)}</div></div>
                <div className="rounded-xl border border-[var(--gr-border)] p-3"><div className="text-[var(--gr-text-muted)]">Bets net</div><div className={`font-black ${team.betsNet >= 0 ? "text-success" : "text-danger"}`}>{money(team.betsNet)}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card mb-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-gold)]">Create bet</div>
            <div className="text-sm text-[var(--gr-text-muted)]">Choose a preset. Creation and settlement come next.</div>
          </div>
          <div className="rounded-full border border-[var(--gr-border)] px-3 py-2 text-xs font-black text-[var(--gr-sand)]">{SIDE_BET_CATEGORY_LABELS[activeCategory]}</div>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {SIDE_BET_CATEGORY_ORDER.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase ${
                activeCategory === category
                  ? "border-[var(--gr-gold)] bg-[var(--gr-gold)] text-[var(--gr-carbon)]"
                  : "border-[var(--gr-border)] text-[var(--gr-text-muted)]"
              }`}
            >
              {SIDE_BET_CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {presetRows.map((preset) => (
            <button
              key={preset.type}
              type="button"
              className="rounded-2xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.32)] p-4 text-left transition hover:border-[var(--gr-gold)] hover:bg-[rgba(20,68,55,0.55)]"
              onClick={() => alert(`Next step: create ${preset.title}`)}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="text-lg font-black text-[var(--gr-sand)]">{preset.title}</div>
                {preset.isQuick && <span className="rounded-full bg-[var(--gr-gold)] px-2 py-1 text-[10px] font-black uppercase text-[var(--gr-carbon)]">Quick</span>}
              </div>
              <div className="text-sm text-[var(--gr-text-muted)]">{preset.description}</div>
              <div className="mt-3 flex gap-2 text-[10px] font-black uppercase tracking-wide">
                <span className="rounded-full border border-[var(--gr-border)] px-2 py-1 text-[var(--gr-gold)]">{preset.category}</span>
                <span className="rounded-full border border-[var(--gr-border)] px-2 py-1 text-[var(--gr-text-muted)]">{preset.scope}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="card mb-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-gold)]">Open bets</div>
            <div className="text-sm text-[var(--gr-text-muted)]">Active bets will be stored in Supabase.</div>
          </div>
        </div>
        {openBets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--gr-border)] p-5 text-center text-[var(--gr-text-muted)]">
            No active bets yet. Next step: create the Supabase tables and creation modal.
          </div>
        ) : (
          <div className="space-y-2">
            {openBets.map((bet) => (
              <div key={bet.id} className="rounded-2xl border border-[var(--gr-border)] p-4">
                <div className="font-black text-[var(--gr-sand)]">{bet.title || bet.type || "Side bet"}</div>
                <div className="text-sm text-[var(--gr-text-muted)]">Stake {money(betAmount(bet))} · {betStatus(bet)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
