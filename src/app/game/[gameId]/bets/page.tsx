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
  type SideBetPreset,
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
const betTeamIds = (bet: any): string[] => Array.isArray(bet?.target_team_ids) ? bet.target_team_ids : [];

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeCategory, setActiveCategory] = useState<Exclude<SideBetCategory, "quick"> | "quick">("quick");
  const [selectedPreset, setSelectedPreset] = useState<SideBetPreset | null>(null);
  const [selectedHole, setSelectedHole] = useState("1");
  const [stake, setStake] = useState("20");
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [invite, setInvite] = useState<any>(null);
  const [game, setGame] = useState<any>(null);
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
    const { data: invites, error: inviteError } = await supabase.from("game_invites").select("*").ilike("email", email).eq("game_id", gameId).limit(1);
    if (inviteError) { setError(`Could not check invitation: ${inviteError.message}`); setLoading(false); return; }
    const inviteRow = invites?.[0];
    setInvite(inviteRow);
    if (!inviteRow) { setError(`You are not invited to this match. Email: ${email}`); setLoading(false); return; }

    const [gameRes, gameTeamsRes, teamsRes, playersRes, invitesRes, walletsRes] = await Promise.all([
      supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
      supabase.from("game_teams").select("*").eq("game_id", gameId),
      supabase.from("teams").select("*"),
      supabase.from("players").select("*"),
      supabase.from("game_invites").select("*").eq("game_id", gameId),
      supabase.from("game_player_wallets").select("*").eq("game_id", gameId),
    ]);

    const failed = [["games", gameRes], ["game_teams", gameTeamsRes], ["teams", teamsRes], ["players", playersRes], ["game_invites", invitesRes], ["game_player_wallets", walletsRes]].find(([, res]: any) => res.error);
    if (failed) { setError(`${failed[0]}: ${(failed[1] as any).error.message}`); setLoading(false); return; }

    setGame(gameRes.data);
    setGameTeams(gameTeamsRes.data || []);
    setTeams(teamsRes.data || []);
    setPlayers(playersRes.data || []);
    setGameInvites(invitesRes.data || []);
    setWallets(walletsRes.data || []);

    const betsRes = await supabase.from("game_bets").select("*").eq("game_id", gameId).order("created_at", { ascending: false });
    if (!betsRes.error) setBets(betsRes.data || []);
    const betTransactionsRes = await supabase.from("game_bet_transactions").select("*").eq("game_id", gameId);
    if (!betTransactionsRes.error) setBetTransactions(betTransactionsRes.data || []);

    setLoading(false);
  };

  useEffect(() => { loadData(); }, [gameId]);

  const isAdmin = String(invite?.role || "").toLowerCase() === "admin";
  const currentHole = Math.min(18, Math.max(1, n(game?.current_hole, 1)));
  const selectableHoles = useMemo(() => Array.from({ length: 19 - currentHole }, (_, index) => currentHole + index), [currentHole]);

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
      return { id: teamId, name: team?.name || `Team ${index + 1}`, players: playerNames.length ? playerNames.join(" & ") : "Players pending", baseFunds, betsNet, bettingBalance: baseFunds + betsNet };
    });
  }, [gameTeams, teams, players, gameInvites, wallets, betTransactions]);

  const teamName = (teamId: string) => teamRows.find((team) => team.id === teamId)?.name || "Unknown team";
  const openBets = bets.filter((bet) => betStatus(bet) === "open");
  const resolvedBets = bets.filter((bet) => betStatus(bet) === "resolved");
  const presetRows = getSideBetPresetsByCategory(activeCategory);
  const totalPresetCount = SIDE_BET_PRESETS.length;

  const openDrawer = (preset: SideBetPreset) => {
    setSelectedPreset(preset);
    setSelectedHole(String(currentHole));
    setStake("20");
    setCustomTitle(preset.type === "CUSTOM_BET" ? "" : preset.title);
    setCustomDescription(preset.type === "CUSTOM_BET" ? "" : preset.description);
    setSelectedTeamIds(teamRows.map((team) => team.id).filter(Boolean));
    setMessage("");
    setError("");
  };

  const toggleTeam = (teamId: string) => setSelectedTeamIds((current) => current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId]);

  const createBet = async () => {
    if (!gameId || !selectedPreset) return;
    const amount = Number(stake);
    const chosenHole = Number(selectedHole);
    if (!Number.isFinite(amount) || amount <= 0) { setError("Stake must be greater than 0."); return; }
    if (selectedPreset.scope === "hole" && (!Number.isFinite(chosenHole) || chosenHole < currentHole || chosenHole > 18)) {
      setError(`Choose hole ${currentHole} or a future hole. Past holes cannot receive new bets.`);
      return;
    }
    if (selectedTeamIds.length < 2) { setError("Choose at least 2 teams for the bet."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const title = selectedPreset.type === "CUSTOM_BET" ? customTitle.trim() || "Apuesta libre" : selectedPreset.title;
      const description = selectedPreset.type === "CUSTOM_BET" ? customDescription.trim() || "Custom side bet" : selectedPreset.description;
      const holeNumber = selectedPreset.scope === "hole" ? chosenHole : null;
      const betPayload = { game_id: gameId, hole_number: holeNumber, scope: selectedPreset.scope, category: selectedPreset.category, type: selectedPreset.type, title, description, created_by_team_id: null, created_by_player_id: playerIdOf(invite) || null, target_type: selectedTeamIds.length === teamRows.length ? "all" : "multiple_teams", target_team_ids: selectedTeamIds, amount, currency: "EUR", status: "open", accepted_by_team_ids: selectedTeamIds, declined_by_team_ids: [], loser_team_ids: [], resolution_mode: "manual", is_quick_bet: selectedPreset.isQuick, is_custom: selectedPreset.type === "CUSTOM_BET", requires_manual_resolution: true };
      const { data: betData, error: betError } = await supabase.from("game_bets").insert(betPayload).select("*").single();
      if (betError) throw betError;
      const participantRows = selectedTeamIds.map((teamId) => ({ game_id: gameId, bet_id: betData.id, team_id: teamId, role: "participant", status: "accepted" }));
      const { error: participantsError } = await supabase.from("game_bet_participants").insert(participantRows);
      if (participantsError) throw participantsError;
      setMessage(`Bet created: ${title} · €${amount.toFixed(0)}${holeNumber ? ` · Hole ${holeNumber}` : ""}`);
      setSelectedPreset(null);
      await loadData();
    } catch (err: any) { setError(`Could not create bet: ${err?.message || "Unknown Supabase error"}`); } finally { setSaving(false); }
  };

  const settleBet = async (bet: any, winnerTeamId: string | null) => {
    if (!gameId || !isAdmin) return;
    const participants = betTeamIds(bet);
    if (!participants.length) { setError("This bet has no teams assigned."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      if (!winnerTeamId) {
        const { error: cancelError } = await supabase.from("game_bets").update({ status: "cancelled", result_notes: "Cancelled / pushed", resolved_at: new Date().toISOString() }).eq("id", bet.id);
        if (cancelError) throw cancelError;
        setMessage(`Bet cancelled: ${bet.title}`);
        await loadData();
        return;
      }
      const losers = participants.filter((teamId) => teamId !== winnerTeamId);
      const amount = betAmount(bet);
      const transactionRows = [
        { game_id: gameId, bet_id: bet.id, team_id: winnerTeamId, amount: amount * losers.length, reason: `Won side bet: ${bet.title}` },
        ...losers.map((teamId) => ({ game_id: gameId, bet_id: bet.id, team_id: teamId, amount: -amount, reason: `Lost side bet: ${bet.title}` })),
      ];
      const { error: txError } = await supabase.from("game_bet_transactions").insert(transactionRows);
      if (txError) throw txError;
      const { error: betError } = await supabase.from("game_bets").update({ status: "resolved", winner_team_id: winnerTeamId, loser_team_ids: losers, result_notes: `Winner: ${teamName(winnerTeamId)}`, resolved_at: new Date().toISOString() }).eq("id", bet.id);
      if (betError) throw betError;
      setMessage(`Resolved: ${bet.title} · winner ${teamName(winnerTeamId)}`);
      await loadData();
    } catch (err: any) { setError(`Could not resolve bet: ${err?.message || "Unknown Supabase error"}`); } finally { setSaving(false); }
  };

  if (loading) return <div className="p-4 text-[var(--gr-sand)]">Loading bets...</div>;
  if (error && !selectedPreset) return <div className="p-4 text-danger whitespace-pre-wrap">{error}</div>;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--gr-turf)]"><span className="live-dot" /> Side Bets</div><h1 className="text-3xl font-black text-[var(--gr-sand)]">BETS</h1><div className="text-sm text-[var(--gr-text-muted)]">Independent side bets · current hole {currentHole} · {totalPresetCount} official presets</div></div><div className="flex gap-2"><button className="btn btn-secondary" onClick={loadData}>Refresh</button>{isAdmin && <Link href={`/game/${gameId}/admin`} className="btn btn-gold">Admin</Link>}</div></div>
      {message && <div className="mb-4 rounded-xl border border-[var(--gr-turf)] bg-[rgba(95,163,106,0.12)] p-3 text-sm text-[var(--gr-sand)]">{message}</div>}
      {error && <div className="mb-4 rounded-xl border border-[var(--gr-danger)] bg-[rgba(201,92,74,0.12)] p-3 text-sm text-danger">{error}</div>}

      <section className="card mb-4"><div className="mb-3 flex items-center justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-gold)]">Betting wallets</div><div className="text-sm text-[var(--gr-text-muted)]">Bets affect team balance, not the hole pot.</div></div><div className="rounded-full bg-black px-4 py-2 text-sm font-black text-[var(--gr-sand)]">Open bets {openBets.length}</div></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{teamRows.map((team) => <div key={team.id} className="rounded-2xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.35)] p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-lg font-black text-[var(--gr-sand)]">{team.name}</div><div className="text-xs text-[var(--gr-text-muted)]">{team.players}</div></div><div className={`text-right text-2xl font-black ${team.bettingBalance >= 0 ? "text-success" : "text-danger"}`}>{money(team.bettingBalance)}</div></div><div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs"><div className="rounded-xl border border-[var(--gr-border)] p-3"><div className="text-[var(--gr-text-muted)]">Base wallet</div><div className="font-black text-[var(--gr-sand)]">{money(team.baseFunds)}</div></div><div className="rounded-xl border border-[var(--gr-border)] p-3"><div className="text-[var(--gr-text-muted)]">Bets net</div><div className={`font-black ${team.betsNet >= 0 ? "text-success" : "text-danger"}`}>{money(team.betsNet)}</div></div></div></div>)}</div></section>

      <section className="card mb-4"><div className="mb-4 flex items-center justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-gold)]">Create bet</div><div className="text-sm text-[var(--gr-text-muted)]">Hole bets can only be created for the current hole or future holes.</div></div><div className="rounded-full border border-[var(--gr-border)] px-3 py-2 text-xs font-black text-[var(--gr-sand)]">{SIDE_BET_CATEGORY_LABELS[activeCategory]}</div></div><div className="mb-4 flex gap-2 overflow-x-auto pb-1">{SIDE_BET_CATEGORY_ORDER.map((category) => <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase ${activeCategory === category ? "border-[var(--gr-gold)] bg-[var(--gr-gold)] text-[var(--gr-carbon)]" : "border-[var(--gr-border)] text-[var(--gr-text-muted)]"}`}>{SIDE_BET_CATEGORY_LABELS[category]}</button>)}</div><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{presetRows.map((preset) => <button key={preset.type} type="button" className="rounded-2xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.32)] p-4 text-left transition hover:border-[var(--gr-gold)] hover:bg-[rgba(20,68,55,0.55)]" onClick={() => openDrawer(preset)}><div className="mb-2 flex items-start justify-between gap-3"><div className="text-lg font-black text-[var(--gr-sand)]">{preset.title}</div>{preset.isQuick && <span className="rounded-full bg-[var(--gr-gold)] px-2 py-1 text-[10px] font-black uppercase text-[var(--gr-carbon)]">Quick</span>}</div><div className="text-sm text-[var(--gr-text-muted)]">{preset.description}</div><div className="mt-3 flex gap-2 text-[10px] font-black uppercase tracking-wide"><span className="rounded-full border border-[var(--gr-border)] px-2 py-1 text-[var(--gr-gold)]">{preset.category}</span><span className="rounded-full border border-[var(--gr-border)] px-2 py-1 text-[var(--gr-text-muted)]">{preset.scope === "hole" ? `hole ${currentHole}+` : preset.scope}</span></div></button>)}</div></section>

      <section className="card mb-4"><div className="mb-3"><div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-gold)]">Open bets</div><div className="text-sm text-[var(--gr-text-muted)]">Select winner to settle and update BETS balance.</div></div>{openBets.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--gr-border)] p-5 text-center text-[var(--gr-text-muted)]">No active bets yet.</div> : <div className="space-y-3">{openBets.map((bet) => <div key={bet.id} className="rounded-2xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.25)] p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="font-black text-[var(--gr-sand)]">{bet.title || bet.type || "Side bet"}</div><div className="text-sm text-[var(--gr-text-muted)]">Stake {money(betAmount(bet))} · {bet.scope}{bet.hole_number ? ` · Hole ${bet.hole_number}` : ""} · {betStatus(bet)}</div></div>{isAdmin && <button className="rounded-full border border-[var(--gr-border)] px-3 py-2 text-xs font-black text-danger" disabled={saving} onClick={() => settleBet(bet, null)}>Cancel / Push</button>}</div>{isAdmin && <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{betTeamIds(bet).map((teamId) => <button key={teamId} className="rounded-2xl border border-[var(--gr-border)] bg-[rgba(95,163,106,0.14)] p-3 text-left font-black text-success" disabled={saving} onClick={() => settleBet(bet, teamId)}>Winner: {teamName(teamId)}</button>)}</div>}</div>)}</div>}</section>

      {resolvedBets.length > 0 && <section className="card mb-4"><div className="mb-3"><div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-gold)]">Resolved bets</div></div><div className="space-y-2">{resolvedBets.slice(0, 8).map((bet) => <div key={bet.id} className="rounded-2xl border border-[var(--gr-border)] p-3"><div className="font-black text-[var(--gr-sand)]">{bet.title}</div><div className="text-xs text-[var(--gr-text-muted)]">Winner: {bet.winner_team_id ? teamName(bet.winner_team_id) : "-"} · {money(betAmount(bet))}</div></div>)}</div></section>}

      {selectedPreset && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"><div className="w-full max-w-lg rounded-3xl border border-[var(--gr-border)] bg-[var(--gr-carbon)] p-4 shadow-2xl"><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-gold)]">Create side bet</div><div className="text-2xl font-black text-[var(--gr-sand)]">{selectedPreset.title}</div><div className="text-sm text-[var(--gr-text-muted)]">{selectedPreset.description}</div></div><button className="rounded-full border border-[var(--gr-border)] px-3 py-2 text-sm font-bold" type="button" onClick={() => setSelectedPreset(null)}>Close</button></div>{error && <div className="mb-3 rounded-xl border border-[var(--gr-danger)] bg-[rgba(201,92,74,0.12)] p-3 text-sm text-danger">{error}</div>}<div className="space-y-3">{selectedPreset.scope === "hole" && <div><label className="mb-1 block text-xs font-black uppercase text-[var(--gr-text-muted)]">Hole</label><select className="w-full rounded-2xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.35)] px-4 py-3 text-xl font-black text-[var(--gr-sand)] outline-none" value={selectedHole} onChange={(event) => setSelectedHole(event.target.value)}>{selectableHoles.map((hole) => <option key={hole} value={hole}>Hole {hole}{hole === currentHole ? " · current" : ""}</option>)}</select><div className="mt-1 text-xs text-[var(--gr-text-muted)]">Past holes are locked. You can only bet on hole {currentHole} or later.</div></div>}<div><label className="mb-1 block text-xs font-black uppercase text-[var(--gr-text-muted)]">Stake per losing team</label><input className="w-full rounded-2xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.35)] px-4 py-3 text-xl font-black text-[var(--gr-sand)] outline-none" type="number" inputMode="numeric" value={stake} onChange={(event) => setStake(event.target.value)} /></div>{selectedPreset.type === "CUSTOM_BET" && <><div><label className="mb-1 block text-xs font-black uppercase text-[var(--gr-text-muted)]">Title</label><input className="w-full rounded-2xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.35)] px-4 py-3 text-[var(--gr-sand)] outline-none" value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} placeholder="Example: Liam no puede pegar draw" /></div><div><label className="mb-1 block text-xs font-black uppercase text-[var(--gr-text-muted)]">Condition</label><textarea className="min-h-24 w-full rounded-2xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.35)] px-4 py-3 text-[var(--gr-sand)] outline-none" value={customDescription} onChange={(event) => setCustomDescription(event.target.value)} placeholder="Write the bet condition" /></div></>}<div><div className="mb-2 text-xs font-black uppercase text-[var(--gr-text-muted)]">Teams involved</div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{teamRows.map((team) => <button key={team.id} type="button" onClick={() => toggleTeam(team.id)} className={`rounded-2xl border p-3 text-left ${selectedTeamIds.includes(team.id) ? "border-[var(--gr-gold)] bg-[rgba(212,174,96,0.16)]" : "border-[var(--gr-border)] bg-[rgba(20,68,55,0.25)]"}`}><div className="font-black text-[var(--gr-sand)]">{team.name}</div><div className="text-xs text-[var(--gr-text-muted)]">{team.players}</div></button>)}</div></div><button type="button" className="btn btn-gold w-full" disabled={saving} onClick={createBet}>{saving ? "Creating..." : "Create bet"}</button></div></div></div>}
    </div>
  );
}
