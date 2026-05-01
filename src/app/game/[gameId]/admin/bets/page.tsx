"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";

const n = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const money = (value: number) => `${value > 0 ? "+" : value < 0 ? "-" : ""}EUR ${Math.abs(value).toFixed(0)}`;
const teamIdOf = (row: any) => row?.team_id ?? row?.teamId ?? row?.id;
const playerIdOf = (row: any) => row?.player_id ?? row?.playerId;
function teamPlayerIds(team: any) {
  return [team?.player_1_id, team?.player_2_id, team?.player1_id, team?.player2_id, team?.player_a_id, team?.player_b_id].filter(Boolean);
}
function playerName(player: any) {
  return player?.name ?? player?.display_name ?? player?.full_name ?? player?.nickname ?? player?.email ?? player?.id;
}

export default function AdminBetsWalletPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [invite, setInvite] = useState<any>(null);
  const [game, setGame] = useState<any>(null);
  const [gameTeams, setGameTeams] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [gameInvites, setGameInvites] = useState<any[]>([]);
  const [betTransactions, setBetTransactions] = useState<any[]>([]);

  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [resetConfirm, setResetConfirm] = useState("");

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
      setError(`Could not check admin access: ${inviteError.message}`);
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
    if (String(inviteRow.role || "").toLowerCase() !== "admin") {
      setError("Admin access required.");
      setLoading(false);
      return;
    }

    const [gameRes, gameTeamsRes, teamsRes, playersRes, invitesRes, transactionsRes] = await Promise.all([
      supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
      supabase.from("game_teams").select("*").eq("game_id", gameId),
      supabase.from("teams").select("*"),
      supabase.from("players").select("*"),
      supabase.from("game_invites").select("*").eq("game_id", gameId),
      supabase.from("game_bet_transactions").select("*").eq("game_id", gameId),
    ]);

    const failed = [
      ["games", gameRes],
      ["game_teams", gameTeamsRes],
      ["teams", teamsRes],
      ["players", playersRes],
      ["game_invites", invitesRes],
      ["game_bet_transactions", transactionsRes],
    ].find(([, res]: any) => res.error);

    if (failed) {
      setError(`${failed[0]}: ${(failed[1] as any).error.message}`);
      setLoading(false);
      return;
    }

    setGame(gameRes.data);
    setGameTeams(gameTeamsRes.data || []);
    setTeams(teamsRes.data || []);
    setPlayers(playersRes.data || []);
    setGameInvites(invitesRes.data || []);
    setBetTransactions(transactionsRes.data || []);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [gameId]);

  const teamRows = useMemo(() => {
    return gameTeams.map((gameTeam, index) => {
      const teamId = teamIdOf(gameTeam);
      const team = teams.find((item) => item.id === teamId);
      const playerIds = teamPlayerIds(team);
      const fallbackIds = gameInvites
        .filter((item) => playerIdOf(item))
        .slice(index * 2, index * 2 + 2)
        .map(playerIdOf)
        .filter(Boolean);
      const resolvedPlayerIds = playerIds.length ? playerIds : fallbackIds;
      const playerNames = resolvedPlayerIds
        .map((id) => playerName(players.find((player) => player.id === id)))
        .filter(Boolean);

      const betsNet = betTransactions
        .filter((row) => teamIdOf(row) === teamId)
        .reduce((sum, row) => sum + n(row?.amount ?? row?.value), 0);

      return {
        id: teamId,
        name: team?.name || `Team ${index + 1}`,
        players: playerNames.length ? playerNames.join(" & ") : "Players pending",
        betsNet,
        bettingBalance: betsNet,
      };
    });
  }, [gameTeams, teams, players, gameInvites, betTransactions]);

  const addAdjustment = async (teamId: string, direction: 1 | -1) => {
    if (!gameId || !teamId) return;
    const raw = amountDrafts[teamId] ?? "0";
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const signedAmount = direction === 1 ? amount : -amount;
      const reasonBase = (reasonDrafts[teamId] || "").trim();
      const reason = reasonBase || "Admin manual betting balance adjustment";

      const row = {
        game_id: gameId,
        bet_id: null,
        team_id: teamId,
        amount: signedAmount,
        reason,
      };

      const { error: insertError } = await supabase.from("game_bet_transactions").insert(row);
      if (insertError) throw insertError;

      setMessage(`${direction === 1 ? "Added" : "Removed"} ${money(amount)} for ${teamRows.find((team) => team.id === teamId)?.name || "team"}.`);
      await loadData();
    } catch (err: any) {
      setError(`Could not save adjustment: ${err?.message || "Unknown Supabase error"}`);
    } finally {
      setSaving(false);
    }
  };

  const resetBetsModule = async () => {
    if (!gameId) return;
    if (resetConfirm.trim().toUpperCase() !== "RESET") {
      setError("Type RESET to enable destructive reset.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      // 1. Collect bet IDs for this game to scope participant deletion
      const { data: betRows, error: betFetchError } = await supabase
        .from("game_bets")
        .select("id")
        .eq("game_id", gameId);
      if (betFetchError) throw betFetchError;

      const betIds = (betRows || []).map((row: any) => row.id).filter(Boolean);

      // 2. Delete game_bet_participants for those bets
      if (betIds.length > 0) {
        const { error: participantsError } = await supabase
          .from("game_bet_participants")
          .delete()
          .in("bet_id", betIds);
        if (participantsError) throw participantsError;
      }

      // 3. Delete game_bet_transactions for this game
      const { error: transactionsError } = await supabase
        .from("game_bet_transactions")
        .delete()
        .eq("game_id", gameId);
      if (transactionsError) throw transactionsError;

      // 4. Delete game_bets for this game
      const { error: betsError } = await supabase
        .from("game_bets")
        .delete()
        .eq("game_id", gameId);
      if (betsError) throw betsError;

      setMessage("BETS module fully reset: bets, participants and transactions cleared for this match.");
      setResetConfirm("");
      await loadData();
    } catch (err: any) {
      setError(`Reset failed: ${err?.message || "Unknown Supabase error"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-[var(--gr-sand)]">Loading admin BETS wallet control...</div>;
  if (error && !invite) return <div className="p-4 text-danger whitespace-pre-wrap">{error}</div>;

  const matchName = game?.name ?? game?.data?.name ?? game?.data?.title ?? "Match";

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--gr-turf)]">
            <span className="live-dot" /> Admin Test Mode
          </div>
          <h1 className="text-3xl font-black text-[var(--gr-sand)]">BETS Wallet Control</h1>
          <div className="text-sm text-[var(--gr-text-muted)]">{matchName} · Isolated manual adjustments for bets only</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" onClick={loadData} disabled={saving}>Refresh</button>
          <Link href={`/game/${gameId}/bets`} className="btn btn-gold">Open BETS</Link>
          <Link href={`/game/${gameId}/admin`} className="btn btn-secondary">Back Admin</Link>
        </div>
      </div>

      {message && <div className="mb-4 rounded-xl border border-[var(--gr-turf)] bg-[rgba(95,163,106,0.12)] p-3 text-sm text-[var(--gr-sand)]">{message}</div>}
      {error && <div className="mb-4 rounded-xl border border-[var(--gr-danger)] bg-[rgba(201,92,74,0.12)] p-3 text-sm text-danger">{error}</div>}

      <section className="card mb-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-gold)]">Manual admin control</div>
            <div className="text-sm text-[var(--gr-text-muted)]">Writes only into game_bet_transactions. Base wallets are read-only here.</div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {teamRows.map((team) => (
            <div key={team.id} className="rounded-2xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.35)] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-[var(--gr-sand)]">{team.name}</div>
                  <div className="text-xs text-[var(--gr-text-muted)]">{team.players}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[var(--gr-text-muted)]">Betting Balance</div>
                  <div className={`text-xl font-black ${team.bettingBalance >= 0 ? "text-success" : "text-danger"}`}>{money(team.bettingBalance)}</div>
                </div>
              </div>

              <div className="mb-3 text-center text-xs">
                <div className="rounded-xl border border-[var(--gr-border)] p-3">
                  <div className="text-[var(--gr-text-muted)]">Bets net</div>
                  <div className={`font-black ${team.betsNet >= 0 ? "text-success" : "text-danger"}`}>{money(team.betsNet)}</div>
                </div>
              </div>

              <div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Adjustment amount</div>
              <input
                type="number"
                min="1"
                className="mb-2 w-full"
                value={amountDrafts[team.id] ?? "20"}
                onChange={(event) => setAmountDrafts((current) => ({ ...current, [team.id]: event.target.value }))}
              />
              <input
                type="text"
                className="mb-3 w-full"
                placeholder="Reason (optional)"
                value={reasonDrafts[team.id] ?? ""}
                onChange={(event) => setReasonDrafts((current) => ({ ...current, [team.id]: event.target.value }))}
              />

              <div className="grid grid-cols-2 gap-2">
                <button className="btn btn-gold" disabled={saving} onClick={() => addAdjustment(team.id, 1)}>Add money</button>
                <button className="btn btn-secondary" disabled={saving} onClick={() => addAdjustment(team.id, -1)}>Remove money</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card border-[var(--gr-danger)] bg-[rgba(201,92,74,0.08)]">
        <div className="mb-3">
          <div className="text-xs uppercase tracking-[0.16em] text-danger">Reset BETS module</div>
          <div className="text-sm text-[var(--gr-text-muted)]">This clears bets, bet participants, bet transactions and resets BETS wallets to zero for this game only.</div>
        </div>
        <div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Type RESET to enable</div>
        <input
          type="text"
          className="mb-3 w-full"
          placeholder="RESET"
          value={resetConfirm}
          onChange={(event) => setResetConfirm(event.target.value)}
        />
        <button
          className="btn btn-secondary"
          disabled={saving || resetConfirm.trim().toUpperCase() !== "RESET"}
          onClick={resetBetsModule}
        >
          Reset BETS module (This Match)
        </button>
      </section>
    </div>
  );
}
