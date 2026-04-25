import { Game, Team, Hole } from '../../types/game';
import { VILLAMARTIN_COURSE } from './course';
import { v4 as uuidv4 } from 'uuid';

export function createMockGame(): Game {
  const teams: Team[] = [0, 1, 2, 3].map((i) => ({
    id: uuidv4(),
    name: `Team ${i + 1}`,
    players: [
      { name: `Player ${i * 2 + 1}` },
      { name: `Player ${i * 2 + 2}` },
    ],
    handicap: 10 + i * 2,
    mulligansAvailable: 5,
    mulligansUsed: 0,
    reverseMulligansAvailable: 2,
    reverseMulligansUsed: 0,
    moneySpent: 0,
    moneyWon: 0,
    code: `${100000 + i}`,
  }));

  const holes: Hole[] = VILLAMARTIN_COURSE.map((h) => ({
    number: h.number,
    par: h.par,
    strokeIndex: h.strokeIndex,
    baseValue: 65,
    carryOver: 0,
    pot: 65,
    scores: teams.map((t) => ({
      teamId: t.id,
      gross: 5,
      handicapStrokes: 0,
      net: 5,
      mulliganUsed: false,
      reverseMulliganUsed: false,
    })),
    isClosed: false,
  }));

  return {
    id: uuidv4(),
    teams,
    holes,
    purchases: [],
    extraBets: [],
    currentHole: 1,
    status: 'in-progress',
  };
}
