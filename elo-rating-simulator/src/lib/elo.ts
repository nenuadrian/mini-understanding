export interface Player {
  id: string;
  name: string;
  rating: number;
  history: number[];
  matches: number;
}

export interface MatchResult {
  playerAId: string;
  playerBId: string;
  scoreA: number; // 1, 0.5, 0
  scoreB: number; // 0, 0.5, 1
  changeA: number;
  changeB: number;
  timestamp: number;
}

export const K_FACTOR = 32;

export function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function calculateRatingChange(rating: number, expectedScore: number, actualScore: number, kFactor: number = K_FACTOR): number {
  return Math.round(kFactor * (actualScore - expectedScore));
}
