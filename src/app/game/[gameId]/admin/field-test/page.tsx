"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";

const n = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const money = (value: number) => `€${Math.abs(value).toFixed(0)}`;
const teamIdOf = (row: any) => row?.team_id ?? row?.teamId ?? row?.id;
const markerTeamIdOf = (row: any) => row?.marker_team_id ?? row?.markerTeamId;
const markedTeamIdOf = (row: any) => row?.marked_team_id ?? row?.markedTeamId;
const purchaseAmount = (row: any) => n(row?.amount ?? row?.cost ?? row?.value ?? row?.price);
const purchaseType = (row: any) => String(row?.type ?? row?.purchase_type ?? row?.kind ?? "").toLowerCase();
const purchaseHoleNumber = (row: any) => row?.hole_number ?? row?.holeNumber ?? row?.number;
const holeNo = (row: any) => n(row?.hole_number ?? row?.holeNumber ?? row?.number ?? row?.hole);
const holeValue = (row: any) => n(row?.base_value ?? row?.value ?? row?.price ?? row?.hole_value);
const carryValue = (row: any) => n(row?.carry_in ?? row?.carryIn);

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

export default function FieldTestAdminPage() {
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
  const [markers, setMarkers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [permissionsMissing, setPermissionsMissing] = useState(false);

  const loadData = async () => {
    if (!gameId) return;
    setLoading(true);
    setError("");
    setMessage("");

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

    const [gameRes, holesRes, gameTeamsRes, teamsRes, markersRes, purchasesRes] = await Promise.all([
      supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
      supabase.from("holes").select("*").eq("game_id", gameId),
      supabase.from("game_teams").select("*").eq("game_id", gameId),
      supabase.from("teams").select("*"),
      supabase.from("game_team_markers").select("*").eq("game_id", gameId),
      supabase.from("purchases").select("*").eq("game_id", gameId),
    ]);

    const failed = [["games", gameRes], ["holes", holesRes], ["game_teams", gameTeamsRes], ["teams", teamsRes], ["game_team_markers", markersRes], ["purchases", purchasesRes]].find(([, res]: any) => res.error);
    if (failed) {
      setError(`${failed[0]}: ${(failed[1] as any).error.message}`);
      setLoading(false);
      return;
    }

    const permissionsRes = await supabase.from("game_team_permissions").select("*").eq("game_id", gameId);
    setPermissionsMissing(Boolean(permissionsRes.error));
    setPermissions(permissionsRes.error ? [] : permissionsRes.data || []);

    setGame(gameRes.data);
    setHoles((holesRes.data || []).sort((a, b) => holeNo(a) - holeNo(b)));
    setGameTeams(gameTeamsRes.data || []);
    setTeams(teamsRes.data || []);
    setMarkers(markersRes.data || []);
    setPurchases(purchasesRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [gameId]);

  const currentHole = Math.min(18, Math.max(1, n(game?.current_hole, 1)));
  const currentHoleRow = holes.find((hole) => holeNo(hole) === currentHole);
  const currentPurchases = purchases.filter((purchase) => purchaseHoleNumber(purchase) === currentHole || purchase?.hole_id === currentHoleRow?.id);
  const currentPot = holeValue(currentHoleRow) + carryValue(currentHoleRow) + currentPurchases.reduce((sum, purchase) => sum + purchaseAmount(purchase), 0);

  const teamRows = useMemo(() => {
    return gameTeams.map((gameTeam, index) => {
      const teamId = teamIdOf(gameTeam);
      const team = teams.find((item) => item.id === teamId);
      const marker = markers.find((row) => markedTeamIdOf(row) === teamId);
      const markerTeamId = markerTeamIdOf(marker) || "";
      const markerTeam = teams.find((item) => item.id === markerTeamId);
      const teamPurchases = purchases.filter((purchase) => teamIdOf(purchase) === teamId);
      const mulligans = teamPurchases.filter((purchase) => purchaseType(purchase).includes("mulligan") && !purchaseType(purchase).includes("reverse")).length;
      const reverses = teamPurchases.filter((purchase) => purchaseType(purchase).includes("reverse")).length;
      const permission = permissions.find((row) => teamIdOf(row) === teamId) || {};
      return {
        id: teamId,
        name: team?.name || `Team ${index + 1}`,
        markerTeamId,
        markerName: markerTeam?.name || "Not assigned",
        mulligans,
        reverses,
        canEditOwnScore: permission.can_edit_own_score ?? false,
        canEditMarkedScore: permission.can_edit_marked_score ?? true,
        canCloseHoles: permission.can_close_holes ?? false,
        canCreateBets: permission.can_create_bets ?? true,
      };
    });
  }, [gameTeams, teams, markers, purchases, permissions]);

  const saveMarker = async (markedTeamId: string, markerTeamId: string) => {
    if (!gameId || !markedTeamId || !markerTeamId) return;
    if (markedTeamId === markerTeamId) {
      setError("A team cannot mark itself.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await supabase.from("game_team_markers").delete().eq("game_id", gameId).eq("marked_team_id", markedTeamId);
      const { error: insertError } = await supabase.from("game_team_markers").insert({
        game_id: gameId,
        marker_team_id: markerTeamId,
        marked_team_id: markedTeamId,
      });
      if (insertError) throw insertError;
      setMessage("Marker assignment saved.");
      await loadData();
    } catch (err: any) {
      setError(`Could not save marker: ${err?.message || "Unknown Supabase error"}`);
    } finally {
      setSaving(false);
    }
  };

  const addPurchase = async (teamId: string, type: "mulligan" | "reverse") => {
    if (!gameId) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const amount = type === "mulligan" ? n(game?.mulligan_price, 50) : currentPot;
      const row = {
        game_id: gameId,
        hole_id: currentHoleRow?.id || null,
        hole_number: currentHole,
        team_id: teamId,
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
      setMessage(`${type === "mulligan" ? "Mulligan" : "Reverse"} added: ${money(amount)}`);
      await loadData();
    } catch (err: any) {
      setError(`Could not add purchase: ${err?.message || "Unknown Supabase error"}`);
    } finally {
      setSaving(false);
    }
  };

  const savePermission = async (teamId: string, field: string, value: boolean) => {
    if (!gameId || permissionsMissing) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const existing = permissions.find((row) => teamIdOf(row) === teamId);
      const payload = {
        game_id: gameId,
        team_id: teamId,
        can_edit_own_score: existing?.can_edit_own_score ?? false,
        can_edit_marked_score: existing?.can_edit_marked_score ?? true,
        can_close_holes: existing?.can_close_holes ?? false,
        can_create_bets: existing?.can_create_bets ?? true,
        [field]: value,
      };
      if (existing?.id) {
        const { error: updateError } = await supabase.from("game_team_permissions").update(payload).eq("id", existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("game_team_permissions").insert(payload);
        if (insertError) throw insertError;
      }
      setMessage("Permission saved.");
      await loadData();
    } catch (err: any) {
      setError(`Could not save permission: ${err?.message || "Unknown Supabase error"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-[var(--gr-sand)]">Loading field test control...</div>;
  if (error && !invite) return <div className="p-4 text-danger whitespace-pre-wrap">{error}</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--gr-turf)]"><span className="live-dot" /> Admin Test Mode</div>
          <h1 className="text-3xl font-black text-[var(--gr-sand)]">Field Test Control</h1>
          <div className="text-sm text-[var(--gr-text-muted)]">Current hole {currentHole} · reverse price {money(currentPot)}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" onClick={loadData}>Refresh</button>
          <Link href={`/game/${gameId}`} className="btn btn-gold">Open Match</Link>
          <Link href={`/game/${gameId}/bets`} className="btn btn-secondary">BETS</Link>
        </div>
      </div>

      {message && <div className="mb-4 rounded-xl border border-[var(--gr-turf)] bg-[rgba(95,163,106,0.12)] p-3 text-sm text-[var(--gr-sand)]">{message}</div>}
      {error && <div className="mb-4 rounded-xl border border-[var(--gr-danger)] bg-[rgba(201,92,74,0.12)] p-3 text-sm text-danger">{error}</div>}
      {permissionsMissing && (
        <div className="mb-4 rounded-xl border border-[var(--gr-warning)] bg-[rgba(217,164,65,0.12)] p-3 text-sm text-[var(--gr-sand)]">
          Permissions table is not created yet. Marker and purchase controls work. Permissions will activate after running the SQL I give you.
        </div>
      )}

      <section className="card mb-4">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-gold)]">Marker assignments</div>
          <h2 className="text-xl font-black text-[var(--gr-sand)]">Who marks who</h2>
          <p className="mt-1 text-sm text-[var(--gr-text-muted)]">Choose the team responsible for entering each team score.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {teamRows.map((team) => (
            <div key={team.id} className="rounded-2xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.28)] p-4">
              <div className="mb-3">
                <div className="text-lg font-black text-[var(--gr-sand)]">{team.name}</div>
                <div className="text-xs text-[var(--gr-text-muted)]">Current marker: <span className="text-[var(--gr-gold)] font-bold">{team.markerName}</span></div>
              </div>
              <select className="w-full" value={team.markerTeamId} onChange={(event) => saveMarker(team.id, event.target.value)} disabled={saving}>
                <option value="">Select marker team</option>
                {teamRows.filter((option) => option.id !== team.id).map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="card mb-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-gold)]">Mulligans & reverses</div>
            <h2 className="text-xl font-black text-[var(--gr-sand)]">Current hole purchases</h2>
            <p className="mt-1 text-sm text-[var(--gr-text-muted)]">Admin can add purchases by team for the current hole.</p>
          </div>
          <div className="rounded-full bg-black px-4 py-2 text-sm font-black text-[var(--gr-sand)]">Reverse {money(currentPot)}</div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {teamRows.map((team) => (
            <div key={team.id} className="rounded-2xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.28)] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-[var(--gr-sand)]">{team.name}</div>
                  <div className="text-xs text-[var(--gr-text-muted)]">Mulligans {team.mulligans} · Reverses {team.reverses}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn btn-gold" disabled={saving} onClick={() => addPurchase(team.id, "mulligan")}>Add Mulligan</button>
                <button className="btn btn-secondary" disabled={saving} onClick={() => addPurchase(team.id, "reverse")}>Add Reverse</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-gold)]">Team permissions</div>
          <h2 className="text-xl font-black text-[var(--gr-sand)]">Test permissions</h2>
          <p className="mt-1 text-sm text-[var(--gr-text-muted)]">Use these toggles to prepare different test modes. Enforcement comes in the next step.</p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {teamRows.map((team) => (
            <div key={team.id} className="rounded-2xl border border-[var(--gr-border)] bg-[rgba(20,68,55,0.28)] p-4">
              <div className="mb-3 text-lg font-black text-[var(--gr-sand)]">{team.name}</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                {[
                  ["can_edit_own_score", "Edit own score", team.canEditOwnScore],
                  ["can_edit_marked_score", "Edit marked score", team.canEditMarkedScore],
                  ["can_close_holes", "Close holes", team.canCloseHoles],
                  ["can_create_bets", "Create bets", team.canCreateBets],
                ].map(([field, label, value]) => (
                  <button
                    key={String(field)}
                    className={`rounded-2xl border px-3 py-3 text-left text-xs font-black uppercase ${value ? "border-[var(--gr-gold)] bg-[rgba(212,174,96,0.16)] text-[var(--gr-gold)]" : "border-[var(--gr-border)] text-[var(--gr-text-muted)]"}`}
                    disabled={saving || permissionsMissing}
                    onClick={() => savePermission(team.id, String(field), !value)}
                  >
                    {label}<br />{value ? "ON" : "OFF"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
