"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";

const n = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const holeNo = (row: any) => n(row?.hole_number ?? row?.holeNumber ?? row?.number ?? row?.hole);
const holeValue = (row: any) => n(row?.base_value ?? row?.value ?? row?.price ?? row?.hole_value);
const carryValue = (row: any) => n(row?.carry_in ?? row?.carryIn);
const teamIdOf = (row: any) => row?.team_id ?? row?.teamId ?? row?.id;
const purchaseAmount = (row: any) => n(row?.amount ?? row?.cost ?? row?.value ?? row?.price);
const purchaseType = (row: any) => String(row?.type ?? row?.purchase_type ?? row?.kind ?? "").toLowerCase();
const purchaseHoleNumber = (row: any) => row?.hole_number ?? row?.holeNumber ?? row?.number;

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

export default function AdminPurchasesPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [invite, setInvite] = useState<any>(null);
  const [game, setGame] = useState<any>(null);
  const [holes, setHoles] = useState<any[]>([]);
  const [gameTeams, setGameTeams] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);

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

    const [gameRes, holesRes, gameTeamsRes, teamsRes, purchasesRes] = await Promise.all([
      supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
      supabase.from("holes").select("*").eq("game_id", gameId),
      supabase.from("game_teams").select("*").eq("game_id", gameId),
      supabase.from("teams").select("*"),
      supabase.from("purchases").select("*").eq("game_id", gameId),
    ]);

    const failed = [["games", gameRes], ["holes", holesRes], ["game_teams", gameTeamsRes], ["teams", teamsRes], ["purchases", purchasesRes]].find(([, res]: any) => res.error);
    if (failed) {
      setError(`${failed[0]}: ${(failed[1] as any).error.message}`);
      setLoading(false);
      return;
    }

    setGame(gameRes.data);
    setHoles((holesRes.data || []).sort((a, b) => holeNo(a) - holeNo(b)));
    setGameTeams(gameTeamsRes.data || []);
    setTeams(teamsRes.data || []);
    setPurchases(purchasesRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [gameId]);

  const currentHoleNumber = Math.min(18, Math.max(1, n(game?.current_hole, 1)));
  const currentHole = holes.find((hole) => holeNo(hole) === currentHoleNumber) || holes[0];
  const currentPurchases = purchases.filter((purchase) => purchaseHoleNumber(purchase) === currentHoleNumber || purchase?.hole_id === currentHole?.id);
  const currentPot = holeValue(currentHole) + carryValue(currentHole) + currentPurchases.reduce((sum, purchase) => sum + purchaseAmount(purchase), 0);

  const teamRows = useMemo(() => {
    return gameTeams.map((gameTeam, index) => {
      const teamId = teamIdOf(gameTeam);
      const team = teams.find((item) => item.id === teamId);
      const teamPurchases = purchases.filter((purchase) => teamIdOf(purchase) === teamId);
      const mulligans = teamPurchases.filter((purchase) => purchaseType(purchase).includes("mulligan") && !purchaseType(purchase).includes("reverse")).length;
      const reverses = teamPurchases.filter((purchase) => purchaseType(purchase).includes("reverse")).length;
      const spent = teamPurchases.reduce((sum, purchase) => sum + purchaseAmount(purchase), 0);
      return { id: teamId, name: team?.name || `Team ${index + 1}`, mulligans, reverses, spent };
    });
  }, [gameTeams, teams, purchases]);

  const addPurchase = async (team: any, type: "mulligan" | "reverse") => {
    if (!gameId || !currentHole) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const amount = type === "mulligan" ? n(game?.mulligan_price, 50) : currentPot;
      const row = {
        game_id: gameId,
        hole_id: currentHole.id,
        hole_number: currentHoleNumber,
        team_id: team.id,
        type,
        purchase_type: type,
        amount,
        value: amount,
      };
      await insertWithFallback("purchases", [row], [
        ({ hole_id, ...rest }) => rest,
        ({ purchase_type, value, ...rest }) => rest,
        ({ hole_id, purchase_type, value, ...rest }) => rest,
        ({ hole_id, hole_number, purchase_type, value, ...rest }) => rest,
      ]);
      setMessage(`${type === "mulligan" ? "Mulligan" : "Reverse"} added for ${team.name}: €${amount.toFixed(0)}`);
      await loadData();
    } catch (err: any) {
      setError(`Could not add purchase: ${err?.message || "Unknown Supabase error"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading admin purchases...</div>;
  if (error && !invite) return <div className="p-4 text-danger whitespace-pre-wrap">{error}</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto pb-10">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[var(--gr-gold)]">Admin Purchases</div>
          <h1 className="text-3xl font-black">Mulligans & Reverses</h1>
          <div className="text-xs text-[var(--gr-text-muted)] font-mono break-all">{gameId}</div>
        </div>
        <div className="flex gap-2">
          <Link href={`/game/${gameId}/admin`} className="btn btn-secondary">Admin</Link>
          <Link href={`/game/${gameId}`} className="btn btn-gold">Live Game</Link>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-[var(--gr-danger)] bg-[rgba(201,92,74,0.12)] p-3 text-sm text-[var(--gr-sand)]">{error}</div>}
      {message && <div className="mb-4 rounded-xl border border-[var(--gr-turf)] bg-[rgba(95,163,106,0.12)] p-3 text-sm text-[var(--gr-sand)]">{message}</div>}

      <section className="card mb-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl border border-[var(--gr-border)] p-4"><div className="text-xs text-[var(--gr-text-muted)]">Current hole</div><div className="text-2xl font-black text-[var(--gr-gold)]">{currentHoleNumber}</div></div>
          <div className="rounded-2xl border border-[var(--gr-border)] p-4"><div className="text-xs text-[var(--gr-text-muted)]">Current pot</div><div className="text-2xl font-black text-[var(--gr-gold)]">€{currentPot.toFixed(0)}</div></div>
          <div className="rounded-2xl border border-[var(--gr-border)] p-4"><div className="text-xs text-[var(--gr-text-muted)]">Reverse price</div><div className="text-2xl font-black text-[var(--gr-gold)]">€{currentPot.toFixed(0)}</div></div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3">
        {teamRows.map((team) => (
          <div key={team.id} className="card mb-0">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-black">{team.name}</div>
                <div className="text-sm text-[var(--gr-text-muted)]">Mulligans {team.mulligans} · Reverses {team.reverses} · Spent €{team.spent.toFixed(0)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-gold" disabled={saving} onClick={() => addPurchase(team, "mulligan")}>Add Mulligan €{n(game?.mulligan_price, 50)}</button>
              <button className="btn btn-secondary" disabled={saving} onClick={() => addPurchase(team, "reverse")}>Add Reverse €{currentPot.toFixed(0)}</button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
