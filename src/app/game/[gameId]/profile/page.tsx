"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

export default function MatchProfilePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [invite, setInvite] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        router.push("/auth/login");
        return;
      }
      const email = (userData.user.email || "").trim().toLowerCase();
      setUserEmail(email);
      const { data, error: inviteError } = await supabase
        .from("game_invites")
        .select("*")
        .ilike("email", email)
        .eq("game_id", gameId)
        .limit(1);
      if (inviteError) setError(inviteError.message);
      setInvite(data?.[0] || null);
      setLoading(false);
    };
    load();
  }, [gameId, router]);

  if (loading) return <div className="p-4">Loading profile...</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <div className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[var(--gr-gold)]">Profile</div>
          <h1 className="text-3xl font-black">Match Profile</h1>
          <div className="text-xs text-[var(--gr-text-muted)] font-mono break-all">{gameId}</div>
        </div>
        <Link href={`/game/${gameId}`} className="btn btn-gold">Open Match</Link>
      </div>
      {error && <div className="mb-4 rounded-xl border border-[var(--gr-danger)] p-3 text-sm text-danger">{error}</div>}
      <section className="card">
        <div className="text-xs uppercase tracking-[0.16em] text-[var(--gr-text-muted)]">Signed in as</div>
        <div className="mt-1 text-xl font-black">{userEmail}</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[var(--gr-border)] p-4"><div className="text-xs text-[var(--gr-text-muted)]">Role</div><div className="text-xl font-black text-[var(--gr-gold)]">{invite?.role || "player"}</div></div>
          <div className="rounded-2xl border border-[var(--gr-border)] p-4"><div className="text-xs text-[var(--gr-text-muted)]">Status</div><div className="text-xl font-black text-[var(--gr-gold)]">Ready</div></div>
        </div>
      </section>
    </div>
  );
}
