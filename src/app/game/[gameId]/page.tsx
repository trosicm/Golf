"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { createMockGame } from "../../../lib/golfrivals/mockGame";
import dynamic from "next/dynamic";
const Bets = dynamic(() => import("./bets"), { ssr: false });
import {
  getHandicapStrokes,
  calculateNetScore,
  calculateHolePot,
  getProvisionalHoleResult,
  buyMulligan,
  buyReverseMulligan,
  updateGrossScore,
  closeHole,
  recalculateTeamBalances,
} from "../../../lib/golfrivals/rules";

const mockGameInit = createMockGame();

export default function GameLive() {
  const params = useParams();
  const routeGameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;
  const [game, setGame] = useState(() => recalculateTeamBalances(mockGameInit));
  const [error, setError] = useState<string | null>(null);
  const [reverseTarget, setReverseTarget] = useState<{ buyingTeamId: string; targetTeamId: string } | null>(null);
  type EventLogEntry = { type: 'mulligan'; teamId: string; amount: number; hole: number } | { type: 'reverse'; teamId: string; targetTeamId: string; amount: number; hole: number };
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);

  const currentHoleIdx = game.holes.findIndex((h) => h.number === game.currentHole);
  const currentHole = game.holes[currentHoleIdx];
  const purchasesForHole = game.purchases.filter((p) => p.holeNumber === currentHole.number);
  const purchaseTotal = purchasesForHole.reduce((sum, p) => sum + p.cost, 0);
  const currentPot = calculateHolePot(currentHole.baseValue, currentHole.carryIn || 0, purchasesForHole);

  const scoresWithNet = currentHole.scores.map((s) => {
    const team = game.teams.find((t) => t.id === s.teamId)!;
    const handicapStrokes = getHandicapStrokes(team.handicap, currentHole.strokeIndex);
    const net = calculateNetScore(s.gross, handicapStrokes);
    return { ...s, handicapStrokes, net };
  });
  const provisional = getProvisionalHoleResult(currentHole, game.teams, scoresWithNet);

  const holesWon: Record<string, number> = {};
  game.teams.forEach((t) => (holesWon[t.id] = game.holes.filter((h) => h.winnerTeamId === t.id).length));

  const handleGrossChange = (teamId: string, value: string) => {
    const gross = value === "" ? 0 : Number(value);
    setGame((g) => recalculateTeamBalances(updateGrossScore(g, currentHole.number, teamId, gross)));
  };

  const handleBuyMulligan = (teamId: string) => {
    const updated = buyMulligan(game, currentHole.number, teamId);
    if (updated === game) {
      setError("Mulligan not allowed (limit 1 per hole, must have mulligans left, hole open)");
      return;
    }
    setEventLog((log) => [
      ...log,
      { type: "mulligan", teamId, amount: 50, hole: currentHole.number },
    ]);
    setGame(recalculateTeamBalances(updated));
    setError(null);
  };

  const handleBuyReverse = (buyingTeamId: string, targetTeamId: string) => {
    const updated = buyReverseMulligan(game, currentHole.number, buyingTeamId, targetTeamId);
    if (updated === game) {
      setError("Reverse not allowed (limit 1 per hole, must have reverses left, hole open, not already used)");
      return;
    }
    const potBefore = calculateHolePot(currentHole.baseValue, currentHole.carryIn || 0, purchasesForHole);
    setEventLog((log) => [
      ...log,
      { type: "reverse", teamId: buyingTeamId, targetTeamId, amount: potBefore, hole: currentHole.number },
    ]);
    setGame(recalculateTeamBalances(updated));
    setError(null);
    setReverseTarget(null);
  };

  const handleCloseHole = () => {
    if (currentHole.scores.some((s) => typeof s.gross !== "number" || isNaN(s.gross))) {
      setError("Enter all gross scores before closing the hole");
      return;
    }
    const updated = closeHole(game, currentHole.number);
    setGame(recalculateTeamBalances(updated));
    setEventLog([]);
    setError(null);
    if (currentHoleIdx + 1 < game.holes.length) {
      setGame((g) => ({ ...g, currentHole: g.holes[currentHoleIdx + 1].number }));
    }
  };

  return (
    <div className="p-2 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4 px-2 py-3 rounded-xl" style={{background: 'var(--card-bg)', border: '1px solid var(--card-border)'}}>
        <div>
          <div className="text-xs text-gray-400">HOLE</div>
          <div className="text-lg font-bold text-white">{currentHole.number} / 18</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">POT</div>
          <div className="text-lg font-bold" style={{color: 'var(--accent-gold)'}}>€{currentPot.toFixed(2)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">PAR / SI</div>
          <div className="text-lg font-bold text-white">{currentHole.par} / {currentHole.strokeIndex}</div>
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-400 mb-2 px-1">
        <span>Base: <span style={{color: 'var(--accent-gold)'}}>€{currentHole.baseValue.toFixed(2)}</span></span>
        <span>Carry: <span style={{color: 'var(--accent-blue)'}}>€{(currentHole.carryIn || 0).toFixed(2)}</span></span>
        <span>Compras: <span style={{color: 'var(--gr-turf)'}}>€{purchaseTotal.toFixed(2)}</span></span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3">
        {game.teams.map((team, idx) => {
          const score = currentHole.scores.find((s) => s.teamId === team.id)!;
          const handicapStrokes = getHandicapStrokes(team.handicap, currentHole.strokeIndex);
          const net = calculateNetScore(score.gross, handicapStrokes);
          const teamClass = `team-badge team-${idx + 1}`;
          const btnClass = `btn btn-team-${idx + 1}`;
          return (
            <div key={team.id} className="card flex flex-col gap-1 shadow-lg border border-gray-700">
              <div className="flex justify-between items-center mb-1">
                <span className={teamClass}>{team.name}</span>
                <div className="text-xs text-gray-400">HCP {team.handicap}</div>
              </div>
              <div className="text-xs text-gray-300 mb-1">{team.players[0].name} &amp; {team.players[1].name}</div>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  className="border border-gray-600 rounded-lg px-2 py-1 w-16 text-center bg-transparent text-white font-bold"
                  value={score.gross}
                  min={1}
                  max={20}
                  onChange={(e) => handleGrossChange(team.id, e.target.value)}
                  disabled={currentHole.isClosed}
                />
                <span className="text-xs text-gray-400">Gross</span>
                <span className="text-xs ml-2 text-blue-400">HCP: {handicapStrokes}</span>
                <span className="text-xs ml-2 text-gold-400">Net: {net}</span>
              </div>
              <div className="flex gap-2 mt-1 text-xs text-gray-400">
                <span>Mulligans: <span className="font-bold text-white">{team.mulligansAvailable}</span></span>
                <span>Reverse: <span className="font-bold text-white">{team.reverseMulligansAvailable}</span></span>
              </div>
              <div className="flex gap-2 mt-1 text-xs">
                <span>Spent: <span className="font-bold text-danger">€{team.moneySpent.toFixed(2)}</span></span>
                <span>Won: <span className="font-bold text-success">€{team.moneyWon.toFixed(2)}</span></span>
                <span>Balance: <span className={team.balance && team.balance > 0 ? "text-success" : team.balance && team.balance < 0 ? "text-danger" : "text-white"}>€{team.balance?.toFixed(2)}</span></span>
              </div>
              <div className="flex gap-2 mt-2">
                <button className={btnClass} onClick={() => handleBuyMulligan(team.id)} disabled={currentHole.isClosed}>Mulligan</button>
                <button className="btn btn-blue" onClick={() => setReverseTarget({ buyingTeamId: team.id, targetTeamId: game.teams[0].id })} disabled={currentHole.isClosed}>Reverse</button>
              </div>
            </div>
          );
        })}
      </div>

      {reverseTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="card" style={{minWidth: 220}}>
            <div className="mb-2 font-semibold text-white">Select target team for reverse</div>
            <div className="flex flex-col gap-2">
              {game.teams.filter(t => t.id !== reverseTarget.buyingTeamId).map(t => (
                <button key={t.id} className="btn btn-blue" onClick={() => handleBuyReverse(reverseTarget.buyingTeamId, t.id)}>{t.name}</button>
              ))}
            </div>
            <button className="mt-4 text-xs underline text-gray-400" onClick={() => setReverseTarget(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="my-4 card bg-opacity-80" style={{background: 'var(--card-bg)'}}>
        <div className="font-semibold text-white mb-1">Provisional result:</div>
        {currentHole.scores.some((s) => typeof s.gross !== "number" || isNaN(s.gross)) ? (
          <div className="text-xs text-gray-400">Enter all scores</div>
        ) : provisional.isTie ? (
          <div className="text-xs text-gold-400">Tie: {provisional.netScores.filter(ns => ns.net === Math.min(...provisional.netScores.map(n => n.net))).map(ns => game.teams.find(t => t.id === ns.teamId)?.name).join(", ")}</div>
        ) : (
          <div className="text-xs text-success">Winner: {game.teams.find(t => t.id === provisional.winnerTeamId)?.name}</div>
        )}
      </div>

      <div className="my-2 card bg-opacity-80" style={{background: 'var(--card-bg)'}}>
        <div className="font-semibold text-xs mb-1 text-white">Event log</div>
        <ul className="text-xs flex flex-col gap-1">
          {eventLog.map((e, i) => (
            <li key={i} className="rounded px-2 py-1" style={{background: 'rgba(95, 163, 106, 0.10)'}}>
              {e.type === "mulligan" && (
                <span className="text-success">{game.teams.find(t => t.id === e.teamId)?.name} bought Mulligan <span className="text-white">(€{e.amount})</span></span>
              )}
              {e.type === "reverse" && (
                <span className="text-blue-400">{game.teams.find(t => t.id === e.teamId)?.name} bought Reverse on {game.teams.find(t => t.id === e.targetTeamId)?.name} <span className="text-white">(€{e.amount})</span></span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <button className="w-full btn btn-gold text-lg font-bold mb-4" onClick={handleCloseHole} disabled={currentHole.isClosed}>Close Hole</button>

      {error && <div className="text-danger text-xs mb-2">{error}</div>}

      <Bets />

      <div className="my-4 card bg-opacity-80" style={{background: 'var(--card-bg)'}}>
        <div className="font-semibold mb-1 text-white">Scoreboard</div>
        <table className="w-full text-xs scoreboard-table">
          <thead>
            <tr>
              <th className="text-left">Team</th>
              <th>Holes</th>
              <th>Spent</th>
              <th>Won</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {game.teams.map((t, idx) => (
              <tr key={t.id}>
                <td className={`font-bold team-badge team-${idx + 1}`}>{t.name}</td>
                <td className="text-center">{holesWon[t.id]}</td>
                <td className="text-center text-danger">€{t.moneySpent.toFixed(2)}</td>
                <td className="text-center text-success">€{t.moneyWon.toFixed(2)}</td>
                <td className={t.balance && t.balance > 0 ? 'text-success text-center' : t.balance && t.balance < 0 ? 'text-danger text-center' : 'text-white text-center'}>€{t.balance?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <a href={`/game/${routeGameId}/summary`} className="block w-full btn btn-green text-lg font-bold mb-4">View Final Summary</a>
    </div>
  );
}
