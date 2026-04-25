// Returns the base contribution per team for a hole
export function getBaseContributionPerTeam(holeBaseValue: number, teamCount: number): number {
  return holeBaseValue / teamCount;
}
import { Game, Team, Hole, Score, Purchase } from '../../types/game';

// Returns the number of handicap strokes a team receives on a given hole (by SI)
export function getHandicapStrokes(teamHandicap: number, strokeIndex: number): number {
  // SI is 1 (hardest) to 18 (easiest)
  // For HCP 8: 1 stroke on SI 1-8, 0 on 9-18
  // For HCP 18: 1 stroke on all
  // For HCP 22: 2 strokes on SI 1-4, 1 on 5-18
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

export function getProvisionalHoleResult(hole: Hole, teams: Team[], scores: Score[]): { winnerTeamId?: string; isTie: boolean; netScores: { teamId: string; net: number }[] } {
  const netScores = scores.map(s => ({ teamId: s.teamId, net: s.net }));
  const minNet = Math.min(...netScores.map(ns => ns.net));
  const winners = netScores.filter(ns => ns.net === minNet);
  if (winners.length === 1) {
    return { winnerTeamId: winners[0].teamId, isTie: false, netScores };
  }
  return { isTie: true, netScores };
}

export function buyMulligan(game: Game, holeNumber: number, teamId: string): Game {
  const holeIdx = game.holes.findIndex(h => h.number === holeNumber);
  if (holeIdx === -1) return game;
  const hole = game.holes[holeIdx];
  if (hole.isClosed) return game;
  const team = game.teams.find(t => t.id === teamId);
  if (!team || team.mulligansAvailable < 1) return game;
  const score = hole.scores.find(s => s.teamId === teamId);
  if (!score || score.mulliganUsed) return game;
  // Only 1 mulligan per team per hole
  // Add purchase
  const newPurchase: Purchase = {
    teamId,
    type: 'mulligan',
    holeNumber,
    cost: 50,
    timestamp: Date.now(),
  };
  // Update state
  return {
    ...game,
    teams: game.teams.map(t => t.id === teamId ? { ...t, mulligansAvailable: t.mulligansAvailable - 1, mulligansUsed: t.mulligansUsed + 1 } : t),
    holes: game.holes.map((h, i) => i === holeIdx ? {
      ...h,
      scores: h.scores.map(s => s.teamId === teamId ? { ...s, mulliganUsed: true } : s)
    } : h),
    purchases: [...game.purchases, newPurchase],
  };
}

export function buyReverseMulligan(game: Game, holeNumber: number, buyingTeamId: string, targetTeamId: string): Game {
  const holeIdx = game.holes.findIndex(h => h.number === holeNumber);
  if (holeIdx === -1) return game;
  const hole = game.holes[holeIdx];
  if (hole.isClosed) return game;
  // Only 1 reverse mulligan per hole
  const anyReverse = game.purchases.some(p => p.holeNumber === holeNumber && p.type === 'reverse-mulligan');
  if (anyReverse) return game;
  const team = game.teams.find(t => t.id === buyingTeamId);
  if (!team || team.reverseMulligansAvailable < 1) return game;
  // Cost is current pot before purchase
  const purchasesForHole = game.purchases.filter(p => p.holeNumber === holeNumber);
  const potBefore = calculateHolePot(hole.baseValue, hole.carryIn || 0, purchasesForHole);
  const newPurchase: Purchase = {
    teamId: buyingTeamId,
    type: 'reverse-mulligan',
    holeNumber,
    cost: potBefore,
    timestamp: Date.now(),
    targetTeamId,
  };
  // Update state
  return {
    ...game,
    teams: game.teams.map(t => t.id === buyingTeamId ? { ...t, reverseMulligansAvailable: t.reverseMulligansAvailable - 1, reverseMulligansUsed: t.reverseMulligansUsed + 1 } : t),
    holes: game.holes.map((h, i) => i === holeIdx ? {
      ...h,
      scores: h.scores.map(s => s.teamId === targetTeamId ? { ...s, reverseMulliganUsed: true } : s)
    } : h),
    purchases: [...game.purchases, newPurchase],
  };
}

export function updateGrossScore(game: Game, holeNumber: number, teamId: string, grossScore: number): Game {
  const holeIdx = game.holes.findIndex(h => h.number === holeNumber);
  if (holeIdx === -1) return game;
  const hole = game.holes[holeIdx];
  const team = game.teams.find(t => t.id === teamId);
  if (!team) return game;
  const handicapStrokes = getHandicapStrokes(team.handicap, hole.strokeIndex);
  const net = calculateNetScore(grossScore, handicapStrokes);
  return {
    ...game,
    holes: game.holes.map((h, i) => i === holeIdx ? {
      ...h,
      scores: h.scores.map(s => s.teamId === teamId ? { ...s, gross: grossScore, handicapStrokes, net } : s)
    } : h),
  };
}

export function closeHole(game: Game, holeNumber: number): Game {
  const holeIdx = game.holes.findIndex(h => h.number === holeNumber);
  if (holeIdx === -1) return game;
  const hole = game.holes[holeIdx];
  if (hole.isClosed) return game;
  // Require all teams to have a gross score
  if (hole.scores.some(s => typeof s.gross !== 'number' || isNaN(s.gross))) return game;
  // Calculate net scores
  const updatedScores = hole.scores.map(s => {
    const team = game.teams.find(t => t.id === s.teamId);
    const handicapStrokes = team ? getHandicapStrokes(team.handicap, hole.strokeIndex) : 0;
    return {
      ...s,
      handicapStrokes,
      net: calculateNetScore(s.gross, handicapStrokes),
    };
  });
  const result = getProvisionalHoleResult(hole, game.teams, updatedScores);
  let winnerTeamId: string | undefined = result.winnerTeamId;
  let carryOver = 0;
  const pot = calculateHolePot(hole.baseValue, hole.carryIn || 0, game.purchases.filter(p => p.holeNumber === holeNumber));
  const nextHoles = [...game.holes];
  if (result.isTie) {
    carryOver = pot;
    winnerTeamId = undefined;
    // Next hole carryIn = carryOver
    if (holeIdx + 1 < game.holes.length) {
      nextHoles[holeIdx + 1] = {
        ...nextHoles[holeIdx + 1],
        carryIn: (nextHoles[holeIdx + 1].carryIn || 0) + carryOver,
      };
    }
  } else if (winnerTeamId) {
    // Winner gets pot, no carry
    carryOver = 0;
    if (holeIdx + 1 < game.holes.length) {
      nextHoles[holeIdx + 1] = {
        ...nextHoles[holeIdx + 1],
        carryIn: 0,
      };
    }
  }
  // Update this hole
  nextHoles[holeIdx] = {
    ...hole,
    scores: updatedScores,
    winnerTeamId,
    carryOver,
    pot,
    isClosed: true,
  };
  // Recalculate balances
  const newGame = {
    ...game,
    holes: nextHoles,
  };
  return recalculateTeamBalances(newGame);
}

// A hole is chargeable if:
// - it is closed, or
// - any score or purchase exists for that hole, or
// - it is the current active hole
function isHoleChargeable(hole: Hole, game: Game): boolean {
  if (hole.isClosed) return true;
  if (hole.scores.some(s => typeof s.gross === 'number' && !isNaN(s.gross))) return true;
  if (game.purchases.some(p => p.holeNumber === hole.number)) return true;
  if (game.currentHole === hole.number) return true;
  return false;
}

export function recalculateTeamBalances(game: Game): Game {
  const teamCount = game.teams.length;
  const teamMoneySpent: Record<string, number> = {};
  const teamMoneyWon: Record<string, number> = {};
  // For each team, sum base contributions for all chargeable holes
  for (const team of game.teams) {
    let spent = 0;
    for (const hole of game.holes) {
      if (isHoleChargeable(hole, game)) {
        spent += getBaseContributionPerTeam(hole.baseValue, teamCount);
      }
    }
    spent += game.purchases.filter(p => p.teamId === team.id).reduce((sum, p) => sum + p.cost, 0);
    teamMoneySpent[team.id] = spent;
    teamMoneyWon[team.id] = game.holes.filter(h => h.winnerTeamId === team.id).reduce((sum, h) => sum + h.pot, 0);
  }
  return {
    ...game,
    teams: game.teams.map(t => ({
      ...t,
      moneySpent: teamMoneySpent[t.id],
      moneyWon: teamMoneyWon[t.id],
      balance: teamMoneyWon[t.id] - teamMoneySpent[t.id],
    })),
  };
}

export function getFinalSettlement(game: Game) {
  // Teams ordered by balance descending
  const teams = [...game.teams].map(t => ({ ...t })).sort((a, b) => (b.balance || 0) - (a.balance || 0));
  const totalSpent = teams.reduce((sum, t) => sum + (t.moneySpent || 0), 0);
  const totalWon = teams.reduce((sum, t) => sum + (t.moneyWon || 0), 0);
  const totalPot = game.holes.reduce((sum, h) => sum + (h.pot || 0), 0);
  const pendingCarry = game.holes[game.holes.length - 1]?.carryOver || 0;
  // WhatsApp summary
  let summary = '🏌️‍♂️ Golfrivals Final Settlement\n';
  teams.forEach((t, i) => {
    summary += `${i + 1}. ${t.name}: €${t.balance?.toFixed(2)} (Won: €${t.moneyWon?.toFixed(2)}, Spent: €${t.moneySpent?.toFixed(2)})\n`;
  });
  summary += `Total pot: €${totalPot.toFixed(2)}\n`;
  if (pendingCarry > 0) summary += `Pending carry: €${pendingCarry.toFixed(2)}\n`;
  return {
    teams,
    totalSpent,
    totalWon,
    totalPot,
    pendingCarry,
    whatsapp: summary,
  };
}

// --- TEST EXAMPLES (console-friendly) ---
function _testExamples() {
  // HCP 8 on SI 4 gives 1 stroke
  console.log('HCP 8, SI 4:', getHandicapStrokes(8, 4)); // 1
  // HCP 8 on SI 14 gives 0 strokes
  console.log('HCP 8, SI 14:', getHandicapStrokes(8, 14)); // 0
  // HCP 22 on SI 3 gives 2 strokes
  console.log('HCP 22, SI 3:', getHandicapStrokes(22, 3)); // 2
  // Reverse cost equals current pot before purchase
  const pot = calculateHolePot(65, 0, [{ teamId: 'a', type: 'mulligan', holeNumber: 1, cost: 50, timestamp: 1 }]);
  console.log('Pot after 1 mulligan:', pot); // 115
  // Tied hole carries full pot to next hole
  // Unique winner receives full pot

  // Base contribution per team
  console.log('Base contribution per team:', getBaseContributionPerTeam(65, 4)); // 16.25

  // Economic scenario test
  // Hole 1: base 65, 4 teams, A mulligan (50), B reverse (115), C wins
  const teams = [
    { id: 'A', name: 'A', players: [{ name: 'A1' }, { name: 'A2' }] as [any, any], handicap: 0, mulligansAvailable: 5, mulligansUsed: 0, reverseMulligansAvailable: 2, reverseMulligansUsed: 0, moneySpent: 0, moneyWon: 0 },
    { id: 'B', name: 'B', players: [{ name: 'B1' }, { name: 'B2' }] as [any, any], handicap: 0, mulligansAvailable: 5, mulligansUsed: 0, reverseMulligansAvailable: 2, reverseMulligansUsed: 0, moneySpent: 0, moneyWon: 0 },
    { id: 'C', name: 'C', players: [{ name: 'C1' }, { name: 'C2' }] as [any, any], handicap: 0, mulligansAvailable: 5, mulligansUsed: 0, reverseMulligansAvailable: 2, reverseMulligansUsed: 0, moneySpent: 0, moneyWon: 0 },
    { id: 'D', name: 'D', players: [{ name: 'D1' }, { name: 'D2' }] as [any, any], handicap: 0, mulligansAvailable: 5, mulligansUsed: 0, reverseMulligansAvailable: 2, reverseMulligansUsed: 0, moneySpent: 0, moneyWon: 0 },
  ];
  const purchases = [
    { teamId: 'A', type: 'mulligan' as const, holeNumber: 1, cost: 50, timestamp: 1 },
    { teamId: 'B', type: 'reverse-mulligan' as const, holeNumber: 1, cost: 115, timestamp: 2, targetTeamId: 'C' },
  ];
  const holes = [
    { number: 1, par: 4, strokeIndex: 1, baseValue: 65, carryIn: 0, carryOver: 0, pot: 230, scores: [], isClosed: true, winnerTeamId: 'C' },
  ];
  const game = { id: 'g', teams, holes, purchases, currentHole: 1, status: 'in-progress' as const };
  const balanced = recalculateTeamBalances(game);
  console.log('A spent', balanced.teams[0].moneySpent); // 66.25
  console.log('B spent', balanced.teams[1].moneySpent); // 131.25
  console.log('C spent', balanced.teams[2].moneySpent); // 16.25
  console.log('D spent', balanced.teams[3].moneySpent); // 16.25
  console.log('C won', balanced.teams[2].moneyWon); // 230
  console.log('A balance', balanced.teams[0].balance); // -66.25
  console.log('B balance', balanced.teams[1].balance); // -131.25
  console.log('C balance', balanced.teams[2].balance); // 213.75
  console.log('D balance', balanced.teams[3].balance); // -16.25
  const totalBalance = balanced.teams.reduce((sum, t) => sum + (t.balance || 0), 0);
  console.log('Total balance', totalBalance); // 0
}
