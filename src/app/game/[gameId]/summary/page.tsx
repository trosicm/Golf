"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFinalSettlement } from "../../../../lib/golfrivals/rules";
import type { ExtraBet, Game, Team } from "../../../../types/game";

const BET_LABELS: Record<string, string> = {
  "long-drive": "Long Drive",
  "nearest-pin": "Nearest to the Pin",
  "birdie-pool": "Birdie Pool",
  "match-play": "Match Play",
  "custom": "Custom",
};

type FinalSettlement = ReturnType<typeof getFinalSettlement>;

export default function GameSummary() {
  const params = useParams();
  const router = useRouter();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;
  const [game, setGame] = useState<Game | null>(null);
  const [summary, setSummary] = useState<FinalSettlement | null>(null);

  useEffect(() => {
    if (!gameId) return;
    const stored = localStorage.getItem(`golfrivals-game-${gameId}`);
    if (stored) {
      const parsedGame = JSON.parse(stored) as Game;
      setGame(parsedGame);
      setSummary(getFinalSettlement(parsedGame));
    }
  }, [gameId]);

  if (!game || !summary) return <div className="p-4 text-white">Loading summary...</div>;

  let whatsapp = summary.whatsapp;
  if (game.extraBets && game.extraBets.length > 0) {
    whatsapp += `\n\nApuestas Extra:\n`;
    game.extraBets.forEach((bet: ExtraBet) => {
      whatsapp += `- ${BET_LABELS[bet.type] || bet.type}`;
      if (bet.holeNumber) whatsapp += ` (Hoyo ${bet.holeNumber})`;
      if (bet.amount) whatsapp += `: €${bet.amount}`;
      if (bet.teamsInvolved && bet.teamsInvolved.length > 0) {
        whatsapp += ` [${bet.teamsInvolved
          .map((id: string) => game.teams.find((team: Team) => team.id === id)?.name)
          .join(", ")}]`;
      }
      if (bet.description) whatsapp += ` - ${bet.description}`;
      if (bet.winnerTeamId) {
        whatsapp += ` | Ganador: ${game.teams.find((team: Team) => team.id === bet.winnerTeamId)?.name}`;
      }
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
            {summary.teams.map((team: Team, idx: number) => (
              <tr key={team.id}>
                <td className={`font-bold team-badge team-${idx + 1}`}>{team.name}</td>
                <td className="text-center text-danger">€{team.moneySpent.toFixed(2)}</td>
                <td className="text-center text-success">€{team.moneyWon.toFixed(2)}</td>
                <td
                  className={
                    team.balance && team.balance > 0
                      ? "text-success text-center"
                      : team.balance && team.balance < 0
                        ? "text-danger text-center"
                        : "text-white text-center"
                  }
                >
                  €{team.balance?.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mb-4 card">
        <div>
          Total pot: <span className="font-bold text-gold-400">€{summary.totalPot.toFixed(2)}</span>
        </div>
        {summary.pendingCarry > 0 && (
          <div>
            Pending carry:{" "}
            <span className="font-bold text-blue-400">€{summary.pendingCarry.toFixed(2)}</span>
          </div>
        )}
      </div>
      {game.extraBets && game.extraBets.length > 0 && (
        <div className="mb-4 card">
          <div className="font-semibold mb-2">Apuestas Extra</div>
          <ul className="text-sm flex flex-col gap-2">
            {game.extraBets.map((bet: ExtraBet) => (
              <li key={bet.id} className="rounded bg-gray-900 px-3 py-2">
                <span className="font-bold">{BET_LABELS[bet.type] || bet.type}</span>
                {bet.holeNumber && <span> (Hoyo {bet.holeNumber})</span>}
                {bet.amount && <span>: €{bet.amount}</span>}
                {bet.teamsInvolved && bet.teamsInvolved.length > 0 && (
                  <span>
                    {" "}
                    [
                    {bet.teamsInvolved
                      .map((id: string) => game.teams.find((team: Team) => team.id === id)?.name)
                      .join(", ")}
                    ]
                  </span>
                )}
                {bet.description && <span> - {bet.description}</span>}
                {bet.winnerTeamId && (
                  <span>
                    {" "}| <span className="text-success">Ganador: {game.teams.find((team: Team) => team.id === bet.winnerTeamId)?.name}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mb-4 card">
        <div className="font-semibold mb-2">WhatsApp summary</div>
        <textarea className="w-full p-2 rounded bg-gray-900 text-white" rows={6} value={whatsapp} readOnly />
        <button className="btn btn-green mt-2 w-full" onClick={() => navigator.clipboard.writeText(whatsapp)}>
          Copy to WhatsApp
        </button>
      </div>
      <button className="btn btn-blue w-full mt-2" onClick={() => router.push("/")}>New Game</button>
    </div>
  );
}
