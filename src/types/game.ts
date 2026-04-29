export type Player = {
  name: string;
};

export type Team = {
  id: string;
  name: string;
  players: [Player, Player];
  handicap: number;
  mulligansAvailable: number;
  mulligansUsed: number;
  reverseMulligansAvailable: number;
  reverseMulligansUsed: number;
  moneySpent: number;
  moneyWon: number;
  balance?: number;
  code: string; // login code for this team
  markerForTeamId?: string; // team this team is assigned to mark
};
// Extra bet types
export type ExtraBetType = 'long-drive' | 'nearest-pin' | 'birdie-pool' | 'match-play' | 'custom';

export type ExtraBet = {
  id: string;
  type: ExtraBetType;
  description?: string; // for custom
  teamsInvolved: string[]; // team ids
  holeNumber?: number; // for bets on a specific hole
  amount: number;
  status: 'open' | 'pending-confirmation' | 'closed';
  winnerTeamId?: string;
  confirmations?: { teamId: string; confirmed: boolean }[];
};

export type Hole = {
  number: number;
  par: number;
  strokeIndex: number;
  baseValue: number;
  carryIn?: number;
  carryOver: number;
  pot: number;
  scores: Score[];
  winnerTeamId?: string;
  isClosed: boolean;
};

export type Score = {
  teamId: string;
  gross: number;
  handicapStrokes: number;
  net: number;
  mulliganUsed: boolean;
  reverseMulliganUsed: boolean;
};

export type Purchase = {
  teamId: string;
  type: 'mulligan' | 'reverse-mulligan';
  holeNumber: number;
  cost: number;
  timestamp: number;
  targetTeamId?: string; // for reverse-mulligan
};

export type Game = {
  id: string;
  teams: Team[];
  holes: Hole[];
  purchases: Purchase[];
  extraBets: ExtraBet[];
  currentHole: number;
  status: 'setup' | 'in-progress' | 'finished';
};
