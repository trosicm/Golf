"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFinalSettlement } from "../../../../lib/golfrivals/rules";

export default function GameSummary() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (!gameId) return;
    const stored = localStorage.getItem(`golfrivals-game-${gameId}`);
    if (!stored) return;
    const game = JSON.parse(stored);
    setSummary(getFinalSettlement(game));
  }, [gameId]);

  if (!summary) {
    return <div className="p-4 text-white">Loading summary...</div>;
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-green-900">Final Settlement</h2>

      <div className="mb-4 card">
        <div className="font-semibold mb-2">Teams</div>
        <table className="w-full text-xs scoreboard-table">
          <thead>
            <tr>
              <th className="text-left">Team</th>
              <th>Spent</th>
              <th>Won</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {summary.teams.map((team: any, idx: number) => (
              <tr key={team.id}>
                <td className={`font-bold team-badge team-${idx + 1}`}>{team.name}</td>
                <td className="text-center text-danger">€{team.moneySpent.toFixed(2)}</td>
                <td className="text-center text-success">€{team.moneyWon.toFixed(2)}</td>
                <td className="text-center">€{team.balance?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-4 card">
        <div>Total pot: €{summary.totalPot.toFixed(2)}</div>
        {summary.pendingCarry > 0 && <div>Pending carry: €{summary.pendingCarry.toFixed(2)}</div>}
      </div>

      <div className="mb-4 card">
        <div className="font-semibold mb-2">WhatsApp summary</div>
        <textarea className="w-full p-2 rounded bg-gray-900 text-white" rows={6} value={summary.whatsapp} readOnly />
      </div>

      <button className="btn btn-blue w-full mt-2" onClick={() => router.push("/")}>New Game</button>
    </div>
  );
}
