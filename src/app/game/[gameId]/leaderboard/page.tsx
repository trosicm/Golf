"use client";

import { useParams, useRouter } from "next/navigation";

export default function LeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
      <div className="card mb-4">
        <div className="text-sm text-[var(--gr-text-muted)] mb-2">Match</div>
        <div className="font-mono text-xs break-all">{gameId}</div>
      </div>
      <div className="card mb-4">
        <p className="text-sm">
          Leaderboard route is ready. Next step: calculate team balances, holes won and wallet totals from Supabase.
        </p>
      </div>
      <button className="btn btn-gold w-full" onClick={() => router.push(`/game/${gameId}`)}>
        Back to Match
      </button>
    </div>
  );
}
