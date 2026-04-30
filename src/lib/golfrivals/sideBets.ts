export type SideBetScope = "hole" | "front_9" | "back_9" | "round" | "event" | "custom";

export type SideBetCategory =
  | "quick"
  | "tee"
  | "precision"
  | "green"
  | "result"
  | "segment"
  | "event"
  | "round"
  | "penalty"
  | "custom";

export type SideBetType =
  | "LONGEST_DRIVE"
  | "LONGEST_DRIVE_FAIRWAY"
  | "CLOSEST_TO_PIN"
  | "CLOSEST_TO_PIN_PAR_3"
  | "BALL_ON_GREEN"
  | "NO_THREE_PUTTS"
  | "PAR_OR_BETTER"
  | "BIRDIE_OR_BETTER"
  | "NO_WORSE_THAN_BOGEY"
  | "WIN_HOLE"
  | "TIE_HOLE"
  | "WIN_FRONT_9"
  | "TIE_FRONT_9"
  | "WIN_BACK_9"
  | "TIE_BACK_9"
  | "WIN_18"
  | "TIE_18"
  | "REACH_PAR_5_IN_TWO"
  | "REACH_PAR_4_IN_ONE"
  | "FIRST_OUT_OF_BOUNDS"
  | "FIRST_WATER"
  | "FIRST_BIRDIE"
  | "MOST_BIRDIES_ROUND"
  | "MOST_PARS_ROUND"
  | "MOST_FAIRWAYS_ROUND"
  | "FEWEST_LOST_BALLS"
  | "DOES_NOT_PASS_RED_TEES"
  | "HIT_OUT_OF_BOUNDS"
  | "CUSTOM_BET";

export type SideBetPreset = {
  type: SideBetType;
  title: string;
  category: Exclude<SideBetCategory, "quick">;
  scope: SideBetScope;
  description: string;
  isQuick: boolean;
  requiresManualResolution: boolean;
};

export const SIDE_BET_CATEGORY_LABELS: Record<Exclude<SideBetCategory, "quick"> | "quick", string> = {
  quick: "Rápidas",
  tee: "Tee",
  precision: "Precisión",
  green: "Green",
  result: "Resultado",
  segment: "Tramos",
  event: "Eventos",
  round: "Ronda",
  penalty: "Castigos",
  custom: "Apuesta libre",
};

export const SIDE_BET_CATEGORY_ORDER: Array<Exclude<SideBetCategory, "quick"> | "quick"> = [
  "quick",
  "tee",
  "precision",
  "green",
  "result",
  "segment",
  "event",
  "round",
  "penalty",
  "custom",
];

export const SIDE_BET_PRESETS: SideBetPreset[] = [
  { type: "LONGEST_DRIVE", title: "Drive más largo", category: "tee", scope: "hole", description: "Gana el equipo con la salida más larga.", isQuick: true, requiresManualResolution: true },
  { type: "LONGEST_DRIVE_FAIRWAY", title: "Drive más largo en calle", category: "tee", scope: "hole", description: "Gana el drive más largo, pero solo si queda en calle.", isQuick: true, requiresManualResolution: true },
  { type: "CLOSEST_TO_PIN", title: "Bola más cercana", category: "precision", scope: "hole", description: "Gana quien deje la bola más cerca del hoyo.", isQuick: true, requiresManualResolution: true },
  { type: "CLOSEST_TO_PIN_PAR_3", title: "Closest par 3", category: "precision", scope: "hole", description: "Bola más cercana a bandera en par 3.", isQuick: false, requiresManualResolution: true },
  { type: "BALL_ON_GREEN", title: "Bola en green", category: "precision", scope: "hole", description: "Apuesta simple: sí o no sobre dejar la bola en green.", isQuick: true, requiresManualResolution: true },
  { type: "NO_THREE_PUTTS", title: "No tres putts", category: "green", scope: "hole", description: "Gana si el equipo no hace tres putts.", isQuick: true, requiresManualResolution: true },
  { type: "PAR_OR_BETTER", title: "Par o mejor", category: "result", scope: "hole", description: "Gana si el equipo hace par o mejor.", isQuick: true, requiresManualResolution: true },
  { type: "BIRDIE_OR_BETTER", title: "Birdie o mejor", category: "result", scope: "hole", description: "Gana si el equipo hace birdie o mejor.", isQuick: true, requiresManualResolution: true },
  { type: "NO_WORSE_THAN_BOGEY", title: "No peor que bogey", category: "result", scope: "hole", description: "Gana si el equipo no hace peor que bogey.", isQuick: false, requiresManualResolution: true },
  { type: "WIN_HOLE", title: "Ganar hoyo", category: "result", scope: "hole", description: "Gana si el equipo gana el hoyo contra los equipos seleccionados.", isQuick: true, requiresManualResolution: true },
  { type: "TIE_HOLE", title: "Empatar hoyo", category: "result", scope: "hole", description: "Gana si el equipo empata el hoyo contra los equipos seleccionados.", isQuick: false, requiresManualResolution: true },
  { type: "WIN_FRONT_9", title: "Ganar primeros 9", category: "segment", scope: "front_9", description: "Gana si el equipo gana los primeros 9 contra los equipos seleccionados.", isQuick: false, requiresManualResolution: true },
  { type: "TIE_FRONT_9", title: "Empatar primeros 9", category: "segment", scope: "front_9", description: "Gana si el equipo empata los primeros 9 contra los equipos seleccionados.", isQuick: false, requiresManualResolution: true },
  { type: "WIN_BACK_9", title: "Ganar segundos 9", category: "segment", scope: "back_9", description: "Gana si el equipo gana los segundos 9 contra los equipos seleccionados.", isQuick: false, requiresManualResolution: true },
  { type: "TIE_BACK_9", title: "Empatar segundos 9", category: "segment", scope: "back_9", description: "Gana si el equipo empata los segundos 9 contra los equipos seleccionados.", isQuick: false, requiresManualResolution: true },
  { type: "WIN_18", title: "Ganar los 18", category: "segment", scope: "round", description: "Gana si el equipo gana la ronda completa contra los equipos seleccionados.", isQuick: false, requiresManualResolution: true },
  { type: "TIE_18", title: "Empatar los 18", category: "segment", scope: "round", description: "Gana si el equipo empata la ronda completa contra los equipos seleccionados.", isQuick: false, requiresManualResolution: true },
  { type: "REACH_PAR_5_IN_TWO", title: "Llegada de dos en par 5", category: "precision", scope: "hole", description: "Gana si el equipo alcanza green en dos golpes en un par 5.", isQuick: false, requiresManualResolution: true },
  { type: "REACH_PAR_4_IN_ONE", title: "Llegada de uno en par 4", category: "precision", scope: "hole", description: "Gana si el equipo alcanza green de salida en un par 4.", isQuick: false, requiresManualResolution: true },
  { type: "FIRST_OUT_OF_BOUNDS", title: "Primer fuera de límites", category: "event", scope: "event", description: "Apuesta abierta sobre el primer equipo que manda una bola fuera de límites.", isQuick: true, requiresManualResolution: true },
  { type: "FIRST_WATER", title: "Primer agua", category: "event", scope: "event", description: "Apuesta abierta sobre el primer equipo que manda una bola al agua.", isQuick: true, requiresManualResolution: true },
  { type: "FIRST_BIRDIE", title: "Primer birdie", category: "event", scope: "event", description: "Gana el primer equipo que consigue birdie.", isQuick: false, requiresManualResolution: true },
  { type: "MOST_BIRDIES_ROUND", title: "Más birdies", category: "round", scope: "round", description: "Gana el equipo con más birdies al final de la ronda.", isQuick: false, requiresManualResolution: true },
  { type: "MOST_PARS_ROUND", title: "Más pares", category: "round", scope: "round", description: "Gana el equipo con más pares al final de la ronda.", isQuick: false, requiresManualResolution: true },
  { type: "MOST_FAIRWAYS_ROUND", title: "Más calles", category: "round", scope: "round", description: "Gana el equipo con más calles cogidas al final de la ronda.", isQuick: false, requiresManualResolution: true },
  { type: "FEWEST_LOST_BALLS", title: "Menos bolas perdidas", category: "round", scope: "round", description: "Gana el equipo con menos bolas perdidas al final de la ronda.", isQuick: false, requiresManualResolution: true },
  { type: "DOES_NOT_PASS_RED_TEES", title: "No pasa rojas", category: "penalty", scope: "hole", description: "Apuesta castigo si un equipo no supera una referencia mínima desde el tee.", isQuick: false, requiresManualResolution: true },
  { type: "HIT_OUT_OF_BOUNDS", title: "La tira fuera", category: "penalty", scope: "hole", description: "Apuesta directa a que un equipo manda la bola fuera de límites.", isQuick: false, requiresManualResolution: true },
  { type: "CUSTOM_BET", title: "Apuesta libre", category: "custom", scope: "custom", description: "Apuesta personalizada con título, condición, importe y equipos implicados.", isQuick: true, requiresManualResolution: true },
];

export const QUICK_SIDE_BET_PRESETS = SIDE_BET_PRESETS.filter((preset) => preset.isQuick);

export function getSideBetPresetsByCategory(category: Exclude<SideBetCategory, "quick"> | "quick") {
  if (category === "quick") return QUICK_SIDE_BET_PRESETS;
  return SIDE_BET_PRESETS.filter((preset) => preset.category === category);
}

export function getSideBetPreset(type: SideBetType) {
  return SIDE_BET_PRESETS.find((preset) => preset.type === type);
}
