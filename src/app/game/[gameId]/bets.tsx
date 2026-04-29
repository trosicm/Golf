"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

const BET_TYPES = [
  { type: "long-drive", label: "Long Drive" },
  { type: "nearest-pin", label: "Nearest to the Pin" },
  { type: "birdie-pool", label: "Birdie Pool" },
  { type: "match-play", label: "Match Play" },
  { type: "custom", label: "Custom" },
];

export default function Bets() {
  const params = useParams();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;
  const [game, setGame] = useState<any>(null);
  const [type, setType] = useState("long-drive");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [hole, setHole] = useState("");
  const [teams, setTeams] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!gameId) return;
    const stored = localStorage.getItem(`golfrivals-game-${gameId}`);
    if (stored) setGame(JSON.parse(stored));
  }, [gameId]);

  if (!game) return null;

  const handleAddBet = (e: any) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (type === "custom" && !desc) {
      setError("Enter a description");
      return;
    }
    const bet = {
      id: uuidv4(),
      type,
      description: desc,
      teamsInvolved: teams,
      holeNumber: hole ? Number(hole) : undefined,
      amount: Number(amount),
      status: "open",
    };
    const updated = { ...game, extraBets: [...(game.extraBets || []), bet] };
    localStorage.setItem(`golfrivals-game-${gameId}`, JSON.stringify(updated));
    setGame(updated);
    setType("long-drive"); setAmount(""); setDesc(""); setHole(""); setTeams([]); setError("");
  };

  // Nueva función para iniciar cierre de apuesta
  const handleSetWinner = (betId: string, winnerTeamId: string) => {
    const updatedBets = (game.extraBets || []).map((b: any) =>
      b.id === betId
        ? {
            ...b,
            winnerTeamId,
            status: 'pending-confirmation',
            confirmations: b.teamsInvolved.map((teamId: string) => ({ teamId, confirmed: false })),
          }
        : b
    );
    const updated = { ...game, extraBets: updatedBets };
    localStorage.setItem(`golfrivals-game-${gameId}`, JSON.stringify(updated));
    setGame(updated);
  };

  // Confirmar resultado por equipo
  const handleConfirmBet = (betId: string, teamId: string) => {
    const updatedBets = (game.extraBets || []).map((b: any) => {
      if (b.id !== betId) return b;
      const confirmations = (b.confirmations || []).map((c: any) =>
        c.teamId === teamId ? { ...c, confirmed: true } : c
      );
      // Si todos confirman, cerrar apuesta
      const allConfirmed = confirmations.every((c: any) => c.confirmed);
      return {
        ...b,
        confirmations,
        status: allConfirmed ? 'closed' : 'pending-confirmation',
      };
    });
    const updated = { ...game, extraBets: updatedBets };
    localStorage.setItem(`golfrivals-game-${gameId}`, JSON.stringify(updated));
    setGame(updated);
  };

  return (
    <div className="p-4 card mb-4">
      <h2 className="text-xl font-bold mb-2">Extra Bets</h2>
      <form onSubmit={handleAddBet} className="flex flex-col gap-2 mb-4">
        <select value={type} onChange={e => setType(e.target.value)} className="input input-bordered">
          {BET_TYPES.map(b => <option key={b.type} value={b.type}>{b.label}</option>)}
        </select>
        {type === "custom" && (
          <input type="text" className="input input-bordered" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
        )}
        <input type="number" className="input input-bordered" placeholder="Amount (€)" value={amount} onChange={e => setAmount(e.target.value)} />
        <input type="number" className="input input-bordered" placeholder="Hole (optional)" value={hole} onChange={e => setHole(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {game.teams.map((t: any) => (
            <label key={t.id} className={`team-badge team-${game.teams.indexOf(t)+1}`}>
              <input type="checkbox" checked={teams.includes(t.id)} onChange={e => {
                if (e.target.checked) setTeams([...teams, t.id]);
                else setTeams(teams.filter(id => id !== t.id));
              }} /> {t.name}
            </label>
          ))}
        </div>
        <button type="submit" className="btn btn-gold">Add Bet</button>
        {error && <div className="text-danger text-xs">{error}</div>}
      </form>
      <div>
        <h3 className="font-semibold mb-2">Current Bets</h3>
        <ul className="text-sm flex flex-col gap-2">
          {(game.extraBets || []).map((b: any) => (
            <li key={b.id} className="rounded bg-gray-900 px-3 py-2">
              <span className="font-bold">{BET_TYPES.find(bt => bt.type === b.type)?.label || b.type}</span> - €{b.amount}
              {b.holeNumber && <span> (Hole {b.holeNumber})</span>}
              {b.description && <span> - {b.description}</span>}
              <br/>
              <span className="text-xs">Teams: {b.teamsInvolved.map((id: string) => game.teams.find((t: any) => t.id === id)?.name).join(", ")}</span>
              <span className="ml-2 text-xs">Status: {b.status}</span>
              {/* Si está abierta, permitir marcar ganador */}
              {b.status === 'open' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-xs">Marcar ganador:</span>
                  {b.teamsInvolved.map((id: string) => (
                    <button key={id} className="btn btn-blue btn-xs" onClick={() => handleSetWinner(b.id, id)}>
                      {game.teams.find((t: any) => t.id === id)?.name}
                    </button>
                  ))}
                </div>
              )}
              {/* Si está pendiente de confirmación, mostrar confirmaciones */}
              {b.status === 'pending-confirmation' && (
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-xs">Confirmaciones:</span>
                  {b.confirmations?.map((c: any) => (
                    <div key={c.teamId} className="flex items-center gap-2">
                      <span>{game.teams.find((t: any) => t.id === c.teamId)?.name}:</span>
                      {c.confirmed ? (
                        <span className="text-success">✔️ Confirmado</span>
                      ) : (
                        <button className="btn btn-gold btn-xs" onClick={() => handleConfirmBet(b.id, c.teamId)}>
                          Confirmar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Si está cerrada, mostrar ganador */}
              {b.status === 'closed' && b.winnerTeamId && (
                <div className="mt-2 text-xs text-success">Ganador: {game.teams.find((t: any) => t.id === b.winnerTeamId)?.name}</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
