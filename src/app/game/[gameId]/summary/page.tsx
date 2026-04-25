"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFinalSettlement } from "../../../lib/golfrivals/rules";

const BET_LABELS: Record<string, string> = {
  "long-drive": "Long Drive",
  "nearest-pin": "Nearest to the Pin",
  "birdie-pool": "Birdie Pool",
  "match-play": "Match Play",
  "custom": "Custom",
};

export default function GameSummary() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;
  const [game, setGame] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (!gameId) return;
    const stored = localStorage.getItem(`golfrivals-game-${gameId}`);
    if (stored) {
      const g = JSON.parse(stored);
      setGame(g);
      setSummary(getFinalSettlement(g));
    }
  }, [gameId]);

  if (!game || !summary) return <div className="p-4 text-white">Loading summary...</div>;

  // WhatsApp summary with bets
  let whatsapp = summary.whatsapp;
  if (game.extraBets && game.extraBets.length > 0) {
    whatsapp += `\n\nApuestas Extra:\n`;
    game.extraBets.forEach((b: any) => {
      whatsapp += `- ${BET_LABELS[b.type] || b.type}`;
      if (b.holeNumber) whatsapp += ` (Hoyo ${b.holeNumber})`;
      if (b.amount) whatsapp += `: €${b.amount}`;
      if (b.teamsInvolved && b.teamsInvolved.length > 0) {
        whatsapp += ` [${b.teamsInvolved.map((id: string) => game.teams.find((t: any) => t.id === id)?.name).join(", ")}]`;
      }
      if (b.description) whatsapp += ` - ${b.description}`;
      if (b.winnerTeamId) whatsapp += ` | Ganador: ${game.teams.find((t: any) => t.id === b.winnerTeamId)?.name}`;
      whatsapp += `\n`;
    });
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
            {summary.teams.map((t: any, idx: number) => (
              <tr key={t.id}>
                <td className={`font-bold team-badge team-${idx + 1}`}>{t.name}</td>
                <td className="text-center text-danger">€{t.moneySpent.toFixed(2)}</td>
                <td className="text-center text-success">€{t.moneyWon.toFixed(2)}</td>
                <td className={t.balance && t.balance > 0 ? 'text-success text-center' : t.balance && t.balance < 0 ? 'text-danger text-center' : 'text-white text-center'}>€{t.balance?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mb-4 card">
        <div>Total pot: <span className="font-bold text-gold-400">€{summary.totalPot.toFixed(2)}</span></div>
        {summary.pendingCarry > 0 && (
          <div>Pending carry: <span className="font-bold text-blue-400">€{summary.pendingCarry.toFixed(2)}</span></div>
        )}
      </div>
      {game.extraBets && game.extraBets.length > 0 && (
        <div className="mb-4 card">
          <div className="font-semibold mb-2">Apuestas Extra</div>
          <ul className="text-sm flex flex-col gap-2">
            {game.extraBets.map((b: any, i: number) => (
              <li key={b.id} className="rounded bg-gray-900 px-3 py-2">
                <span className="font-bold">{BET_LABELS[b.type] || b.type}</span>
                {b.holeNumber && <span> (Hoyo {b.holeNumber})</span>}
                {b.amount && <span>: €{b.amount}</span>}
                {b.teamsInvolved && b.teamsInvolved.length > 0 && (
                  <span> [
                    {b.teamsInvolved.map((id: string) => game.teams.find((t: any) => t.id === id)?.name).join(", ")}
                  ]</span>
                )}
                {b.description && <span> - {b.description}</span>}
                {b.winnerTeamId && <span> | <span className="text-success">Ganador: {game.teams.find((t: any) => t.id === b.winnerTeamId)?.name}</span></span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mb-4 card">
        <div className="font-semibold mb-2">WhatsApp summary</div>
        <textarea className="w-full p-2 rounded bg-gray-900 text-white" rows={6} value={whatsapp} readOnly />
        <button className="btn btn-green mt-2 w-full" onClick={() => {navigator.clipboard.writeText(whatsapp)}}>Copy to WhatsApp</button>
      </div>
      <button className="btn btn-blue w-full mt-2" onClick={() => router.push('/')}>New Game</button>
    </div>
  );
}
