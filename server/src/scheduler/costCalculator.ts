import { CONFIG } from '../config';

export function calculateCost(playerCount: number): { totalCost: number; costPerPerson: number; isSingles: boolean } {
  if (playerCount <= 1) {
    return { totalCost: 0, costPerPerson: 0, isSingles: false };
  }

  if (playerCount <= 3) {
    // Singles: 2-3 players
    const totalCost = CONFIG.COSTS.SINGLES_TOTAL;
    return {
      totalCost,
      costPerPerson: Math.round((totalCost / playerCount) * 100) / 100,
      isSingles: true,
    };
  }

  // Doubles: 4+ players
  const totalCost = CONFIG.COSTS.DOUBLES_TOTAL;
  return {
    totalCost,
    costPerPerson: Math.round((totalCost / playerCount) * 100) / 100,
    isSingles: false,
  };
}
