"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

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

type QueryResult = { name: string; data: any[]; error: any };
type WalletDrafts = Record<string, string>;
type HoleDrafts = Record<string, { par: string; strokeIndex: string; value: string }>;

function formatMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}€${Math.abs(value).toFixed(0)}`;
}
function getHoleNumber(hole: any) { return hole.hole_number ?? hole.number ?? hole.hole ?? 0; }
function getStrokeIndex(hole: any) { return hole.stroke_index ?? hole.strokeIndex ?? hole.si ?? ""; }
function getHoleValue(hole: any) { return Number(hole.price ?? hole.value ?? hole.hole_value ?? hole.base_value ?? hole.baseValue ?? 0); }
function getPlayerDisplayName(player: any, invite?: any) { return player?.name ?? player?.display_name ?? player?.full_name ?? player?.nickname ?? invite?.name ?? invite?.email ?? player?.email ?? player?.id ?? "Player"; }
function getWalletBalance(wallet: any) { return Number(wallet?.current_balance ?? wallet?.balance ?? wallet?.total ?? 0); }
function mergeHolesWithDefaults(holes: any[]) { return DEFAULT_HOLES.map((defaultHole) => { const savedHole = holes.find((hole) => getHoleNumber(hole) === defaultHole.hole_number); return savedHole ? { ...defaultHole, ...savedHole } : defaultHole; }); }
function createWalletPatch(wallet: any, amount: number) {
  const patch: Record<string, number> = {};
  if ("current_balance" in wallet) patch.current_balance = amount;
  if ("balance" in wallet) patch.balance = amount;
  if ("total" in wallet) patch.total = amount;
  if (Object.keys(patch).length === 0) patch.balance = amount;
  return patch;
}
function createHolePatch(hole: any, draft: { par: string; strokeIndex: string; value: string }) {
  const patch: Record<string, number> = {};
  const par = Number(draft.par);
  const strokeIndex = Number(draft.strokeIndex);
  const value = Number(draft.value);
  if (Number.isFinite(par)) patch.par = par;
  if ("stroke_index" in hole && Number.isFinite(strokeIndex)) patch.stroke_index = strokeIndex;
  if ("strokeIndex" in hole && Number.isFinite(strokeIndex)) patch.strokeIndex = strokeIndex;
  if ("si" in hole && Number.isFinite(strokeIndex)) patch.si = strokeIndex;
  if (!("stroke_index" in hole) && !("strokeIndex" in hole) && !("si" in hole) && Number.isFinite(strokeIndex)) patch.stroke_index = strokeIndex;
  if ("base_value" in hole && Number.isFinite(value)) patch.base_value = value;
  if ("baseValue" in hole && Number.isFinite(value)) patch.baseValue = value;
  if ("hole_value" in hole && Number.isFinite(value)) patch.hole_value = value;
  if ("price" in hole && Number.isFinite(value)) patch.price = value;
  if ("value" in hole && Number.isFinite(value)) patch.value = value;
  return patch;
}

export default function AdminPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [warning, setWarning] = useState("");
  const [invite, setInvite] = useState<any>(null);
  const [game, setGame] = useState<any>(null);
  const [gameInvites, setGameInvites] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [holes, setHoles] = useState<any[]>([]);
  const [gameTeams, setGameTeams] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [walletDrafts, setWalletDrafts] = useState<WalletDrafts>({});
  const [holeDrafts, setHoleDrafts] = useState<HoleDrafts>({});
  const [matchName, setMatchName] = useState("Skins por Hoyos - Villamartin");
  const [matchStatus, setMatchStatus] = useState("in-progress");

  const loadData = async () => {
    setLoading(true); setError(""); setSuccess(""); setWarning("");
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) { router.push("/auth/login"); return; }
    const email = (userData.user.email || "").trim().toLowerCase();
    const { data: invites, error: inviteError } = await supabase.from("game_invites").select("*").ilike("email", email).eq("game_id", gameId).limit(1);
    const inviteRow = invites?.[0]; setInvite(inviteRow);
    if (inviteError) { setError(`Could not check admin access: ${inviteError.message}`); setLoading(false); return; }
    if (!inviteRow) { setError(`You are not invited to this match. Email: ${email}`); setLoading(false); return; }
    if ((inviteRow.role || "").toLowerCase() !== "admin") { setError("Admin access required for this panel."); setLoading(false); return; }

    const [gameRes, allInvitesRes, playersRes, walletsRes, holesRes, gameTeamsRes, teamsRes] = await Promise.all([
      supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
      supabase.from("game_invites").select("*").eq("game_id", gameId),
      supabase.from("players").select("*"),
      supabase.from("game_player_wallets").select("*").eq("game_id", gameId),
      supabase.from("holes").select("*").eq("game_id", gameId),
      supabase.from("game_teams").select("*").eq("game_id", gameId),
      supabase.from("teams").select("*"),
    ]);
    if (gameRes.error) { setError(`games: ${gameRes.error.message}`); setLoading(false); return; }
    const results: QueryResult[] = [
      { name: "game_invites", data: allInvitesRes.data || [], error: allInvitesRes.error }, { name: "players", data: playersRes.data || [], error: playersRes.error },
      { name: "game_player_wallets", data: walletsRes.data || [], error: walletsRes.error }, { name: "holes", data: holesRes.data || [], error: holesRes.error },
      { name: "game_teams", data: gameTeamsRes.data || [], error: gameTeamsRes.error }, { name: "teams", data: teamsRes.data || [], error: teamsRes.error },
    ];
    const failed = results.find((result) => result.error);
    if (failed) { setError(`${failed.name}: ${failed.error.message}`); setLoading(false); return; }

    const loadedGame = gameRes.data;
    const loadedInvites = allInvitesRes.data || [];
    const loadedPlayers = playersRes.data || [];
    const loadedWallets = walletsRes.data || [];
    const loadedHoles = mergeHolesWithDefaults(holesRes.data || []).sort((a, b) => getHoleNumber(a) - getHoleNumber(b));
    setGame(loadedGame); setGameInvites(loadedInvites); setPlayers(loadedPlayers); setWallets(loadedWallets); setHoles(loadedHoles); setGameTeams(gameTeamsRes.data || []); setTeams(teamsRes.data || []);
    setMatchName(loadedGame?.name ?? loadedGame?.data?.name ?? loadedGame?.data?.title ?? "Skins por Hoyos - Villamartin");
    setMatchStatus(loadedGame?.status ?? "in-progress");

    const nextWalletDrafts: WalletDrafts = {};
    loadedInvites.forEach((gameInvite: any) => {
      const playerId = gameInvite.player_id ?? gameInvite.playerId;
      if (!playerId || nextWalletDrafts[playerId] !== undefined) return;
      const wallet = loadedWallets.find((item: any) => (item.player_id ?? item.playerId) === playerId);
      nextWalletDrafts[playerId] = String(getWalletBalance(wallet));
    });
    setWalletDrafts(nextWalletDrafts);

    const nextHoleDrafts: HoleDrafts = {};
    loadedHoles.forEach((hole: any) => {
      const holeNumber = getHoleNumber(hole);
      nextHoleDrafts[String(holeNumber)] = { par: String(hole.par ?? ""), strokeIndex: String(getStrokeIndex(hole) ?? ""), value: String(getHoleValue(hole)) };
    });
    setHoleDrafts(nextHoleDrafts);
    if (loadedInvites.length <= 1) setWarning("Only your invite is visible. If other players do not appear, Supabase RLS must allow admins to read all invites for this match.");
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [gameId]);

  const playerRows = useMemo(() => {
    const seenPlayerIds = new Set<string>();
    const inviteRows = gameInvites.filter((gameInvite) => gameInvite.player_id || gameInvite.playerId).map((gameInvite, index) => {
      const playerId = gameInvite.player_id ?? gameInvite.playerId;
      const player = players.find((item) => item.id === playerId);
      const wallet = wallets.find((item) => (item.player_id ?? item.playerId) === playerId);
      const teamIndex = Math.floor(index / 2);
      const gameTeam = gameTeams[teamIndex];
      const teamId = gameInvite.team_id ?? gameInvite.teamId ?? gameTeam?.team_id ?? gameTeam?.teamId;
      const teamName = teams.find((team) => team.id === teamId)?.name ?? `Team ${teamIndex + 1}`;
      return { id: playerId, rowKey: `${playerId}-${String(gameInvite.email || index).toLowerCase()}`, email: gameInvite.email, role: gameInvite.role || "player", name: getPlayerDisplayName(player, gameInvite), teamName, wallet, balance: getWalletBalance(wallet) };
    }).filter((row) => { if (seenPlayerIds.has(row.id)) return false; seenPlayerIds.add(row.id); return true; });
    if (inviteRows.length > 0) return inviteRows;
    return players.map((player, index) => { const wallet = wallets.find((item) => (item.player_id ?? item.playerId) === player.id); return { id: player.id, rowKey: `${player.id}-${index}`, email: player.email || "", role: "player", name: getPlayerDisplayName(player), teamName: `Team ${Math.floor(index / 2) + 1}`, wallet, balance: getWalletBalance(wallet) }; });
  }, [gameInvites, players, wallets, gameTeams, teams]);

  const totalWalletBalance = playerRows.reduce((sum, player) => sum + Number(walletDrafts[player.id] ?? player.balance ?? 0), 0);
  const totalHoleValue = holes.reduce((sum, hole) => sum + getHoleValue(hole), 0);

  const saveMatchSettings = async () => {
    setSaving(true); setError(""); setSuccess("");
    const nextData = { ...(game?.data || {}), name: matchName, title: matchName };
    const { error: updateError } = await supabase.from("games").update({ data: nextData, status: matchStatus }).eq("id", gameId);
    if (updateError) { setError(`Could not update match: ${updateError.message}`); setSaving(false); return; }
    setSuccess("Match settings updated."); setSaving(false); await loadData();
  };

  const saveWallet = async (playerId: string, amountOverride?: number) => {
    const amount = Number(amountOverride ?? walletDrafts[playerId] ?? 0);
    if (!Number.isFinite(amount)) { setError("Invalid wallet amount."); return; }
    setSaving(true); setError(""); setSuccess("");
    const wallet = wallets.find((item) => (item.player_id ?? item.playerId) === playerId);
    if (wallet?.id) {
      const patch = createWalletPatch(wallet, amount);
      const { error: updateError } = await supabase.from("game_player_wallets").update(patch).eq("id", wallet.id);
      if (updateError) { setError(`Could not update wallet: ${updateError.message}`); setSaving(false); return; }
    } else {
      const insertAttempts = [
        { game_id: gameId, player_id: playerId, current_balance: amount },
        { game_id: gameId, player_id: playerId, balance: amount },
        { game_id: gameId, player_id: playerId, total: amount },
        { game_id: gameId, player_id: playerId, current_balance: amount, starting_balance: 0 },
        { game_id: gameId, player_id: playerId, balance: amount, starting_balance: 0 },
      ];
      let insertError: any = null;
      let inserted = false;
      for (const payload of insertAttempts) {
        const { error: attemptError } = await supabase.from("game_player_wallets").insert(payload);
        if (!attemptError) { inserted = true; break; }
        insertError = attemptError;
      }
      if (!inserted) { setError(`Could not create wallet: ${insertError?.message || "Unknown error"}`); setSaving(false); return; }
    }

    await supabase.from("wallet_transactions").insert({ game_id: gameId, player_id: playerId, amount, type: "admin_set_balance", description: "Admin wallet adjustment" });
    setSuccess("Wallet updated."); setSaving(false); await loadData();
  };

  const quickAdjustWallet = async (playerId: string, delta: number) => { const current = Number(walletDrafts[playerId] ?? 0); const next = current + delta; setWalletDrafts((drafts) => ({ ...drafts, [playerId]: String(next) })); await saveWallet(playerId, next); };

  const saveHole = async (hole: any) => {
    const holeNumber = getHoleNumber(hole); const draft = holeDrafts[String(holeNumber)]; if (!draft) return;
    setSaving(true); setError(""); setSuccess("");
    if (String(hole.id).startsWith("fallback-")) {
      const insertAttempts = [{ game_id: gameId, hole_number: holeNumber, par: Number(draft.par), stroke_index: Number(draft.strokeIndex), base_value: Number(draft.value) }, { game_id: gameId, hole_number: holeNumber, par: Number(draft.par), stroke_index: Number(draft.strokeIndex) }];
      let insertError: any = null; let inserted = false;
      for (const payload of insertAttempts) { const { error: attemptError } = await supabase.from("holes").insert(payload); if (!attemptError) { inserted = true; break; } insertError = attemptError; }
      if (!inserted) { setError(`Could not create hole ${holeNumber}: ${insertError?.message || "Unknown error"}`); setSaving(false); return; }
    } else {
      const patch = createHolePatch(hole, draft); const { error: updateError } = await supabase.from("holes").update(patch).eq("id", hole.id);
      if (updateError) { setError(`Could not update hole ${holeNumber}: ${updateError.message}`); setSaving(false); return; }
    }
    setSuccess(`Hole ${holeNumber} updated.`); setSaving(false); await loadData();
  };

  const seedDefaultHoles = async () => {
    setSaving(true); setError(""); setSuccess("");
    for (const hole of DEFAULT_HOLES) {
      const existing = holes.find((item) => getHoleNumber(item) === hole.hole_number && !String(item.id).startsWith("fallback-")); if (existing) continue;
      const { error: insertError } = await supabase.from("holes").insert({ game_id: gameId, hole_number: hole.hole_number, par: hole.par, stroke_index: hole.stroke_index, base_value: hole.base_value });
      if (insertError) { const { error: fallbackError } = await supabase.from("holes").insert({ game_id: gameId, hole_number: hole.hole_number, par: hole.par, stroke_index: hole.stroke_index }); if (fallbackError) { setError(`Could not seed hole ${hole.hole_number}: ${fallbackError.message}`); setSaving(false); return; } }
    }
    setSuccess("Default holes created."); setSaving(false); await loadData();
  };

  if (loading) return <div className="p-4">Loading admin panel...</div>;
  if (error && !invite) return <div className="p-4 text-danger whitespace-pre-wrap">{error}</div>;

  return (
    <div className="p-3 max-w-6xl mx-auto pb-10">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[var(--gr-gold)]">Admin Control</div><h1 className="text-3xl font-black">Match Admin Panel</h1><div className="text-xs text-[var(--gr-text-muted)] font-mono break-all">{gameId}</div></div><div className="flex gap-2"><Link href={`/game/${gameId}`} className="btn btn-secondary">Live Game</Link><Link href={`/game/${gameId}/leaderboard`} className="btn btn-secondary">Leaderboard</Link></div></div>
      {error && <div className="mb-4 rounded-xl border border-[var(--gr-danger)] bg-[rgba(201,92,74,0.12)] p-3 text-sm text-[var(--gr-sand)]">{error}</div>}
      {warning && <div className="mb-4 rounded-xl border border-[var(--gr-warning)] bg-[rgba(217,164,65,0.12)] p-3 text-sm text-[var(--gr-sand)]">{warning}</div>}
      {success && <div className="mb-4 rounded-xl border border-[var(--gr-turf)] bg-[rgba(95,163,106,0.12)] p-3 text-sm text-[var(--gr-sand)]">{success}</div>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-1"><div className="mb-4"><div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Match settings</div><h2 className="text-xl font-black">Vuelta</h2></div><label className="mb-3 block text-sm font-bold">Match name<input className="mt-2 w-full" value={matchName} onChange={(event) => setMatchName(event.target.value)} /></label><label className="mb-4 block text-sm font-bold">Status<select className="mt-2 w-full" value={matchStatus} onChange={(event) => setMatchStatus(event.target.value)}><option value="in-progress">in-progress</option><option value="paused">paused</option><option value="finished">finished</option><option value="cancelled">cancelled</option></select></label><button className="btn btn-gold w-full" disabled={saving} onClick={saveMatchSettings}>Save match</button></section>
        <section className="card lg:col-span-2"><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Wallet control</div><h2 className="text-xl font-black">Cartera por jugador</h2><p className="mt-1 text-sm text-[var(--gr-text-muted)]">Estos saldos son los que luego deben mostrarse en Live Game y Perfil.</p></div><div className="text-right"><div className="text-xs text-[var(--gr-text-muted)]">Total wallets</div><div className={totalWalletBalance < 0 ? "text-2xl font-black text-danger" : "text-2xl font-black text-success"}>{formatMoney(totalWalletBalance)}</div></div></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{playerRows.map((player) => (<div key={player.rowKey} className="rounded-2xl border border-[var(--gr-border)] bg-black/10 p-4"><div className="mb-3 flex items-start justify-between gap-3"><div><div className="font-black">{player.name}</div><div className="text-xs text-[var(--gr-text-muted)]">{player.email}</div><div className="mt-1 text-xs text-[var(--gr-gold)]">{player.teamName} · {player.role}</div></div><div className="text-right"><div className="text-xs uppercase text-[var(--gr-text-muted)]">Current</div><div className={Number(walletDrafts[player.id] ?? 0) < 0 ? "text-xl font-black text-danger" : "text-xl font-black text-success"}>{formatMoney(Number(walletDrafts[player.id] ?? 0))}</div></div></div><div className="mb-3 flex gap-2"><input type="number" className="w-full" value={walletDrafts[player.id] ?? "0"} onChange={(event) => setWalletDrafts((drafts) => ({ ...drafts, [player.id]: event.target.value }))} /><button className="btn btn-gold whitespace-nowrap" disabled={saving} onClick={() => saveWallet(player.id)}>Set</button></div><div className="grid grid-cols-4 gap-2"><button className="btn btn-secondary" disabled={saving} onClick={() => quickAdjustWallet(player.id, -50)}>-50</button><button className="btn btn-secondary" disabled={saving} onClick={() => quickAdjustWallet(player.id, -10)}>-10</button><button className="btn btn-secondary" disabled={saving} onClick={() => quickAdjustWallet(player.id, 10)}>+10</button><button className="btn btn-secondary" disabled={saving} onClick={() => quickAdjustWallet(player.id, 50)}>+50</button></div></div>))}</div>
        </section>
      </div>
      <section className="card mt-4"><div className="mb-4 flex items-start justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Hole economy</div><h2 className="text-xl font-black">Valores de hoyo</h2><p className="mt-1 text-sm text-[var(--gr-text-muted)]">Total base actual: <span className="font-black text-[var(--gr-gold)]">€{totalHoleValue.toFixed(0)}</span></p></div><button className="btn btn-gold" disabled={saving} onClick={seedDefaultHoles}>Create default holes</button></div><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-sm"><thead><tr className="border-b border-[var(--gr-border)] text-left text-xs uppercase tracking-[0.16em] text-[var(--gr-text-muted)]"><th className="py-3">Hole</th><th className="py-3">Par</th><th className="py-3">SI</th><th className="py-3">Value</th><th className="py-3 text-right">Action</th></tr></thead><tbody>{holes.map((hole) => { const holeNumber = getHoleNumber(hole); const draft = holeDrafts[String(holeNumber)] || { par: "", strokeIndex: "", value: "0" }; return (<tr key={hole.id} className="border-b border-[var(--gr-border)]/60"><td className="py-3 font-black">{holeNumber}</td><td className="py-3"><input type="number" className="w-24" value={draft.par} onChange={(event) => setHoleDrafts((drafts) => ({ ...drafts, [String(holeNumber)]: { ...draft, par: event.target.value } }))} /></td><td className="py-3"><input type="number" className="w-24" value={draft.strokeIndex} onChange={(event) => setHoleDrafts((drafts) => ({ ...drafts, [String(holeNumber)]: { ...draft, strokeIndex: event.target.value } }))} /></td><td className="py-3"><input type="number" className="w-28" value={draft.value} onChange={(event) => setHoleDrafts((drafts) => ({ ...drafts, [String(holeNumber)]: { ...draft, value: event.target.value } }))} /></td><td className="py-3 text-right"><button className="btn btn-secondary" disabled={saving} onClick={() => saveHole(hole)}>Save</button></td></tr>); })}</tbody></table></div></section>
    </div>
  );
}
