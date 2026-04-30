"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabaseClient";

const n = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function storageKey(gameId: string) {
  return `golf-rivals:${gameId}:current-hole`;
}

export default function AdminResetPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [invite, setInvite] = useState<any>(null);
  const [game, setGame] = useState<any>(null);
  const [holeResults, setHoleResults] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [holes, setHoles] = useState<any[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);

  const loadData = async () => {
    if (!gameId) return;

    setLoading(true);
    setError("");
    setSuccess("");

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

    if ((inviteRow.role || "").toLowerCase() !== "admin") {
      setError("Admin access required for this reset panel.");
      setLoading(false);
      return;
    }

    const [gameRes, resultsRes, purchasesRes, holesRes, walletTransactionsRes] = await Promise.all([
      supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
      supabase.from("hole_results").select("*").eq("game_id", gameId),
      supabase.from("purchases").select("*").eq("game_id", gameId),
      supabase.from("holes").select("*").eq("game_id", gameId),
      supabase.from("wallet_transactions").select("*").eq("game_id", gameId),
    ]);

    const failed = [
      ["games", gameRes],
      ["hole_results", resultsRes],
      ["purchases", purchasesRes],
      ["holes", holesRes],
      ["wallet_transactions", walletTransactionsRes],
    ].find(([, res]: any) => res.error);

    if (failed) {
      setError(`${failed[0]}: ${(failed[1] as any).error.message}`);
      setLoading(false);
      return;
    }

    setGame(gameRes.data);
    setHoleResults(resultsRes.data || []);
    setPurchases(purchasesRes.data || []);
    setHoles(holesRes.data || []);
    setWalletTransactions(walletTransactionsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [gameId]);

  const currentHole = n(game?.current_hole, 1);
  const confirmedHoles = useMemo(() => {
    const values = new Set<string>();
    holeResults.forEach((result) => {
      const holeNumber = result.hole_number ?? result.holeNumber ?? result.number ?? result.hole_id ?? result.holeId;
      if (holeNumber) values.add(String(holeNumber));
    });
    return values.size;
  }, [holeResults]);

  const clearLocalMemory = () => {
    if (!gameId || typeof window === "undefined") return;
    window.localStorage.removeItem(storageKey(gameId));
  };

  const resetProgress = async () => {
    if (!gameId) return;

    const ok = window.confirm(
      "This will delete confirmed hole results, purchases, carries and reset the match to hole 1. Teams and hole setup will stay untouched. Continue?"
    );
    if (!ok) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const steps = [
      async () => supabase.from("purchases").delete().eq("game_id", gameId),
      async () => supabase.from("hole_results").delete().eq("game_id", gameId),
      async () => supabase.from("wallet_transactions").delete().eq("game_id", gameId),
      async () => supabase.from("holes").update({ carry_in: 0 }).eq("game_id", gameId),
      async () => supabase.from("games").update({ current_hole: 1, status: "in-progress" }).eq("id", gameId),
    ];

    for (const step of steps) {
      const { error: stepError } = await step();
      if (stepError) {
        setError(`Could not reset progress: ${stepError.message}`);
        setSaving(false);
        return;
      }
    }

    clearLocalMemory();
    setSuccess("Progress reset. Match is back to hole 1. Teams and hole setup were kept.");
    setSaving(false);
    await loadData();
  };

  const resetOnlyLocalMemory = () => {
    clearLocalMemory();
    setSuccess("Local browser memory cleared. Supabase data was not touched.");
  };

  if (loading) return <div className="p-4">Loading reset panel...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto pb-10">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[var(--gr-gold)]">Admin Reset</div>
          <h1 className="text-3xl font-black">Reset match progress</h1>
          <div className="text-xs text-[var(--gr-text-muted)] font-mono break-all">{gameId}</div>
        </div>
        <div className="flex gap-2">
          <Link href={`/game/${gameId}/admin`} className="btn btn-secondary">Admin Panel</Link>
          <Link href={`/game/${gameId}`} className="btn btn-secondary">Live Game</Link>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-[var(--gr-danger)] bg-[rgba(201,92,74,0.12)] p-3 text-sm text-[var(--gr-sand)]">{error}</div>}
      {success && <div className="mb-4 rounded-xl border border-[var(--gr-turf)] bg-[rgba(95,163,106,0.12)] p-3 text-sm text-[var(--gr-sand)]">{success}</div>}

      <section className="card mb-4">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Current status</div>
          <h2 className="text-xl font-black">Saved match memory</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-[var(--gr-border)] p-4">
            <div className="text-xs text-[var(--gr-text-muted)]">Current hole</div>
            <div className="text-2xl font-black text-[var(--gr-gold)]">{currentHole}</div>
          </div>
          <div className="rounded-2xl border border-[var(--gr-border)] p-4">
            <div className="text-xs text-[var(--gr-text-muted)]">Confirmed holes</div>
            <div className="text-2xl font-black text-[var(--gr-gold)]">{confirmedHoles}</div>
          </div>
          <div className="rounded-2xl border border-[var(--gr-border)] p-4">
            <div className="text-xs text-[var(--gr-text-muted)]">Result rows</div>
            <div className="text-2xl font-black text-[var(--gr-gold)]">{holeResults.length}</div>
          </div>
          <div className="rounded-2xl border border-[var(--gr-border)] p-4">
            <div className="text-xs text-[var(--gr-text-muted)]">Purchases</div>
            <div className="text-2xl font-black text-[var(--gr-gold)]">{purchases.length}</div>
          </div>
        </div>
      </section>

      <section className="card mb-4 border-[var(--gr-danger)]">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-danger)]">Testing tools</div>
          <h2 className="text-xl font-black">Reset playable progress</h2>
          <p className="mt-2 text-sm text-[var(--gr-text-muted)]">
            Use this while testing. It deletes progress, but keeps players, teams, invites and hole configuration.
          </p>
        </div>

        <button className="btn btn-gold w-full" disabled={saving} onClick={resetProgress}>
          Reset results, purchases and current hole
        </button>
      </section>

      <section className="card">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Browser only</div>
          <h2 className="text-xl font-black">Clear local memory</h2>
          <p className="mt-2 text-sm text-[var(--gr-text-muted)]">
            This only clears your browser backup memory. It does not delete Supabase results.
          </p>
        </div>

        <button className="btn btn-secondary w-full" disabled={saving} onClick={resetOnlyLocalMemory}>
          Clear local browser memory only
        </button>
      </section>
    </div>
  );
}
