import { Team, Hole, Score, Purchase } from '../types/game';

export function getHandicapStrokes(teamHandicap: number, strokeIndex: number): number {
  const fullStrokes = Math.floor(teamHandicap / 18);
  const extraStrokes = teamHandicap % 18;
  let strokes = fullStrokes;
  if (strokeIndex <= extraStrokes) strokes += 1;
  return strokes;
}

export function calculateNetScore(grossScore: number, handicapStrokes: number): number {
  return grossScore - handicapStrokes;
}

export function calculateHolePot(baseValue: number, carryIn: number, purchases: Purchase[]): number {
  let pot = baseValue + carryIn;
  for (const p of purchases) {
    pot += p.cost;
  }
  return pot;
}

export function getProvisionalHoleResult(
  _hole: Hole,
  _teams: Team[],
  scores: Score[],
): { winnerTeamId?: string; isTie: boolean; netScores: { teamId: string; net: number }[] } {
  const netScores = scores.map((score) => ({ teamId: score.teamId, net: score.net }));
  const minNet = Math.min(...netScores.map((netScore) => netScore.net));
  const winners = netScores.filter((netScore) => netScore.net === minNet);

  if (winners.length === 1) {
    return { winnerTeamId: winners[0].teamId, isTie: false, netScores };
  }

  return { isTie: true, netScores };
}
