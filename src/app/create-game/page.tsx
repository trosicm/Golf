"use client";
import { useState } from 'react';

import { Team, Player, Game, Hole, Purchase, Score } from '../../types/game';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { VILLAMARTIN_COURSE } from '../../lib/golfrivals/course';

const defaultTeams = [0, 1, 2, 3].map((i) => ({
  id: uuidv4(),
  name: `Team ${i + 1}`,
  players: [{ name: '' }, { name: '' }] as [Player, Player],
  handicap: 0,
  mulligansAvailable: 5,
  mulligansUsed: 0,
  reverseMulligansAvailable: 2,
  reverseMulligansUsed: 0,
  moneySpent: 0,
  moneyWon: 0,
  code: '', // placeholder, will be set on submit
}));

export default function CreateGame() {
  const [teams, setTeams] = useState<Team[]>(defaultTeams);
  const router = useRouter();

  const handleChange = (teamIdx: number, field: string, value: string | number) => {
    setTeams((prev) => {
      const updated = [...prev];
      if (field === 'player1') updated[teamIdx].players[0].name = value as string;
      else if (field === 'player2') updated[teamIdx].players[1].name = value as string;
      else if (field === 'handicap') updated[teamIdx].handicap = Number(value);
      // Add more fields as needed
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gameId = uuidv4();
    // Generate unique 6-digit codes for each team
    const codes = [];
    while (codes.length < teams.length) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      if (!codes.includes(code)) codes.push(code);
    }
    // Assign random marker (circular shuffle)
    const shuffled = [...teams.keys()];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const teamsWithCodes: Team[] = teams.map((t, i) => ({
      ...t,
      code: codes[i],
      markerForTeamId: teams[shuffled[(i + 1) % teams.length]].id,
    }));
    // Build holes for this game
    const holes: Hole[] = VILLAMARTIN_COURSE.map((h) => ({
      number: h.number,
      par: h.par,
      strokeIndex: h.strokeIndex,
      baseValue: 65,
      carryOver: 0,
      pot: 65,
      scores: teamsWithCodes.map((t) => ({
        teamId: t.id,
        gross: 0,
        handicapStrokes: 0,
        net: 0,
        mulliganUsed: false,
        reverseMulliganUsed: false,
      })),
      isClosed: false,
    }));
    const game: Game = {
      id: gameId,
      teams: teamsWithCodes,
      holes,
      purchases: [],
      extraBets: [],
      currentHole: 1,
      status: 'in-progress',
    };
    localStorage.setItem(`golfrivals-game-${gameId}`, JSON.stringify(game));
    router.push(`/game/${gameId}`);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-green-900">Create Game</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {teams.map((team, idx) => (
          <div key={team.id} className="card mb-2">
            <span className={`team-badge team-${idx + 1} mb-2`}>Team {idx + 1}</span>
            <div className="flex flex-col gap-2 mt-2">
              <input
                type="text"
                placeholder="Player 1 Name"
                className="input input-bordered"
                value={team.players[0].name}
                onChange={(e) => handleChange(idx, 'player1', e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Player 2 Name"
                className="input input-bordered"
                value={team.players[1].name}
                onChange={(e) => handleChange(idx, 'player2', e.target.value)}
                required
              />
              <input
                type="number"
                placeholder="Team Handicap"
                className="input input-bordered"
                value={team.handicap}
                min={0}
                max={36}
                onChange={(e) => handleChange(idx, 'handicap', Number(e.target.value))}
                required
              />
            </div>
          </div>
        ))}
        <button type="submit" className="w-full bg-green-600 text-white py-3 rounded font-semibold hover:bg-green-700 transition">Start Game</button>
      </form>
    </div>
  );
}
