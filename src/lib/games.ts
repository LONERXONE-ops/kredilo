import { apiRequest } from './auth';

export type GamesStatus = { day: string; caps: Record<string, number>; claimed: Record<string, number> };

export const getGamesStatus = () => apiRequest<GamesStatus>('/api/games/status');
export const claimGame = (game: string, score: number) =>
  apiRequest<{ already: boolean; kreds: number; cap: number }>('/api/games/claim', { game, score });
